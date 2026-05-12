const token = localStorage.getItem("auth_token");
const logoutButton = document.getElementById("logout");
const form = document.getElementById("landing-form");
const messageEl = document.getElementById("admin-message");
const userSearchForm = document.getElementById("user-search-form");
const userList = document.getElementById("user-list");
const discountSearchForm = document.getElementById("discount-search-form");
const discountList = document.getElementById("discount-list");
const discountMessage = document.getElementById("discount-message");
const globalDiscountForm = document.getElementById("global-discount-form");
const globalDiscountMessage = document.getElementById("global-discount-message");
const clearGlobalDiscountButton = document.getElementById("clear-global-discount");
const budgetSearchForm = document.getElementById("budget-search-form");
const budgetList = document.getElementById("budget-list");
const budgetAdminMessage = document.getElementById("budget-admin-message");
const servicesCardsContainer = document.getElementById("services-cards");
const addServiceCardButton = document.getElementById("add-service-card");
const tabButtons = document.querySelectorAll("[data-tab]");
const views = document.querySelectorAll("[data-view]");
const budgetSettingsForm = document.getElementById("budget-settings-form");
const budgetSettingsMessage = document.getElementById("budget-settings-message");
const budgetSettingsEffective = document.getElementById("budget-settings-effective");
const areaFactorsTable = document.getElementById("area-factors-table");
const addAreaFactorButton = document.getElementById("add-area-factor");
const qProfileSelect = document.getElementById("q-profile");
const budgetQuestionsEditor = document.getElementById("budget-questions-editor");

let budgetSettingsState = {};
let budgetQuestionMeta = { leigo: null, tecnico: null };

if (!token) {
  window.location.href = "/";
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  window.location.href = "/";
});

function setActiveTab(tab) {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  views.forEach((view) => {
    view.classList.toggle("hidden", view.dataset.view !== tab);
  });
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setActiveTab(btn.dataset.tab);
    if (btn.dataset.tab === "budgets") {
      loadBudgets();
    }
    if (btn.dataset.tab === "discounts") {
      discountMessage.textContent = "";
      discountList.innerHTML = "";
      loadGlobalDiscount();
    }
    if (btn.dataset.tab === "budget-settings") {
      loadBudgetSettings();
    }
  });
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

    const checkbox = item.querySelector(".switch input");
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

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
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

function renderDiscountUsers(users) {
  discountList.innerHTML = "";
  discountMessage.textContent = "";

  if (!users.length) {
    discountList.textContent = "Nenhum usuario encontrado.";
    return;
  }

  users.forEach((user) => {
    const item = document.createElement("div");
    item.className = "discount-item";
    item.innerHTML = `
      <div class="discount-top">
        <div class="discount-contact">
          <strong>${user.name}</strong>
          <div>${user.email} <span class="muted">|</span> ${user.cpf || "-"}</div>
          <div class="muted">${user.phone || "-"}</div>
        </div>
        <div class="discount-controls">
          <label>
            Percentual (0 a 100)
            <input class="discount-input" type="number" min="0" max="100" step="0.5" value="${user.discount_percent ?? ""}" />
          </label>
          <div class="discount-dates">
            <label>
              Inicio
              <input class="discount-start" type="datetime-local" value="${toDateTimeLocal(user.discount_starts_at)}" />
            </label>
            <label>
              Fim
              <input class="discount-end" type="datetime-local" value="${toDateTimeLocal(user.discount_ends_at)}" />
            </label>
          </div>
          <div class="discount-actions">
            <button class="btn primary save-discount" type="button">Salvar</button>
            <button class="btn remove clear-discount" type="button">Remover</button>
            <span class="form-status discount-status"></span>
          </div>
          <p class="mini-help">
            Dica: se deixar Inicio/Fim em branco, o desconto vale sempre. Para desativar, use Remover.
          </p>
        </div>
      </div>
    `;

    const discountInput = item.querySelector(".discount-input");
    const discountStart = item.querySelector(".discount-start");
    const discountEnd = item.querySelector(".discount-end");
    const discountStatus = item.querySelector(".discount-status");
    const saveDiscount = item.querySelector(".save-discount");
    const clearDiscount = item.querySelector(".clear-discount");

    const save = async (payload) => {
      discountStatus.textContent = "";
      const response = await fetch(`/admin/users/${user.id}/discount`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        discountStatus.textContent = data.message || "Falha ao salvar desconto.";
        return false;
      }

      discountStatus.textContent = "Desconto salvo.";
      return true;
    };

    saveDiscount.addEventListener("click", async () => {
      const percentValue = discountInput.value === "" ? null : Number(discountInput.value);
      const payload = {
        percent: percentValue,
        startsAt: discountStart.value ? new Date(discountStart.value).toISOString() : null,
        endsAt: discountEnd.value ? new Date(discountEnd.value).toISOString() : null,
      };
      await save(payload);
    });

    clearDiscount.addEventListener("click", async () => {
      discountInput.value = "";
      discountStart.value = "";
      discountEnd.value = "";
      await save({ percent: null, startsAt: null, endsAt: null });
    });

    discountList.appendChild(item);
  });
}

