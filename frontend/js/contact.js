document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  const success = document.getElementById("contact-success");

  if (!form || !success) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    AppStorage.saveFeedback({
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      organization: String(formData.get("organization") || "").trim(),
      message: String(formData.get("message") || "").trim(),
    });

    success.hidden = false;
    form.reset();
    showToast("Message saved locally. Connect this form to your backend or database when ready.", "success");
  });
});
