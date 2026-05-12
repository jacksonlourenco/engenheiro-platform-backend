const modal = document.getElementById("auth-modal");
const openAuth = document.getElementById("open-auth");
const openLogin = document.getElementById("open-login");
const ctaRegister = document.getElementById("cta-register");
const ctaLogin = document.getElementById("cta-login");
const registerForm = document.getElementById("register-form");
const loginForm = document.getElementById("login-form");
const resetForm = document.getElementById("reset-form");
const statusEl = document.getElementById("auth-status");
const tabButtons = document.querySelectorAll(".tab");
const forgotPasswordButton = document.getElementById("forgot-password");

const cpfRegex = /^\d{11}$/;
const phoneRegex = /^\d{11}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function openModal(tab) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  setActiveTab(tab);
}

function closeModal() {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");
  statusEl.textContent = "";
}

function setActiveTab(tab) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  registerForm.classList.toggle("hidden", tab !== "register");
  loginForm.classList.toggle("hidden", tab !== "login");
  resetForm.classList.toggle("hidden", tab !== "reset");
  document.getElementById("auth-title").textContent =
    tab === "register" ? "Criar conta" : tab === "login" ? "Entrar" : "Reset de senha";
  statusEl.textContent = "";
}

openAuth.addEventListener("click", () => openModal("register"));
if (openLogin) {
  openLogin.addEventListener("click", () => openModal("login"));
}
ctaRegister.addEventListener("click", () => openModal("register"));
ctaLogin.addEventListener("click", () => openModal("login"));
forgotPasswordButton.addEventListener("click", () => setActiveTab("reset"));

const siteHeader = document.getElementById("site-header");
const mobileMenuButton = document.getElementById("mobile-menu");
const siteNav = document.getElementById("site-nav");

function closeMobileMenu() {
  if (!siteHeader || !mobileMenuButton) return;
  siteHeader.classList.remove("nav-open");
  mobileMenuButton.setAttribute("aria-expanded", "false");
}

if (siteHeader && mobileMenuButton) {
  mobileMenuButton.addEventListener("click", () => {
    const isOpen = siteHeader.classList.toggle("nav-open");
    mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

if (siteNav) {
  siteNav.addEventListener("click", (event) => {
    const target = event.target;
    if (target && target.matches("a")) {
      closeMobileMenu();
    }
  });
}

window.addEventListener("resize", () => {
  if (window.innerWidth > 600) {
    closeMobileMenu();
  }
});

modal.addEventListener("click", (event) => {
  const target = event.target;
  if (target && target.closest && target.closest("[data-close]")) {
    closeModal();
  }
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tab));
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = Object.fromEntries(formData.entries());

  const email = String(payload.email || "").trim().toLowerCase();
  const cpf = String(payload.cpf || "").trim();
  const phone = String(payload.phone || "").trim();
  const name = String(payload.name || "").trim();

  if (!emailRegex.test(email)) {
    statusEl.textContent = "Email invalido.";
    return;
  }

  if (!cpfRegex.test(cpf)) {
    statusEl.textContent = "CPF deve conter 11 numeros.";
    return;
  }

  if (!phoneRegex.test(phone)) {
    statusEl.textContent = "Telefone deve conter DDD + 9 numeros.";
    return;
  }

  if (name.split(/\s+/).length < 2) {
    statusEl.textContent = "Informe nome completo.";
    return;
  }

  payload.email = email;
  payload.cpf = cpf;
  payload.phone = phone;
  payload.name = name;

  const response = await fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    statusEl.textContent = error.message || "Erro ao cadastrar.";
    return;
  }

  statusEl.textContent = "Cadastro realizado. Voce ja pode fazer login.";
  setActiveTab("login");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  const identifier = String(payload.identifier || "").trim().toLowerCase();

  if (!identifier) {
    statusEl.textContent = "Email ou CPF invalido.";
    return;
  }

  if (!identifier.includes("@") && !cpfRegex.test(identifier)) {
    statusEl.textContent = "CPF deve conter 11 numeros.";
    return;
  }

  payload.identifier = identifier;

  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    statusEl.textContent = data.message || "Erro ao entrar.";
    return;
  }

  localStorage.setItem("auth_token", data.token);
  if (data.role === "admin") {
    window.location.href = "/admin";
    return;
  }
  window.location.href = "/dashboard";
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(resetForm);
  const payload = Object.fromEntries(formData.entries());

  const email = String(payload.email || "").trim().toLowerCase();

  if (!emailRegex.test(email)) {
    statusEl.textContent = "Email invalido.";
    return;
  }

  const response = await fetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();

  statusEl.textContent = data.message || "Se o email existir, enviaremos o link.";
});

const digitOnlyInputs = document.querySelectorAll("input[inputmode='numeric']");

digitOnlyInputs.forEach((input) => {
  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "");
  });
});