async function loadDiscountUsers(query) {
  if (!discountList) return;
  discountMessage.textContent = "";
  discountList.textContent = "Carregando...";

  const response = await fetch(`/admin/users?query=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    discountList.textContent = "";
    discountMessage.textContent = "Falha ao buscar usuarios.";
    return;
  }

  const users = await response.json();
  renderDiscountUsers(users);
}

if (discountSearchForm) {
  discountSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = discountSearchForm.query.value.trim();
    if (!query) {
      discountMessage.textContent = "Informe email ou CPF.";
      return;
    }
    await loadDiscountUsers(query);
  });
}

async function fetchBudgetSettingsContent() {
  const response = await fetch("/admin/budget-settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return null;
  const data = await response.json();
  return data?.content || {};
}

function fillGlobalDiscountForm(globalDiscount) {
  if (!globalDiscountForm) return;
  globalDiscountForm.percent.value =
    globalDiscount && globalDiscount.percent !== undefined && globalDiscount.percent !== null
      ? String(globalDiscount.percent)
      : "";
  globalDiscountForm.startsAt.value = toDateTimeLocal(globalDiscount?.startsAt);
  globalDiscountForm.endsAt.value = toDateTimeLocal(globalDiscount?.endsAt);
}

async function loadGlobalDiscount() {
  if (!globalDiscountForm) return;
  if (globalDiscountMessage) globalDiscountMessage.textContent = "";

  const content = await fetchBudgetSettingsContent();
  if (!content) return;

  budgetSettingsState = content;
  fillGlobalDiscountForm(content.globalDiscount || null);
}

async function saveGlobalDiscount(payload) {
  const content = await fetchBudgetSettingsContent();
  if (!content) {
    if (globalDiscountMessage) globalDiscountMessage.textContent = "Falha ao carregar configuracao.";
    return false;
  }

  const next = { ...content, globalDiscount: payload };
  const response = await fetch("/admin/budget-settings", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(next),
  });

  if (!response.ok) {
    if (globalDiscountMessage) globalDiscountMessage.textContent = "Falha ao salvar desconto global.";
    return false;
  }

  budgetSettingsState = next;
  if (globalDiscountMessage) globalDiscountMessage.textContent = "Desconto global salvo.";
  return true;
}

if (globalDiscountForm) {
  globalDiscountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (globalDiscountMessage) globalDiscountMessage.textContent = "";

    const percentRaw = String(globalDiscountForm.percent.value || "").trim();
    const percent = percentRaw === "" ? null : Number(percentRaw);

    if (percent !== null && (!Number.isFinite(percent) || percent < 0 || percent > 100)) {
      if (globalDiscountMessage) globalDiscountMessage.textContent = "Percentual deve ser entre 0 e 100.";
      return;
    }

    const startsAt = globalDiscountForm.startsAt.value
      ? new Date(globalDiscountForm.startsAt.value).toISOString()
      : null;
    const endsAt = globalDiscountForm.endsAt.value
      ? new Date(globalDiscountForm.endsAt.value).toISOString()
      : null;

    await saveGlobalDiscount(percent === null ? null : { percent, startsAt, endsAt });
  });
}

if (clearGlobalDiscountButton) {
  clearGlobalDiscountButton.addEventListener("click", async () => {
    if (globalDiscountForm) {
      globalDiscountForm.percent.value = "";
      globalDiscountForm.startsAt.value = "";
      globalDiscountForm.endsAt.value = "";
    }
    await saveGlobalDiscount(null);
  });
}

function formatMoney(value) {
  if (typeof value !== "number") return "-";
  return `R$ ${value.toFixed(2)}`;
}

function formatBudgetId(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return String(id);
  return `BUD-${String(num).padStart(6, "0")}`;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function safeJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return String(value);
  }
}

function renderBudgets(items) {
  budgetList.innerHTML = "";
  budgetAdminMessage.textContent = "";

  if (!items.length) {
    budgetList.textContent = "Nenhum orcamento encontrado.";
    return;
  }

  items.forEach((item) => {
    const total = item?.result?.totalSuggested;
    const wrapper = document.createElement("details");
    wrapper.className = `pending-item ${item.accepted ? "" : "pending-declined"}`;

    const summary = document.createElement("summary");
    summary.textContent = `${formatBudgetId(item.id)} - ${formatMoney(total)} - ${item.user_cpf || "-"}`;

    const contact = document.createElement("div");
    contact.className = "user-item";
    const addressLine = [item.user_address, item.user_address_number ? `N ${item.user_address_number}` : ""]
      .map((v) => String(v || "").trim())
      .filter(Boolean)
      .join(" - ");
    contact.innerHTML = `
      <div>
        <strong>Contato</strong>
        <div>${item.user_name || "-"}</div>
        <div>${item.user_email || "-"} | ${item.user_cpf || "-"}</div>
        <div>${item.user_phone || "-"}</div>
        <div>${addressLine || "-"}</div>
        <div>Criado em: ${formatDate(item.created_at) || "-"}</div>
        <div>Status: ${item.accepted ? "Ativo" : "Recusado"}</div>
      </div>
    `;

    const answers = document.createElement("pre");
    answers.className = "code-block";
    answers.textContent = safeJson(item.answers || {});

    wrapper.appendChild(summary);
    wrapper.appendChild(contact);
    wrapper.appendChild(answers);
    budgetList.appendChild(wrapper);
  });
}

async function loadBudgets(query) {
  if (!budgetList) return;
  budgetAdminMessage.textContent = "";
  budgetList.textContent = "Carregando...";

  const qs = query ? `?query=${encodeURIComponent(query)}` : "";
  const response = await fetch(`/admin/budgets${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    budgetList.textContent = "";
    budgetAdminMessage.textContent = "Falha ao carregar orcamentos.";
    return;
  }

  const items = await response.json();
  renderBudgets(items);
}

if (budgetSearchForm) {
  budgetSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = budgetSearchForm.query.value.trim();
    await loadBudgets(query);
  });
}

