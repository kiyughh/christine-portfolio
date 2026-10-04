(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener("click", function () {
      const open = siteNav.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });

    siteNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        siteNav.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        navToggle.setAttribute("aria-label", "Open menu");
      });
    });
  }

  const resumeLink = document.querySelector(".btn-resume");
  if (resumeLink) {
    resumeLink.addEventListener("click", function (event) {
      event.preventDefault();
      const fileUrl = resumeLink.getAttribute("href");
      const fileName = resumeLink.getAttribute("download") || "resume.pdf";

      fetch(fileUrl)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("resume_fetch_failed");
          }
          return response.arrayBuffer();
        })
        .then(function (buffer) {
          const blob = new Blob([buffer], { type: "application/octet-stream" });
          const objectUrl = URL.createObjectURL(blob);
          const tempLink = document.createElement("a");
          tempLink.href = objectUrl;
          tempLink.download = fileName;
          document.body.appendChild(tempLink);
          tempLink.click();
          tempLink.remove();
          URL.revokeObjectURL(objectUrl);
        })
        .catch(function () {
          window.location.href = fileUrl;
        });
    });
  }

  const projectList = document.querySelector(".project-list");
  if (projectList) {
    Array.prototype.slice.call(projectList.querySelectorAll(".project-card"))
      .sort(function (a, b) {
        return Number(a.getAttribute("data-project-order")) - Number(b.getAttribute("data-project-order"));
      })
      .forEach(function (card) {
        projectList.appendChild(card);
      });
  }

  document.querySelectorAll(".filter-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      const filter = button.getAttribute("data-filter");

      document.querySelectorAll(".filter-btn").forEach(function (btn) {
        btn.classList.toggle("is-active", btn === button);
      });

      document.querySelectorAll(".project-card").forEach(function (card) {
        const categories = (card.getAttribute("data-categories") || "").split(" ");
        const show = filter === "all" || categories.indexOf(filter) !== -1;
        card.classList.toggle("is-hidden", !show);
      });
    });
  });

  const imageLightbox = document.getElementById("image-lightbox");
  const lightboxImage = imageLightbox ? imageLightbox.querySelector(".image-lightbox-image") : null;
  const lightboxClose = imageLightbox ? imageLightbox.querySelector(".image-lightbox-close") : null;
  const lightboxPrev = imageLightbox ? imageLightbox.querySelector(".image-lightbox-prev") : null;
  const lightboxNext = imageLightbox ? imageLightbox.querySelector(".image-lightbox-next") : null;
  const lightboxCounter = imageLightbox ? imageLightbox.querySelector(".image-lightbox-counter") : null;
  let lastFocusedImage = null;
  let lightboxImages = [];
  let lightboxIndex = 0;
  let lightboxCloseTimer;

  function showLightboxImage(index) {
    if (!lightboxImages.length || !lightboxImage) return;

    lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
    const image = lightboxImages[lightboxIndex];
    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    if (lightboxCounter) {
      lightboxCounter.textContent = (lightboxIndex + 1) + " / " + lightboxImages.length;
    }
  }

  function closeImageLightbox() {
    if (!imageLightbox || imageLightbox.hidden) return;

    imageLightbox.classList.remove("is-visible");
    window.clearTimeout(lightboxCloseTimer);
    lightboxCloseTimer = window.setTimeout(function () {
      imageLightbox.hidden = true;
      imageLightbox.setAttribute("aria-hidden", "true");
      if (lightboxImage) {
        lightboxImage.removeAttribute("src");
        lightboxImage.alt = "";
      }
      lightboxImages = [];
      if (lightboxPrev) lightboxPrev.hidden = true;
      if (lightboxNext) lightboxNext.hidden = true;
      if (lightboxCounter) lightboxCounter.hidden = true;
      if (lastFocusedImage) {
        lastFocusedImage.focus();
        lastFocusedImage = null;
      }
    }, 180);
  }

  function openImageLightbox(image) {
    if (!imageLightbox || !lightboxImage) return;

    window.clearTimeout(lightboxCloseTimer);
    lastFocusedImage = image;
    const carousel = image.closest("[data-carousel]");
    lightboxImages = carousel ? Array.prototype.slice.call(carousel.querySelectorAll(".carousel-slide img")) : [image];
    lightboxIndex = lightboxImages.indexOf(image);
    showLightboxImage(lightboxIndex);
    const hasMultipleImages = lightboxImages.length > 1;
    if (lightboxPrev) lightboxPrev.hidden = !hasMultipleImages;
    if (lightboxNext) lightboxNext.hidden = !hasMultipleImages;
    if (lightboxCounter) lightboxCounter.hidden = !hasMultipleImages;
    imageLightbox.hidden = false;
    imageLightbox.setAttribute("aria-hidden", "false");
    window.requestAnimationFrame(function () {
      imageLightbox.classList.add("is-visible");
    });
    if (lightboxClose) lightboxClose.focus();
  }

  if (imageLightbox) {
    imageLightbox.addEventListener("click", function (event) {
      if (event.target === imageLightbox) closeImageLightbox();
    });
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeImageLightbox);
  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", function () {
      showLightboxImage(lightboxIndex - 1);
    });
  }
  if (lightboxNext) {
    lightboxNext.addEventListener("click", function () {
      showLightboxImage(lightboxIndex + 1);
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && imageLightbox && !imageLightbox.hidden) {
      closeImageLightbox();
    } else if (imageLightbox && !imageLightbox.hidden && lightboxImages.length > 1 && event.key === "ArrowLeft") {
      showLightboxImage(lightboxIndex - 1);
    } else if (imageLightbox && !imageLightbox.hidden && lightboxImages.length > 1 && event.key === "ArrowRight") {
      showLightboxImage(lightboxIndex + 1);
    }
  });

  document.querySelectorAll(".carousel-slide img").forEach(function (image) {
    image.tabIndex = 0;
    image.setAttribute("role", "button");
    image.setAttribute("aria-haspopup", "dialog");
    image.setAttribute("aria-label", "View larger image: " + image.alt);
    image.addEventListener("click", function () {
      openImageLightbox(image);
    });
    image.addEventListener("keydown", function (event) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openImageLightbox(image);
      }
    });
  });

  function initCarousel(root) {
    const slides = Array.prototype.slice.call(root.querySelectorAll(".carousel-slide"));
    const prevBtn = root.querySelector(".carousel-prev");
    const nextBtn = root.querySelector(".carousel-next");
    const counter = root.querySelector(".carousel-counter");
    const dotsWrap = root.querySelector(".carousel-dots");
    const controls = root.querySelector(".carousel-controls");
    const viewport = root.querySelector(".carousel-viewport");
    const total = slides.length;
    let index = 0;
    let startX = 0;

    if (total === 0) {
      return;
    }

    if (total === 1 && controls) {
      controls.classList.add("is-hidden");
      slides[0].classList.add("is-active");
      return;
    }

    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      slides.forEach(function (_slide, i) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel-dot";
        dot.setAttribute("aria-label", "Go to image " + (i + 1));
        dot.addEventListener("click", function () {
          show(i);
        });
        dotsWrap.appendChild(dot);
      });
    }

    function show(nextIndex) {
      index = (nextIndex + total) % total;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === index);
      });
      if (counter) {
        counter.textContent = (index + 1) + " / " + total;
      }
      if (dotsWrap) {
        Array.prototype.forEach.call(dotsWrap.children, function (dot, i) {
          dot.classList.toggle("is-active", i === index);
        });
      }
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        show(index - 1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        show(index + 1);
      });
    }

    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      }
    });

    if (viewport) {
      viewport.addEventListener("touchstart", function (event) {
        startX = event.changedTouches[0].clientX;
      }, { passive: true });

      viewport.addEventListener("touchend", function (event) {
        const dx = event.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) {
          show(dx < 0 ? index + 1 : index - 1);
        }
      }, { passive: true });
    }

    show(0);
  }

  document.querySelectorAll("[data-carousel]").forEach(initCarousel);

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    const nameInput = document.getElementById("contact-name");
    const emailInput = document.getElementById("contact-email");
    const messageInput = document.getElementById("contact-message");
    const websiteInput = document.getElementById("contact-website");
    const submitBtn = document.getElementById("contact-submit");
    const status = document.getElementById("contact-form-status");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const maxMessageLength = 2000;
    const fallbackError = "Sorry, your message could not be sent. Please try again or email me directly at christinemae.oro123@gmail.com.";
    const duplicateMessage = "You’ve already submitted a message. Please wait 24 hours before submitting another message.";

    function setStatus(message, type) {
      if (!status) return;
      status.textContent = message;
      status.classList.remove("is-success", "is-error");
      if (type) status.classList.add(type);
    }

    function setInvalid(input, invalid) {
      if (!input) return;
      if (invalid) {
        input.setAttribute("aria-invalid", "true");
      } else {
        input.removeAttribute("aria-invalid");
      }
    }

    function setLoading(isLoading) {
      if (!submitBtn) return;
      submitBtn.disabled = isLoading;
      submitBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
      submitBtn.textContent = isLoading ? "Sending..." : "Send Message";
    }

    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (submitBtn && submitBtn.disabled) return;

      const name = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const message = messageInput ? messageInput.value.trim() : "";
      const website = websiteInput ? websiteInput.value.trim() : "";

      setInvalid(nameInput, !name);
      setInvalid(emailInput, !email || !emailPattern.test(email));
      setInvalid(messageInput, !message || message.length > maxMessageLength);

      if (!name || !email || !message) {
        setStatus("Please complete all fields before sending your message.", "is-error");
        return;
      }

      if (!emailPattern.test(email)) {
        setStatus("Please enter a valid email address.", "is-error");
        return;
      }

      if (message.length > maxMessageLength) {
        setStatus("Please keep your message under " + maxMessageLength + " characters.", "is-error");
        return;
      }

      setLoading(true);
      setStatus("", "");

      fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: name,
          email: email,
          message: message,
          website: website
        })
      })
        .then(function (response) {
          return response.json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              return { ok: response.ok, status: response.status, data: data };
            });
        })
        .then(function (result) {
          if (result.data && result.data.error === "duplicate_email") {
            setStatus(duplicateMessage, "is-error");
            return;
          }

          if (result.ok && result.data && result.data.ok) {
            setStatus("Message sent successfully! I'll get back to you as soon as possible.", "is-success");
            contactForm.reset();
            setInvalid(nameInput, false);
            setInvalid(emailInput, false);
            setInvalid(messageInput, false);
            return;
          }

          setStatus(fallbackError, "is-error");
        })
        .catch(function () {
          setStatus(fallbackError, "is-error");
        })
        .then(function () {
          setLoading(false);
        });
    });
  }
})();