function normalizeYoutubeUrl(url) {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.includes("youtube.com/embed/")) {
    return trimmed;
  }
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) {
    return `https://www.youtube.com/embed/${watchMatch[1]}`;
  }
  const shortMatch = trimmed.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) {
    return `https://www.youtube.com/embed/${shortMatch[1]}`;
  }
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([^?]+)/);
  if (shortsMatch) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}`;
  }
  return trimmed;
}

async function loadLandingContent() {
  const response = await fetch("/admin/landing");
  if (!response.ok) {
    return;
  }

  const content = await response.json();

  document.getElementById("hero-eyebrow").textContent = content.hero.eyebrow;
  document.getElementById("hero-title").textContent = content.hero.title;
  document.getElementById("hero-lead").textContent = content.hero.lead;
  document.getElementById("cta-register").textContent = content.hero.ctaRegisterText;
  document.getElementById("cta-login").textContent = content.hero.ctaLoginText;

  const heroImage = document.getElementById("hero-image");
  heroImage.style.backgroundImage = `linear-gradient(135deg, rgba(244, 185, 66, 0.35), rgba(28, 34, 48, 0.95)), url('${content.hero.imageUrl}')`;

  document.getElementById("about-intro").textContent = content.about.intro;
  document.getElementById("services-intro").textContent = content.services.intro;
  document.getElementById("blog-intro").textContent = content.blog.intro;

  const servicesSection = document.getElementById("services");
  if (content.services.backgroundImageUrl) {
    servicesSection.style.setProperty("--services-bg", `url('${content.services.backgroundImageUrl}')`);
    servicesSection.style.setProperty("--services-bg-opacity", String(content.services.backgroundOpacity ?? 0.25));
  } else {
    servicesSection.style.setProperty("--services-bg", "none");
    servicesSection.style.setProperty("--services-bg-opacity", "0");
  }

  const aboutCards = document.getElementById("about-cards");
  aboutCards.innerHTML = "";
  content.about.cards.forEach((card) => {
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `<h3>${card.title}</h3><p>${card.text}</p>`;
    aboutCards.appendChild(el);
  });

  const servicesCards = document.getElementById("services-cards");
  servicesCards.innerHTML = "";
  content.services.cards.forEach((card) => {
    const el = document.createElement("article");
    el.className = "card";
    const imageHtml = card.imageUrl
      ? `<img src="${card.imageUrl}" alt="${card.title || "Service"}" class="card-image" />`
      : "";
    el.innerHTML = `${imageHtml}<h3>${card.title}</h3><p>${card.text}</p>`;
    servicesCards.appendChild(el);
  });

  const blogVideos = document.getElementById("blog-videos");
  blogVideos.innerHTML = "";
  content.blog.videos.forEach((url) => {
    const iframe = document.createElement("iframe");
    iframe.src = normalizeYoutubeUrl(url);
    iframe.title = "Video";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    blogVideos.appendChild(iframe);
  });

  document.getElementById("contact-email").textContent = content.contacts.email;
  document.getElementById("contact-phone").textContent = content.contacts.phone;
  document.getElementById("contact-address").textContent = content.contacts.address;
  document.getElementById("contact-hours").textContent = content.contacts.hours;

  initServicesCarousel();
}

function initServicesCarousel() {
  const carousel = document.querySelector("[data-carousel='services']");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const cards = Array.from(track.children);
  if (!cards.length) return;

  let activeIndex = Math.min(1, cards.length - 1);
  const focusCard = (index) => {
    activeIndex = index;
    cards.forEach((card, idx) => {
      card.classList.toggle("active", idx === activeIndex);
    });

    const card = cards[activeIndex];
    const offset = card.offsetLeft - (track.clientWidth - card.clientWidth) / 2;
    track.scrollTo({ left: Math.max(0, offset), behavior: "smooth" });
  };

  const prev = carousel.querySelector("[data-prev]");
  const next = carousel.querySelector("[data-next]");

  prev.addEventListener("click", () => {
    const nextIndex = (activeIndex - 1 + cards.length) % cards.length;
    focusCard(nextIndex);
  });

  next.addEventListener("click", () => {
    const nextIndex = (activeIndex + 1) % cards.length;
    focusCard(nextIndex);
  });

  focusCard(activeIndex);

  window.addEventListener("resize", () => {
    focusCard(activeIndex);
  });
}

loadLandingContent();

const carousels = document.querySelectorAll("[data-carousel]");

carousels.forEach((carousel) => {
  if (carousel.dataset.carousel === "services") {
    return;
  }
  const track = carousel.querySelector(".carousel-track");
  const prev = carousel.querySelector("[data-prev]");
  const next = carousel.querySelector("[data-next]");

  prev.addEventListener("click", () => {
    track.scrollBy({ left: -260, behavior: "smooth" });
  });

  next.addEventListener("click", () => {
    track.scrollBy({ left: 260, behavior: "smooth" });
  });
});
