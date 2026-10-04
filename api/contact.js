const crypto = require("crypto");

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;
const COOLDOWN_SECONDS = 24 * 60 * 60;
const IP_LIMIT = 8;
const IP_WINDOW_SECONDS = 60 * 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const GENERIC_ERROR =
  "Sorry, your message could not be sent. Please try again or email me directly at christinemae.oro123@gmail.com.";

const DUPLICATE_MESSAGE =
  "You’ve already submitted a message. Please wait 24 hours before submitting another message.";

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }

  return (req.socket && req.socket.remoteAddress) || "unknown";
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  if (typeof req.body === "string" && req.body.trim()) {
    return JSON.parse(req.body);
  }

  return {};
}

async function redisCommand(parts) {
  const baseUrl = (process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("missing_redis_config");
  }

  const path = parts
    .map(function (part) {
      return encodeURIComponent(String(part));
    })
    .join("/");

  const response = await fetch(baseUrl + "/" + path, {
    headers: {
      Authorization: "Bearer " + token
    }
  });

  if (!response.ok) {
    throw new Error("redis_error");
  }

  return response.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, {
      ok: false,
      error: "method_not_allowed",
      message: GENERIC_ERROR
    });
  }

  let body;

  try {
    body = parseBody(req);
  } catch (error) {
    return sendJson(res, 400, {
      ok: false,
      error: "invalid_json",
      message: GENERIC_ERROR
    });
  }

  if (body.website) {
    return sendJson(res, 200, { ok: true });
  }

  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const message = String(body.message || "").trim();

  if (!name || !email || !message) {
    return sendJson(res, 400, {
      ok: false,
      error: "validation_error",
      message: "Please complete all fields before sending your message."
    });
  }

  if (
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return sendJson(res, 400, {
      ok: false,
      error: "validation_error",
      message: GENERIC_ERROR
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return sendJson(res, 400, {
      ok: false,
      error: "validation_error",
      message: "Please enter a valid email address."
    });
  }

  const accessKey = process.env.WEB3FORMS_ACCESS_KEY;

  if (!accessKey) {
    return sendJson(res, 500, {
      ok: false,
      error: "missing_config",
      message: GENERIC_ERROR
    });
  }

  const emailKey = "contact:email:" + hashValue(email);
  const ipKey = "contact:ip:" + hashValue(getClientIp(req));

  let emailLockCreated = false;

  try {
    const ipCount = await redisCommand(["INCR", ipKey]);

    if (ipCount.result === 1) {
      await redisCommand(["EXPIRE", ipKey, IP_WINDOW_SECONDS]);
    }

    if (ipCount.result > IP_LIMIT) {
      return sendJson(res, 429, {
        ok: false,
        error: "rate_limited",
        message: GENERIC_ERROR
      });
    }

    const emailLock = await redisCommand([
      "SET",
      emailKey,
      "1",
      "NX",
      "EX",
      COOLDOWN_SECONDS
    ]);

    if (emailLock.result !== "OK") {
      return sendJson(res, 429, {
        ok: false,
        error: "duplicate_email",
        message: DUPLICATE_MESSAGE
      });
    }

    emailLockCreated = true;

    const mailResponse = await fetch(
      "https://api.web3forms.com/submit",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          access_key: accessKey,
          subject: "Portfolio inquiry from " + name,
          from_name: "Portfolio Contact Form",
          name: name,
          email: email,
          message: message,
          replyto: email
        })
      }
    );

    const mailData = await mailResponse.json().catch(function () {
      return {};
    });

    if (!mailResponse.ok || !mailData.success) {
      throw new Error("mail_error");
    }

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    if (emailLockCreated) {
      try {
        await redisCommand(["DEL", emailKey]);
      } catch (cleanupError) {
        // Keep the original error response if cleanup fails.
      }
    }

    return sendJson(res, 500, {
      ok: false,
      error: "server_error",
      message: GENERIC_ERROR
    });
  }
};
