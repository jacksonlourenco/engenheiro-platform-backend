const token = localStorage.getItem("auth_token");
const logoutButton = document.getElementById("logout");
const form = document.getElementById("landing-form");
const messageEl = document.getElementById("admin-message");
const userSearchForm = document.getElementById("user-search-form");
const userList = document.getElementById("user-list");
const servicesCardsContainer = document.getElementById("services-cards");
const addServiceCardButton = document.getElementById("add-service-card");

if (!token) {
  window.location.href = "/";
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  window.location.href = "/";
});

async function loadAdmin() {
  const response = await fetch("/auth/admin/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
    return;
  }
}

function renderServiceCardInputs(cards) {
  servicesCardsContainer.innerHTML = "";
  cards.forEach((card, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "service-card-input";
    wrapper.innerHTML = `
      <label>
        Services - Card ${index + 1} titulo
        <input type="text" name="servicesTitle${index}" value="${card.title || ""}" />
      </label>
      <label>
        Services - Card ${index + 1} texto
        <textarea name="servicesText${index}" rows="2">${card.text || ""}</textarea>
      </label>
      <label>
        Services - Card ${index + 1} imagem (URL direta)
        <input type="text" name="servicesImage${index}" value="${card.imageUrl || ""}" />
      </label>
      <button class="btn remove" type="button" data-remove="${index}">Remover</button>
    `;

    wrapper.querySelector("[data-remove]").addEventListener("click", () => {
      cards.splice(index, 1);
      renderServiceCardInputs(cards);
    });

    servicesCardsContainer.appendChild(wrapper);
  });

  servicesCardsContainer.dataset.cards = JSON.stringify(cards);
}

function getServiceCardsFromDom() {
  const cards = [];
  const wrappers = servicesCardsContainer.querySelectorAll(".service-card-input");
  wrappers.forEach((wrapper, index) => {
    const title = wrapper.querySelector(`input[name='servicesTitle${index}']`).value;
    const text = wrapper.querySelector(`textarea[name='servicesText${index}']`).value;
    const imageUrl = wrapper.querySelector(`input[name='servicesImage${index}']`).value;
    cards.push({ title, text, imageUrl });
  });
  return cards;
}

function fillForm(content) {
  form.heroEyebrow.value = content.hero.eyebrow;
  form.heroTitle.value = content.hero.title;
  form.heroLead.value = content.hero.lead;
  form.heroImage.value = content.hero.imageUrl;
  form.ctaRegister.value = content.hero.ctaRegisterText;
  form.ctaLogin.value = content.hero.ctaLoginText;

  form.aboutIntro.value = content.about.intro;
  form.aboutTitle1.value = content.about.cards[0]?.title || "";
  form.aboutText1.value = content.about.cards[0]?.text || "";
  form.aboutTitle2.value = content.about.cards[1]?.title || "";
  form.aboutText2.value = content.about.cards[1]?.text || "";
  form.aboutTitle3.value = content.about.cards[2]?.title || "";
  form.aboutText3.value = content.about.cards[2]?.text || "";

  form.servicesIntro.value = content.services.intro;
  form.servicesBg.value = content.services.backgroundImageUrl || "";
  form.servicesBgOpacity.value = content.services.backgroundOpacity ?? 0.25;
  renderServiceCardInputs(content.services.cards || []);

  form.blogIntro.value = content.blog.intro;
  form.video1.value = content.blog.videos[0] || "";
  form.video2.value = content.blog.videos[1] || "";
  form.video3.value = content.blog.videos[2] || "";

  form.contactEmail.value = content.contacts.email;
  form.contactPhone.value = content.contacts.phone;
  form.contactAddress.value = content.contacts.address;
  form.contactHours.value = content.contacts.hours;
}

async function loadLanding() {
  const response = await fetch("/admin/landing");
  if (!response.ok) {
    return;
  }
  const content = await response.json();
  fillForm(content);
}

addServiceCardButton.addEventListener("click", () => {
  const current = getServiceCardsFromDom();
  current.push({ title: "", text: "" });
  renderServiceCardInputs(current);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  messageEl.textContent = "";

  const payload = {
    hero: {
      eyebrow: form.heroEyebrow.value,
      title: form.heroTitle.value,
      lead: form.heroLead.value,
      imageUrl: form.heroImage.value,
      ctaRegisterText: form.ctaRegister.value,
      ctaLoginText: form.ctaLogin.value,
    },
    about: {
      intro: form.aboutIntro.value,
      cards: [
        { title: form.aboutTitle1.value, text: form.aboutText1.value },
        { title: form.aboutTitle2.value, text: form.aboutText2.value },
        { title: form.aboutTitle3.value, text: form.aboutText3.value },
      ],
    },
    services: {
      intro: form.servicesIntro.value,
      backgroundImageUrl: form.servicesBg.value,
      backgroundOpacity: Number(form.servicesBgOpacity.value || 0.25),
      cards: getServiceCardsFromDom(),
    },
    blog: {
      intro: form.blogIntro.value,
      videos: [form.video1.value, form.video2.value, form.video3.value].filter(Boolean),
    },
    contacts: {
      email: form.contactEmail.value,
      phone: form.contactPhone.value,
      address: form.contactAddress.value,
      hours: form.contactHours.value,
    },
  };

  const response = await fetch("/admin/landing", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    messageEl.textContent = "Falha ao salvar.";
    return;
  }

  messageEl.textContent = "Alteracoes salvas.";
});

function renderUsers(users) {
  userList.innerHTML = "";
  if (!users.length) {
    userList.textContent = "Nenhum usuario encontrado.";
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "user-item";
    item.innerHTML = `
      <div>
        <strong>${user.name}</strong>
        <div>${user.email} | ${user.cpf || "-"}</div>
        <div>${user.phone || "-"}</div>
      </div>
      <label class="switch">
        <input type="checkbox" ${user.contract_active ? "checked" : ""} />
        <span>Contrato ativo</span>
      </label>
    `;

    const checkbox = item.querySelector("input");
    checkbox.addEventListener("change", async () => {
      await fetch(`/admin/users/${user.id}/contract`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: checkbox.checked }),
      });
    });

    userList.appendChild(item);
  });
}

userSearchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = userSearchForm.query.value.trim();

  const response = await fetch(`/admin/users?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    userList.textContent = "Falha ao buscar usuarios.";
    return;
  }

  const users = await response.json();
  renderUsers(users);
});

loadAdmin();
loadLanding();
