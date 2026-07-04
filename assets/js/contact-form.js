const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setError(form, field, message) {
  const el = form.querySelector(`[data-error-for="${field}"]`);
  if (!el) return;
  if (message) {
    el.textContent = message;
    el.classList.remove("hidden");
  } else {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function validate(form) {
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();
  let valid = true;

  if (!name) {
    setError(form, "name", "Please enter your name.");
    valid = false;
  } else {
    setError(form, "name", "");
  }

  if (!email || !EMAIL_RE.test(email)) {
    setError(form, "email", "Please enter a valid email address.");
    valid = false;
  } else {
    setError(form, "email", "");
  }

  if (!message) {
    setError(form, "message", "Please enter a message.");
    valid = false;
  } else {
    setError(form, "message", "");
  }

  return valid;
}

export function initContactForm(formEndpoint) {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;

  const submitButton = form.querySelector("[data-submit-button]");
  const status = form.querySelector("[data-form-status]");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    status.textContent = "";

    if (!validate(form)) {
      status.textContent = "Please fix the highlighted fields.";
      return;
    }

    if (!formEndpoint || formEndpoint.includes("YOUR_FORM_ID")) {
      status.textContent = "Contact form isn't configured yet — please email me directly using the link on this page.";
      return;
    }

    submitButton.disabled = true;
    status.textContent = "Sending…";

    try {
      const res = await fetch(formEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form),
      });

      if (res.ok) {
        status.textContent = "Thanks — your message is in! I'll get back to you soon.";
        form.reset();
      } else {
        status.textContent = "Something went wrong sending that. Please try emailing me directly instead.";
      }
    } catch (err) {
      console.error("Contact form submission failed:", err);
      status.textContent = "Something went wrong sending that. Please try emailing me directly instead.";
    } finally {
      submitButton.disabled = false;
    }
  });
}