loadAdmin();
loadLanding();
setActiveTab("landing");

async function loadBudgetSettings() {
  if (!budgetSettingsForm) return;
  budgetSettingsMessage.textContent = "";

  const response = await fetch("/admin/budget-settings", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    budgetSettingsMessage.textContent = "Falha ao carregar configuracao.";
    return;
  }

  const data = await response.json();
  const content = data.content || {};
  budgetSettingsState = content;
  if (budgetSettingsForm.content) {
    budgetSettingsForm.content.value = JSON.stringify(content, null, 2);
  }
  if (budgetSettingsEffective) {
    budgetSettingsEffective.textContent = JSON.stringify(data.effective || {}, null, 2);
  }

  fillBudgetCalcForm(data.effective || {});
  await loadBudgetQuestionMeta();
  renderBudgetQuestionsEditor(qProfileSelect?.value || "leigo");
}

if (budgetSettingsForm) {
  budgetSettingsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    budgetSettingsMessage.textContent = "";

    const parsed = buildBudgetSettingsPayload();

    const response = await fetch("/admin/budget-settings", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parsed),
    });

    if (!response.ok) {
      budgetSettingsMessage.textContent = "Falha ao salvar configuracao.";
      return;
    }

    const data = await response.json().catch(() => ({}));
    if (budgetSettingsEffective) {
      budgetSettingsEffective.textContent = JSON.stringify(data.effective || {}, null, 2);
    }
    if (budgetSettingsForm.content) {
      budgetSettingsForm.content.value = JSON.stringify(parsed, null, 2);
    }
    budgetSettingsMessage.textContent = "Configuracao salva.";
  });
}

