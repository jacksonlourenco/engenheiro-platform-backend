const form = document.getElementById("reset-password-form");
const statusEl = document.getElementById("reset-status");

const params = new URLSearchParams(window.location.search);
const token = params.get("token");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");

  if (!token) {
    statusEl.textContent = "Token invalido.";
    return;
  }

  const response = await fetch("/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    statusEl.textContent = data.message || "Erro ao atualizar senha.";
    return;
  }

  statusEl.textContent = "Senha atualizada. Voce ja pode fazer login.";
});
