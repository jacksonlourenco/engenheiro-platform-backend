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
  setStatus("", "info");
}

function setStatus(message, tone) {
  statusEl.textContent = message || "";
  statusEl.classList.remove("success", "error", "info");
  if (tone) {
    statusEl.classList.add(tone);
  }
}

function setActiveTab(tab, options) {
  const preserveStatus = Boolean(options && options.preserveStatus);
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tab);
  });

  registerForm.classList.toggle("hidden", tab !== "register");
  loginForm.classList.toggle("hidden", tab !== "login");
  resetForm.classList.toggle("hidden", tab !== "reset");
  document.getElementById("auth-title").textContent =
    tab === "register" ? "Criar conta" : tab === "login" ? "Entrar" : "Reset de senha";
  if (!preserveStatus) {
    setStatus("", "info");
  }
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
    setStatus("Email invalido.", "error");
    return;
  }

  if (!cpfRegex.test(cpf)) {
    setStatus("CPF deve conter 11 numeros.", "error");
    return;
  }

  if (!phoneRegex.test(phone)) {
    setStatus("Telefone deve conter DDD + 9 numeros.", "error");
    return;
  }

  if (name.split(/\s+/).length < 2) {
    setStatus("Informe nome completo.", "error");
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
    let error = null;
    try {
      error = await response.json();
    } catch {
      // ignore
    }
    setStatus((error && error.message) || "Erro ao cadastrar.", "error");
    return;
  }

  // UX: show success message, switch to login and prefill the email.
  registerForm.reset();
  setActiveTab("login", { preserveStatus: true });
  if (loginForm.identifier) {
    loginForm.identifier.value = email;
    loginForm.identifier.focus();
  }
  setStatus("Cadastro realizado com sucesso. Agora faca login para continuar.", "success");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = Object.fromEntries(formData.entries());

  const identifier = String(payload.identifier || "").trim().toLowerCase();

  if (!identifier) {
    setStatus("Email ou CPF invalido.", "error");
    return;
  }

  if (!identifier.includes("@") && !cpfRegex.test(identifier)) {
    setStatus("CPF deve conter 11 numeros.", "error");
    return;
  }

  payload.identifier = identifier;

  const response = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    setStatus(data.message || "Erro ao entrar.", "error");
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
    setStatus("Email invalido.", "error");
    return;
  }

  const response = await fetch("/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => ({}));
  setStatus(data.message || "Se o email existir, enviaremos o link.", "success");
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

const defaultLandingContent = {
  hero: {
    eyebrow: "Projetos precisos. Resultados solidos.",
    title: "Engenharia que transforma decisoes em seguranca e valor.",
    lead:
      "Da vistoria tecnica ao acompanhamento de obra, criamos solucoes objetivas para quem precisa de precisao, agilidade e confianca.",
    imageUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    ctaRegisterText: "Quero me cadastrar",
    ctaLoginText: "Ja tenho conta",
  },
  about: {
    intro: "Conheca o engenheiro e a abordagem tecnica aplicada a cada projeto.",
    cards: [
      {
        title: "Experiencia solida",
        text: "Mais de 10 anos entregando projetos estruturais com foco em seguranca e viabilidade.",
      },
      {
        title: "Obras acompanhadas",
        text: "Gestao tecnica rigorosa, reduzindo retrabalho e custos inesperados.",
      },
      {
        title: "Atuacao consultiva",
        text: "Diagnosticos objetivos para tomada de decisao rapida e segura.",
      },
    ],
  },
  services: {
    intro: "Servicos essenciais para obras, reformas e regularizacoes.",
    backgroundImageUrl: "",
    backgroundOpacity: 0.25,
    cards: [
      { title: "Laudos tecnicos", text: "Relatorios completos com analises estruturais, patologias e recomendacoes." },
      { title: "Projetos estruturais", text: "Dimensionamento e detalhamento para obras residenciais e comerciais." },
      { title: "Consultoria e pericias", text: "Avaliacoes tecnicas para regularizacao, compra ou venda de imoveis." },
    ],
  },
  blog: {
    intro: "Conteudos em video sobre engenharia, seguranca e boas praticas.",
    videos: [
      "https://www.youtube.com/embed/2eTz9B5W3dA",
      "https://www.youtube.com/embed/x_0rF2gW0aM",
      "https://www.youtube.com/embed/4yN0m6rSdxQ",
    ],
  },
  contacts: {
    email: "contato@engenheiroplatform.com",
    phone: "(11) 99999-9999",
    address: "Rua Exemplo, 123 - Sao Paulo, SP",
    hours: "Atendimento: Seg a Sex, 8h - 18h",
  },
};

function applyLandingContent(content) {
  if (!content) return;

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

async function loadLandingContent() {
  try {
    const response = await fetch("/admin/landing");
    if (!response.ok) {
      applyLandingContent(defaultLandingContent);
      return;
    }

    const content = await response.json();
    applyLandingContent(content);
  } catch (_err) {
    applyLandingContent(defaultLandingContent);
  }
}

function initServicesCarousel() {
  const carousel = document.querySelector("[data-carousel='services']");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const cards = Array.from(track.children);
  if (!cards.length) return;

  // On mobile we rely on native swipe/trackpad scrolling (no arrows, no forced centering).
  if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
    cards.forEach((card) => card.classList.remove("active"));
    return;
  }

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

  // Mobile uses native swipe/trackpad scroll with scroll-snap; hide arrows via CSS.
  if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
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