if (qProfileSelect) {
  qProfileSelect.addEventListener("change", () => {
    renderBudgetQuestionsEditor(qProfileSelect.value);
  });
}

if (addAreaFactorButton) {
  addAreaFactorButton.addEventListener("click", () => {
    const current = readAreaFactorsFromDom();
    current.push({ min: 0, max: 0, estrutural: 1, complementares: 1 });
    renderAreaFactorsTable(current);
  });
}

function fillBudgetCalcForm(effective) {
  if (!budgetSettingsForm) return;
  const base = effective.basePrices || {};
  const factors = effective.factors || {};

  const set = (name, value) => {
    const el = budgetSettingsForm.querySelector(`[name='${name}']`);
    if (!el) return;
    el.value = value === undefined || value === null ? "" : String(value);
  };

  set("base_estrutural", base.estrutural);
  set("base_hidraulico", base.hidraulico);
  set("base_sanitario", base.sanitario);
  set("base_pluvial", base.pluvial);
  set("base_eletrico", base.eletrico);
  set("base_incendio", base.incendio);
  set("base_pacoteHSP", base.pacoteHSP);
  set("base_pacoteCompleto", base.pacoteCompleto);

  set("f_boilerEletrico", factors.boilerEletrico);
  set("f_pocoArtesiano", factors.pocoArtesiano);
  set("f_concessionariaPadraoEspecial", factors.concessionariaPadraoEspecial);
  set("f_fossaSeptica", factors.fossaSeptica);
  set("f_drenagemEspecifica", factors.drenagemEspecifica);
  set("f_banheira", factors.banheira);
  set("f_equipamentoEspecial", factors.equipamentoEspecial);
  set("f_gerador", factors.gerador);
  set("f_subestacao", factors.subestacao);
  set("f_normaCondominio", factors.normaCondominio);
  set("f_aquecimentoSolar", factors.aquecimentoSolar);
  set("f_spa", factors.spa);

  renderAreaFactorsTable(effective.areaFactors || []);
}

function renderAreaFactorsTable(rows) {
  if (!areaFactorsTable) return;
  areaFactorsTable.innerHTML = "";
  (rows || []).forEach((row, index) => {
    const el = document.createElement("div");
    el.className = "table-row";
    el.innerHTML = `
      <label>Min (m²)<input type="number" step="1" min="0" name="af_min_${index}" value="${row.min ?? ""}" /></label>
      <label>Max (m²)<input type="number" step="1" min="0" name="af_max_${index}" value="${row.max ?? ""}" /></label>
      <label>Fator estrutural<input type="number" step="0.001" min="0" name="af_e_${index}" value="${row.estrutural ?? ""}" /></label>
      <label>Fator complementares<input type="number" step="0.001" min="0" name="af_c_${index}" value="${row.complementares ?? ""}" /></label>
      <button class="btn remove" type="button" data-remove-af="${index}">Remover</button>
    `;

    el.querySelector("[data-remove-af]").addEventListener("click", () => {
      const next = readAreaFactorsFromDom();
      next.splice(index, 1);
      renderAreaFactorsTable(next);
    });

    areaFactorsTable.appendChild(el);
  });
}

function readAreaFactorsFromDom() {
  if (!areaFactorsTable) return [];
  const rows = [];
  const els = areaFactorsTable.querySelectorAll(".table-row");
  els.forEach((rowEl, index) => {
    const min = Number(rowEl.querySelector(`[name='af_min_${index}']`)?.value ?? 0);
    const max = Number(rowEl.querySelector(`[name='af_max_${index}']`)?.value ?? 0);
    const estrutural = Number(rowEl.querySelector(`[name='af_e_${index}']`)?.value ?? 1);
    const complementares = Number(rowEl.querySelector(`[name='af_c_${index}']`)?.value ?? 1);
    rows.push({ min, max, estrutural, complementares });
  });
  return rows;
}

async function loadBudgetQuestionMeta() {
  if (budgetQuestionMeta.leigo && budgetQuestionMeta.tecnico) return;
  try {
    const [leigo, tecnico] = await Promise.all([
      fetch("/budget/questions?profile=leigo", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/budget/questions?profile=tecnico", { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    if (leigo.ok) budgetQuestionMeta.leigo = await leigo.json();
    if (tecnico.ok) budgetQuestionMeta.tecnico = await tecnico.json();
  } catch (err) {
    // best-effort
  }
}

function renderBudgetQuestionsEditor(profile) {
  if (!budgetQuestionsEditor) return;
  budgetQuestionsEditor.innerHTML = "";

  const meta = profile === "tecnico" ? budgetQuestionMeta.tecnico : budgetQuestionMeta.leigo;
  if (!meta) {
    budgetQuestionsEditor.textContent = "Carregando perguntas...";
    return;
  }

  const overrides = (budgetSettingsState.questionOverrides || {})[profile] || {};

  const introCard = document.createElement("div");
  introCard.className = "question-item";
  introCard.innerHTML = `
    <strong>Pergunta inicial</strong>
    <label>Titulo<input type="text" name="q_intro_label" value="${overrides.intro?.label || ""}" placeholder="${meta.intro?.label || ""}" /></label>
    <label>Descricao (ajuda)<textarea name="q_intro_help" rows="2" placeholder="${meta.intro?.help || ""}">${overrides.intro?.help || ""}</textarea></label>
  `;
  budgetQuestionsEditor.appendChild(introCard);

  const renderGroup = (group, title) => {
    const head = document.createElement("h4");
    head.textContent = title;
    head.style.margin = "14px 0 10px";
    budgetQuestionsEditor.appendChild(head);

    (meta.questions[group] || []).forEach((q) => {
      const ov = overrides[group]?.[q.id] || {};
      const card = document.createElement("div");
      card.className = "question-item";
      card.innerHTML = `
        <strong>${q.id}</strong>
        <label>Titulo<input type="text" name="q_${group}_${q.id}_label" value="${ov.label || ""}" placeholder="${q.label || ""}" /></label>
        <label>Descricao (ajuda)<textarea name="q_${group}_${q.id}_help" rows="2" placeholder="${q.help || ""}">${ov.help || ""}</textarea></label>
      `;
      budgetQuestionsEditor.appendChild(card);
    });
  };

  renderGroup("structural", "Perguntas - Estrutural");
  renderGroup("complementary", "Perguntas - Complementares");
}

function readNumber(form, name) {
  const el = form.querySelector(`[name='${name}']`);
  if (!el) return undefined;
  const raw = String(el.value || "").trim();
  if (raw === "") return undefined;
  const num = Number(raw);
  return Number.isFinite(num) ? num : undefined;
}

function readText(form, name) {
  const el = form.querySelector(`[name='${name}']`);
  if (!el) return undefined;
  const value = String(el.value || "").trim();
  return value === "" ? undefined : value;
}

function buildBudgetSettingsPayload() {
  const form = budgetSettingsForm;
  if (!form) return {};

  const content = { ...(budgetSettingsState || {}) };

  content.calculation = {
    basePrices: {
      estrutural: readNumber(form, "base_estrutural"),
      hidraulico: readNumber(form, "base_hidraulico"),
      sanitario: readNumber(form, "base_sanitario"),
      pluvial: readNumber(form, "base_pluvial"),
      eletrico: readNumber(form, "base_eletrico"),
      incendio: readNumber(form, "base_incendio"),
      pacoteHSP: readNumber(form, "base_pacoteHSP"),
      pacoteCompleto: readNumber(form, "base_pacoteCompleto"),
    },
    factors: {
      boilerEletrico: readNumber(form, "f_boilerEletrico"),
      pocoArtesiano: readNumber(form, "f_pocoArtesiano"),
      concessionariaPadraoEspecial: readNumber(form, "f_concessionariaPadraoEspecial"),
      fossaSeptica: readNumber(form, "f_fossaSeptica"),
      drenagemEspecifica: readNumber(form, "f_drenagemEspecifica"),
      banheira: readNumber(form, "f_banheira"),
      equipamentoEspecial: readNumber(form, "f_equipamentoEspecial"),
      gerador: readNumber(form, "f_gerador"),
      subestacao: readNumber(form, "f_subestacao"),
      normaCondominio: readNumber(form, "f_normaCondominio"),
      aquecimentoSolar: readNumber(form, "f_aquecimentoSolar"),
      spa: readNumber(form, "f_spa"),
    },
    areaFactors: readAreaFactorsFromDom(),
  };

  // Remove undefined so backend can fallback to defaults cleanly.
  const prune = (obj) => {
    if (!obj || typeof obj !== "object") return obj;
    Object.keys(obj).forEach((key) => {
      const value = obj[key];
      if (value && typeof value === "object" && !Array.isArray(value)) {
        prune(value);
      }
      if (obj[key] === undefined) delete obj[key];
    });
    return obj;
  };

  prune(content.calculation.basePrices);
  prune(content.calculation.factors);

  const profile = qProfileSelect?.value || "leigo";
  const ensure = (root, key) => {
    if (!root[key] || typeof root[key] !== "object") root[key] = {};
    return root[key];
  };

  content.questionOverrides = content.questionOverrides || {};
  const profileOverrides = ensure(content.questionOverrides, profile);

  const introLabel = readText(form, "q_intro_label");
  const introHelp = form.querySelector("[name='q_intro_help']")?.value ?? "";
  profileOverrides.intro = profileOverrides.intro || {};
  if (introLabel !== undefined) profileOverrides.intro.label = introLabel;
  if (String(introHelp).trim() !== "") profileOverrides.intro.help = String(introHelp).trim();
  if (String(introHelp).trim() === "") delete profileOverrides.intro.help;
  if (!profileOverrides.intro.label && !profileOverrides.intro.help) delete profileOverrides.intro;

  const meta = profile === "tecnico" ? budgetQuestionMeta.tecnico : budgetQuestionMeta.leigo;
  const groups = ["structural", "complementary"];
  groups.forEach((group) => {
    profileOverrides[group] = profileOverrides[group] || {};
    (meta?.questions?.[group] || []).forEach((q) => {
      const label = readText(form, `q_${group}_${q.id}_label`);
      const helpEl = form.querySelector(`[name='q_${group}_${q.id}_help']`);
      const help = helpEl ? String(helpEl.value || "").trim() : "";
      const ov = {};
      if (label !== undefined) ov.label = label;
      if (help !== "") ov.help = help;
      if (Object.keys(ov).length) {
        profileOverrides[group][q.id] = { ...(profileOverrides[group][q.id] || {}), ...ov };
      } else if (profileOverrides[group][q.id]) {
        // Keep existing if user didn't change anything.
      }
    });

    // Clean empty objects.
    Object.keys(profileOverrides[group]).forEach((id) => {
      const ov = profileOverrides[group][id];
      if (!ov || (!ov.label && !ov.help && !ov.options)) {
        delete profileOverrides[group][id];
      }
    });
    if (!Object.keys(profileOverrides[group]).length) delete profileOverrides[group];
  });

  if (!Object.keys(profileOverrides).length) delete content.questionOverrides[profile];

  // Sync JSON textarea (advanced mode) with the guided form.
  if (form.content) {
    form.content.value = JSON.stringify(content, null, 2);
  }

  return content;
}
