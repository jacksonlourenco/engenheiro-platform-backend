const token = localStorage.getItem("auth_token");
const logoutButton = document.getElementById("logout");
const form = document.getElementById("landing-form");
const messageEl = document.getElementById("admin-message");
const userSearchForm = document.getElementById("user-search-form");
const userList = document.getElementById("user-list");
const discountForm = document.getElementById("discount-form");
const discountMessage = document.getElementById("discount-message");
const activeDiscountsList = document.getElementById("active-discounts-list");
const refreshDiscountsButton = document.getElementById("refresh-discounts");
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
const timelineSearchForm = document.getElementById("timeline-search-form");
const timelineSearchMessage = document.getElementById("timeline-search-message");
const timelinePanel = document.getElementById("timeline-panel");
const timelineTitle = document.getElementById("timeline-title");
const timelineSubtitle = document.getElementById("timeline-subtitle");
const timelineContractSummary = document.getElementById("timeline-contract-summary");
const timelineForm = document.getElementById("timeline-form");
const timelineList = document.getElementById("timeline-list");
const timelineMessage = document.getElementById("timeline-message");
const timelineSave = document.getElementById("timeline-save");
const timelineCancel = document.getElementById("timeline-cancel");
const contractActivate = document.getElementById("contract-activate");
const contractDeactivate = document.getElementById("contract-deactivate");
const availabilityForm = document.getElementById("availability-form");
const availabilityMessage = document.getElementById("availability-message");
const availabilityList = document.getElementById("availability-list");
const meetingBookingsList = document.getElementById("meeting-bookings-list");
const blockRuleForm = document.getElementById("block-rule-form");
const blockRuleMessage = document.getElementById("block-rule-message");
const blockRuleList = document.getElementById("block-rule-list");
const blockSaturdayButton = document.getElementById("block-saturday");
const blockSundayButton = document.getElementById("block-sunday");
const holidayForm = document.getElementById("holiday-form");
const holidayMessage = document.getElementById("holiday-message");
const holidayList = document.getElementById("holiday-list");
const vacationForm = document.getElementById("vacation-form");
const vacationMessage = document.getElementById("vacation-message");
const vacationList = document.getElementById("vacation-list");
const workScheduleForm = document.getElementById("work-schedule-form");
const workScheduleMessage = document.getElementById("work-schedule-message");
const workScheduleList = document.getElementById("work-schedule-list");
const lunchForm = document.getElementById("lunch-form");
const lunchMessage = document.getElementById("lunch-message");
const lunchList = document.getElementById("lunch-list");
const exceptionForm = document.getElementById("exception-form");
const exceptionMessage = document.getElementById("exception-message");
const exceptionList = document.getElementById("exception-list");
const calendarForm = document.getElementById("calendar-form");
const calendarGrid = document.getElementById("calendar-grid");
const dayScheduleList = document.getElementById("day-schedule-list");

let budgetSettingsState = {};
let budgetQuestionMeta = { leigo: null, tecnico: null };
let selectedTimelineBudget = null;

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
      loadActiveDiscounts();
    }
    if (btn.dataset.tab === "budget-settings") {
      loadBudgetSettings();
    }
    if (btn.dataset.tab === "meetings") {
      loadMeetingAgenda();
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
      <p class="form-status">Contratos ativos sao gerenciados individualmente na aba Timeline pelo ID do orcamento.</p>
    `;

    userList.appendChild(item);
  });
}

function hideTimelinePanel() {
  if (timelinePanel) timelinePanel.classList.add("hidden");
  selectedTimelineBudget = null;
}

function resetTimelineForm() {
  if (!timelineForm) return;
  timelineForm.reset();
  getTimelineField("itemId").value = "";
  if (timelineSave) timelineSave.textContent = "Adicionar atividade";
}

function getTimelineField(name) {
  return timelineForm.querySelector(`[name='${name}']`);
}

function formatTimelineStatus(status) {
  const labels = {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluido",
  };
  return labels[status] || "Pendente";
}

function timelineStatusClass(status) {
  return `status-chip status-${status || "pendente"}`;
}

function toDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

async function loadTimelineForBudgetId(budgetId) {
  if (!timelinePanel || !timelineList) return;
  timelineSearchMessage.textContent = "";
  timelinePanel.classList.remove("hidden");
  timelineTitle.textContent = `Timeline do contrato #${budgetId}`;
  timelineSubtitle.textContent = "Carregando contrato...";
  timelineMessage.textContent = "";
  timelineList.textContent = "Carregando...";

  const response = await fetch(`/admin/budgets/${budgetId}/timeline`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    timelineList.textContent = "";
    timelineSearchMessage.textContent = data.message || "Falha ao carregar timeline.";
    return;
  }

  selectedTimelineBudget = data.budget;
  renderTimelineHeader(data.budget);
  renderTimelineItems(data.items || []);
}

function renderTimelineHeader(budget) {
  const total = budget?.result?.totalSuggested;
  timelineTitle.textContent = `Timeline do contrato #${budget.id}`;
  timelineSubtitle.textContent = budget.contract_active
    ? "Contrato ativo. Edite as etapas que o cliente visualizara no dashboard."
    : "Contrato inativo. Ative o contrato para iniciar/editar a timeline.";
  timelineContractSummary.innerHTML = `
    <div class="timeline-item">
      <div>
        <strong>${budget.user_name || "-"}</strong>
        <p>${budget.user_email || "-"} | CPF: ${budget.user_cpf || "-"}</p>
        <small>Telefone: ${budget.user_phone || "-"} | Valor: ${formatMoney(total)} | Orcamento aceito: ${budget.accepted ? "Sim" : "Nao"}</small>
      </div>
      <span class="${timelineStatusClass(budget.contract_active ? "concluido" : "pendente")}">
        ${budget.contract_active ? "Contrato ativo" : "Contrato inativo"}
      </span>
    </div>
  `;
  if (contractActivate) contractActivate.disabled = Boolean(budget.contract_active);
  if (contractDeactivate) contractDeactivate.disabled = !budget.contract_active;
  if (timelineForm) {
    timelineForm.querySelectorAll("input, textarea, select, button").forEach((field) => {
      if (field.id === "timeline-cancel") return;
      field.disabled = !budget.contract_active;
    });
  }
}

function renderTimelineItems(items) {
  timelineList.innerHTML = "";
  if (!items.length) {
    timelineList.textContent = "Nenhuma atividade cadastrada.";
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "timeline-item";
    row.innerHTML = `
      <div>
        <strong>${item.title}</strong>
        <p>${item.description || "Sem descricao."}</p>
        <small>Prazo: ${item.deadline ? new Date(item.deadline).toLocaleDateString("pt-BR") : "Nao definido"}</small>
      </div>
      <div class="timeline-actions">
        <span class="${timelineStatusClass(item.status)}">${formatTimelineStatus(item.status)}</span>
        <button class="btn ghost edit-timeline" type="button">Editar</button>
        <button class="btn remove delete-timeline" type="button">Remover</button>
      </div>
    `;

    row.querySelector(".edit-timeline").addEventListener("click", () => {
      getTimelineField("itemId").value = item.id;
      getTimelineField("title").value = item.title || "";
      getTimelineField("description").value = item.description || "";
      getTimelineField("deadline").value = toDateInput(item.deadline);
      getTimelineField("status").value = item.status || "pendente";
      if (timelineSave) timelineSave.textContent = "Salvar atividade";
      timelineMessage.textContent = "";
    });

    row.querySelector(".delete-timeline").addEventListener("click", async () => {
      const ok = window.confirm("Remover esta atividade da timeline?");
      if (!ok) return;
      const response = await fetch(`/admin/timeline/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        timelineMessage.textContent = "Falha ao remover atividade.";
        return;
      }
      await loadTimelineForBudgetId(selectedTimelineBudget.id);
    });

    timelineList.appendChild(row);
  });
}

if (timelineCancel) {
  timelineCancel.addEventListener("click", () => {
    resetTimelineForm();
    if (timelineMessage) timelineMessage.textContent = "";
  });
}

if (timelineForm) {
  timelineForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedTimelineBudget) return;

    timelineMessage.textContent = "";
    const itemId = getTimelineField("itemId").value;
    const payload = {
      title: getTimelineField("title").value,
      description: getTimelineField("description").value,
      deadline: getTimelineField("deadline").value || null,
      status: getTimelineField("status").value,
    };

    const response = await fetch(
      itemId ? `/admin/timeline/${itemId}` : `/admin/budgets/${selectedTimelineBudget.id}/timeline`,
      {
        method: itemId ? "PATCH" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      timelineMessage.textContent = data.message || "Falha ao salvar atividade.";
      return;
    }

    timelineMessage.textContent = "Atividade salva.";
    resetTimelineForm();
    await loadTimelineForBudgetId(selectedTimelineBudget.id);
  });
}

if (timelineSearchForm) {
  timelineSearchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const budgetId = Number(timelineSearchForm.budgetId.value);
    if (!Number.isInteger(budgetId) || budgetId <= 0) {
      timelineSearchMessage.textContent = "Informe um ID de contrato valido.";
      return;
    }
    await loadTimelineForBudgetId(budgetId);
  });
}

async function updateSelectedContract(active) {
  if (!selectedTimelineBudget) return;
  timelineMessage.textContent = "";
  const response = await fetch(`/admin/budgets/${selectedTimelineBudget.id}/contract`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ active }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    timelineMessage.textContent = data.message || "Falha ao atualizar contrato.";
    return;
  }

  timelineMessage.textContent = active ? "Contrato ativado." : "Contrato desativado.";
  await loadTimelineForBudgetId(selectedTimelineBudget.id);
}

if (contractActivate) {
  contractActivate.addEventListener("click", () => updateSelectedContract(true));
}

if (contractDeactivate) {
  contractDeactivate.addEventListener("click", () => updateSelectedContract(false));
}

function todayDateInput() {
  return new Date().toISOString().slice(0, 10);
}

function plusDaysDateInput(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDateOnlyBR(value) {
  if (!value) return "-";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  if (!year || !month || !day) return String(value);
  return `${day}/${month}/${year}`;
}

function formatDateTimeBR(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeTimeText(value) {
  return String(value || "").slice(0, 5);
}

async function loadAvailability() {
  if (!availabilityList) return;
  availabilityList.textContent = "Carregando...";
  const qs = `?from=${todayDateInput()}&to=${plusDaysDateInput(45)}`;
  const response = await fetch(`/meetings/admin/availability${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    availabilityList.textContent = "Falha ao carregar disponibilidade.";
    return;
  }

  const items = await response.json();
  availabilityList.innerHTML = "";
  if (!items.length) {
    availabilityList.textContent = "Nenhum periodo cadastrado.";
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "timeline-item";
    row.innerHTML = `
      <div>
        <strong>${formatDateOnlyBR(item.meeting_date)}</strong>
        <p>${normalizeTimeText(item.start_time)} ate ${normalizeTimeText(item.end_time)}</p>
        <small>Os clientes visualizam este periodo em blocos de 30 minutos.</small>
      </div>
      <div class="timeline-actions">
        <button class="btn remove" type="button">Remover / bloquear</button>
      </div>
    `;
    row.querySelector("button").addEventListener("click", async () => {
      const ok = window.confirm("Remover este periodo disponivel?");
      if (!ok) return;
      const deleteResponse = await fetch(`/meetings/admin/availability/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!deleteResponse.ok) {
        availabilityMessage.textContent = "Falha ao remover periodo.";
        return;
      }
      availabilityMessage.textContent = "Periodo removido.";
      await loadAvailability();
    });
    availabilityList.appendChild(row);
  });
}

async function loadMeetingBookings() {
  if (!meetingBookingsList) return;
  meetingBookingsList.textContent = "Carregando...";
  const response = await fetch("/meetings/admin/bookings", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    meetingBookingsList.textContent = "Falha ao carregar reunioes.";
    return;
  }

  const items = await response.json();
  meetingBookingsList.innerHTML = "";
  if (!items.length) {
    meetingBookingsList.textContent = "Nenhuma reuniao agendada.";
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "timeline-item";
    row.innerHTML = `
      <div>
        <strong>${formatDateTimeBR(item.starts_at)}</strong>
        <p>${item.user_name || "-"} | ${item.user_email || "-"} | CPF: ${item.user_cpf || "-"}</p>
        <small>Contrato: #${item.budget_id || "-"} | Telefone: ${item.user_phone || "-"} | Status: ${item.status || "-"}</small>
      </div>
      <span class="status-chip status-${item.status === "scheduled" ? "concluido" : "pendente"}">${item.status === "scheduled" ? "Agendada" : item.status}</span>
    `;
    meetingBookingsList.appendChild(row);
  });
}

async function loadMeetingAgenda() {
  await loadBlockRules();
  await loadAvailability();
  await loadMeetingBookings();
  await loadAdminCalendar();
}

if (availabilityForm) {
  availabilityForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    availabilityMessage.textContent = "";

    const payload = {
      date: availabilityForm.date.value,
      startTime: availabilityForm.startTime.value,
      endTime: availabilityForm.endTime.value,
    };

    const response = await fetch("/meetings/admin/availability", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      availabilityMessage.textContent = data.message || "Falha ao salvar disponibilidade.";
      return;
    }

    availabilityMessage.textContent = "Disponibilidade adicionada.";
    availabilityForm.reset();
    await loadAvailability();
  });
}

function monthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function setupCalendarSelectors() {
  if (!calendarForm || calendarForm.dataset.ready === "1") return;
  const now = new Date();
  monthNames.forEach((name, index) => {
    const option = document.createElement("option");
    option.value = String(index + 1).padStart(2, "0");
    option.textContent = name;
    calendarForm.month.appendChild(option);
  });
  for (let year = now.getFullYear() - 1; year <= now.getFullYear() + 3; year += 1) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    calendarForm.year.appendChild(option);
  }
  calendarForm.month.value = String(now.getMonth() + 1).padStart(2, "0");
  calendarForm.year.value = String(now.getFullYear());
  calendarForm.dataset.ready = "1";
}

function selectedCalendarMonth() {
  setupCalendarSelectors();
  return `${calendarForm.year.value}-${calendarForm.month.value}`;
}

function weekdayLabel(value) {
  const labels = ["Domingo", "Segunda", "Terca", "Quarta", "Quinta", "Sexta", "Sabado"];
  if (value === null || value === undefined || value === "") return "Todos os dias";
  return labels[Number(value)] || "-";
}

function formatBlockRule(rule) {
  if (rule.block_type === "date") return formatDateOnlyBR(rule.block_date);
  if (rule.block_type === "weekday") return `Dia inteiro: ${weekdayLabel(rule.weekday)}`;
  if (rule.block_type === "period") return `${formatDateOnlyBR(rule.block_date)}, ${normalizeTimeText(rule.start_time)} ate ${normalizeTimeText(rule.end_time)}`;
  if (rule.block_type === "holiday") return `${formatDateOnlyBR(rule.block_date)}${rule.annual ? " - repete anualmente" : ""}`;
  if (rule.block_type === "vacation") return `${formatDateOnlyBR(rule.block_date)} ate ${formatDateOnlyBR(rule.end_date)}`;
  if (rule.block_type === "work_hours") return `${weekdayLabel(rule.weekday)}, ${normalizeTimeText(rule.start_time)} ate ${normalizeTimeText(rule.end_time)}`;
  if (rule.block_type === "lunch") return `${normalizeTimeText(rule.start_time)} ate ${normalizeTimeText(rule.end_time)}, somente nos dias de trabalho`;
  return `${weekdayLabel(rule.weekday)}, ${normalizeTimeText(rule.start_time)} ate ${normalizeTimeText(rule.end_time)}`;
}

function blockRuleTypeLabel(type) {
  const labels = {
    date: "Data bloqueada",
    weekday: "Dia recorrente",
    time_range: "Periodo recorrente",
    period: "Periodo pontual",
    holiday: "Feriado",
    vacation: "Ferias",
    work_hours: "Disponibilidade semanal",
    lunch: "Horario de almoco",
  };
  return labels[type] || type;
}

async function createBlockRule(payload) {
  const response = await fetch("/meetings/admin/block-rules", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Falha ao adicionar regra.");
  return data;
}

function checkedWeekdays(formElement) {
  return Array.from(formElement.querySelectorAll('input[name="weekdays"]:checked')).map((input) => Number(input.value));
}

async function removeMeetingRule(id, messageElement) {
  const response = await fetch(`/meetings/admin/block-rules/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (messageElement) messageElement.textContent = "Falha ao remover configuracao.";
    return;
  }
  if (messageElement) messageElement.textContent = "Configuracao removida.";
  await loadMeetingAgenda();
}

function renderMeetingRules(items, container, emptyText, messageElement) {
  if (!container) return;
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = `<p class="empty-state">${emptyText}</p>`;
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "timeline-item agenda-rule-item";
    row.innerHTML = `
      <div>
        <strong>${item.label}</strong>
        <p>${formatBlockRule(item)}</p>
        <small>${blockRuleTypeLabel(item.block_type)}</small>
      </div>
      <div class="timeline-actions"><button class="btn remove" type="button">Remover</button></div>
    `;
    row.querySelector("button").addEventListener("click", () => removeMeetingRule(item.id, messageElement));
    container.appendChild(row);
  });
}

async function loadBlockRules() {
  [blockRuleList, holidayList, vacationList, workScheduleList, lunchList, exceptionList].forEach((container) => {
    if (container) container.innerHTML = '<p class="empty-state">Carregando configuracoes...</p>';
  });
  const response = await fetch("/meetings/admin/block-rules", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    if (blockRuleList) blockRuleList.textContent = "Falha ao carregar configuracoes.";
    return;
  }

  const items = await response.json();
  renderMeetingRules(items.filter((item) => ["date", "weekday", "time_range"].includes(item.block_type)), blockRuleList, "Nenhum bloqueio cadastrado.", blockRuleMessage);
  renderMeetingRules(items.filter((item) => item.block_type === "holiday"), holidayList, "Nenhum feriado cadastrado.", holidayMessage);
  renderMeetingRules(items.filter((item) => item.block_type === "vacation"), vacationList, "Nenhum periodo de ferias cadastrado.", vacationMessage);
  renderMeetingRules(items.filter((item) => item.block_type === "work_hours"), workScheduleList, "Nenhum dia disponivel configurado.", workScheduleMessage);
  renderMeetingRules(items.filter((item) => item.block_type === "lunch"), lunchList, "Nenhum horario de almoco configurado.", lunchMessage);
  renderMeetingRules(items.filter((item) => item.block_type === "period"), exceptionList, "Nenhuma excecao cadastrada.", exceptionMessage);
}

if (blockRuleForm) {
  const updateBlockMode = () => {
    const byDate = blockRuleForm.mode.value === "date";
    blockRuleForm.blockDate.disabled = !byDate;
    blockRuleForm.querySelector(".block-date-field").classList.toggle("is-disabled", !byDate);
    blockRuleForm.querySelector(".block-weekdays").classList.toggle("is-disabled", byDate);
  };
  blockRuleForm.mode.addEventListener("change", updateBlockMode);
  updateBlockMode();

  blockRuleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    blockRuleMessage.textContent = "";
    const startTime = blockRuleForm.startTime.value || null;
    const endTime = blockRuleForm.endTime.value || null;
    if (Boolean(startTime) !== Boolean(endTime)) {
      blockRuleMessage.textContent = "Preencha inicio e fim, ou deixe ambos vazios para bloquear o dia inteiro.";
      return;
    }

    const base = { label: blockRuleForm.label.value, startTime, endTime, persistent: true };
    const payloads = [];
    if (blockRuleForm.mode.value === "date") {
      if (!blockRuleForm.blockDate.value) {
        blockRuleMessage.textContent = "Informe a data do bloqueio.";
        return;
      }
      payloads.push({ ...base, blockType: startTime ? "period" : "date", blockDate: blockRuleForm.blockDate.value });
    } else {
      const weekdays = checkedWeekdays(blockRuleForm);
      if (!weekdays.length) {
        blockRuleMessage.textContent = "Selecione pelo menos um dia da semana.";
        return;
      }
      weekdays.forEach((weekday) => payloads.push({ ...base, blockType: startTime ? "time_range" : "weekday", weekday }));
    }

    try {
      for (const payload of payloads) await createBlockRule(payload);
      blockRuleMessage.textContent = "Bloqueio salvo.";
      blockRuleForm.reset();
      updateBlockMode();
      await loadMeetingAgenda();
    } catch (error) {
      blockRuleMessage.textContent = error.message || "Falha ao salvar bloqueio.";
    }
  });
}

if (holidayForm) {
  holidayForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    holidayMessage.textContent = "";
    try {
      await createBlockRule({
        label: holidayForm.label.value,
        blockType: "holiday",
        blockDate: holidayForm.blockDate.value,
        annual: holidayForm.annual.checked,
        persistent: true,
      });
      holidayMessage.textContent = "Feriado adicionado.";
      holidayForm.reset();
      await loadMeetingAgenda();
    } catch (error) {
      holidayMessage.textContent = error.message || "Falha ao salvar feriado.";
    }
  });
}

if (vacationForm) {
  vacationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    vacationMessage.textContent = "";
    if (vacationForm.endDate.value < vacationForm.startDate.value) {
      vacationMessage.textContent = "O ultimo dia deve ser igual ou posterior ao primeiro.";
      return;
    }
    try {
      await createBlockRule({
        label: vacationForm.label.value,
        blockType: "vacation",
        blockDate: vacationForm.startDate.value,
        endDate: vacationForm.endDate.value,
        persistent: true,
      });
      vacationMessage.textContent = "Ferias programadas.";
      vacationForm.reset();
      await loadMeetingAgenda();
    } catch (error) {
      vacationMessage.textContent = error.message || "Falha ao programar ferias.";
    }
  });
}

if (workScheduleForm) {
  workScheduleForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    workScheduleMessage.textContent = "";
    const weekdays = checkedWeekdays(workScheduleForm);
    if (!weekdays.length) {
      workScheduleMessage.textContent = "Selecione pelo menos um dia de atendimento.";
      return;
    }
    const response = await fetch("/meetings/admin/work-schedule", {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        label: workScheduleForm.label.value,
        weekdays,
        startTime: workScheduleForm.startTime.value,
        endTime: workScheduleForm.endTime.value,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      workScheduleMessage.textContent = data.message || "Falha ao salvar dias disponiveis.";
      return;
    }
    workScheduleMessage.textContent = "Dias disponiveis atualizados.";
    await loadMeetingAgenda();
  });
}

if (lunchForm) {
  lunchForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    lunchMessage.textContent = "";
    try {
      await createBlockRule({
        label: lunchForm.label.value,
        blockType: "lunch",
        startTime: lunchForm.startTime.value,
        endTime: lunchForm.endTime.value,
        persistent: true,
      });
      lunchMessage.textContent = "Horario de almoco salvo.";
      lunchForm.reset();
      await loadMeetingAgenda();
    } catch (error) {
      lunchMessage.textContent = error.message || "Falha ao salvar horario de almoco.";
    }
  });
}

if (exceptionForm) {
  exceptionForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    exceptionMessage.textContent = "";
    try {
      await createBlockRule({
        label: exceptionForm.label.value,
        blockType: "period",
        blockDate: exceptionForm.blockDate.value,
        startTime: exceptionForm.startTime.value,
        endTime: exceptionForm.endTime.value,
        persistent: false,
      });
      exceptionMessage.textContent = "Excecao adicionada.";
      exceptionForm.reset();
      await loadMeetingAgenda();
    } catch (error) {
      exceptionMessage.textContent = error.message || "Falha ao adicionar excecao.";
    }
  });
}

async function createWeekdayBlock(weekday, label) {
  if (!blockRuleMessage) return;
  blockRuleMessage.textContent = "";
  try {
    await createBlockRule({ label, blockType: "weekday", weekday, persistent: true });
    blockRuleMessage.textContent = `${label} bloqueado.`;
    await loadMeetingAgenda();
  } catch (error) {
    blockRuleMessage.textContent = error.message || "Falha ao criar bloqueio.";
  }
}

if (blockSaturdayButton) blockSaturdayButton.addEventListener("click", () => createWeekdayBlock(6, "Sabados"));
if (blockSundayButton) blockSundayButton.addEventListener("click", () => createWeekdayBlock(0, "Domingos"));
async function loadAdminCalendar() {
  if (!calendarGrid || !calendarForm) return;
  setupCalendarSelectors();
  const selectedMonth = selectedCalendarMonth();
  calendarGrid.textContent = "Carregando calendario...";

  const response = await fetch(`/meetings/admin/calendar?month=${encodeURIComponent(selectedMonth)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    calendarGrid.textContent = "Falha ao carregar calendario.";
    return;
  }

  const data = await response.json();
  calendarGrid.innerHTML = "";

  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"].forEach((label) => {
    const head = document.createElement("div");
    head.className = "calendar-head";
    head.textContent = label;
    calendarGrid.appendChild(head);
  });

  const firstDate = new Date(`${data.month}-01T12:00:00`);
  for (let i = 0; i < firstDate.getDay(); i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day calendar-empty";
    calendarGrid.appendChild(empty);
  }

  data.days.forEach((day) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `calendar-day ${day.hasBooking ? "calendar-booked" : day.blocked ? "calendar-blocked" : "calendar-available"}`;
    button.innerHTML = `<strong>${day.day}</strong><span>${day.hasBooking ? "Reuniao" : day.blocked ? "Bloqueado" : "Livre"}</span>`;
    button.addEventListener("click", () => loadAdminDaySchedule(day.date));
    calendarGrid.appendChild(button);
  });
}

async function loadAdminDaySchedule(date) {
  if (!dayScheduleList) return;
  dayScheduleList.textContent = "Carregando dia...";
  const response = await fetch(`/meetings/admin/day?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    dayScheduleList.textContent = "Falha ao carregar dia.";
    return;
  }

  const data = await response.json();
  dayScheduleList.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = `Blocos de ${formatDateOnlyBR(data.date)}`;
  dayScheduleList.appendChild(title);

  data.blocks.forEach((block) => {
    const row = document.createElement("div");
    row.className = `day-slot day-slot-${block.status}`;
    row.innerHTML = `
      <strong>${block.startTime} - ${block.endTime}</strong>
      <span>${block.status === "available" ? "Disponivel" : block.status === "booked" ? `Agendado: ${block.booking?.userName || "-"}` : "Bloqueado"}</span>
    `;
    dayScheduleList.appendChild(row);
  });
}

if (calendarForm) {
  calendarForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadAdminCalendar();
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

function renderActiveDiscounts(discounts) {
  if (!activeDiscountsList) return;
  activeDiscountsList.innerHTML = "";

  if (!discounts.length) {
    activeDiscountsList.innerHTML = '<p class="empty-state">Nenhum desconto ativo ou agendado.</p>';
    return;
  }

  discounts.forEach((discount) => {
    const card = document.createElement("article");
    card.className = `active-discount-card ${discount.status === "active" ? "is-active" : "is-scheduled"}`;
    const startsAt = discount.starts_at ? formatDateTimeBR(discount.starts_at) : "Imediato";
    const endsAt = discount.ends_at ? formatDateTimeBR(discount.ends_at) : "Sem data final";
    const isGlobal = !discount.user_id;
    card.innerHTML = `
      <div class="active-discount-heading">
        <span class="discount-status-badge">${discount.status === "active" ? "Ativo" : "Agendado"}</span>
        <strong>${Number(discount.percent).toLocaleString("pt-BR")}%</strong>
      </div>
      <div class="active-discount-user">
        <b>${isGlobal ? "Todos os usuarios" : discount.name}</b>
        <span>${isGlobal ? "Desconto global" : discount.email}</span>
        ${isGlobal ? "" : `<span>CPF: ${discount.cpf || "-"}</span>`}
      </div>
      <div class="active-discount-period">
        <span><small>Inicio</small>${startsAt}</span>
        <span><small>Fim</small>${endsAt}</span>
      </div>
      <button class="btn remove remove-active-discount" type="button">Remover desconto</button>
    `;

    card.querySelector(".remove-active-discount").addEventListener("click", async () => {
      const response = await fetch(`/admin/discounts/${discount.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        discountMessage.textContent = "Nao foi possivel remover o desconto.";
        return;
      }
      await loadActiveDiscounts();
    });

    activeDiscountsList.appendChild(card);
  });
}

async function loadActiveDiscounts() {
  if (!activeDiscountsList) return;
  activeDiscountsList.innerHTML = '<p class="empty-state">Carregando descontos...</p>';
  const response = await fetch("/admin/discounts", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    activeDiscountsList.innerHTML = '<p class="empty-state error">Falha ao carregar descontos.</p>';
    return;
  }
  renderActiveDiscounts(await response.json());
}

if (refreshDiscountsButton) {
  refreshDiscountsButton.addEventListener("click", loadActiveDiscounts);
}

if (discountForm) {
  discountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    discountMessage.textContent = "";

    const percent = Number(discountForm.percent.value);
    const startsAt = discountForm.startsAt.value
      ? new Date(discountForm.startsAt.value).toISOString()
      : null;
    const endsAt = discountForm.endsAt.value
      ? new Date(discountForm.endsAt.value).toISOString()
      : null;

    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      discountMessage.textContent = "Informe um percentual maior que 0 e menor ou igual a 100.";
      return;
    }
    if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
      discountMessage.textContent = "A data final deve ser posterior a data inicial.";
      return;
    }

    const response = await fetch("/admin/discounts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userQuery: discountForm.userQuery.value.trim(),
        percent,
        startsAt,
        endsAt,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      discountMessage.textContent = data.message || "Falha ao adicionar desconto.";
      return;
    }

    discountMessage.textContent = discountForm.userQuery.value.trim()
      ? "Desconto individual adicionado."
      : "Desconto global adicionado.";
    discountForm.reset();
    await loadActiveDiscounts();
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
        <div>Orcamento: ${item.accepted ? "Aceito" : "Recusado"}</div>
        <div>Contrato: ${item.contract_active ? "Ativo" : "Inativo"}</div>
      </div>
    `;

    const controls = document.createElement("div");
    controls.className = "form-actions";
    const timelineButton = document.createElement("button");
    timelineButton.className = "btn ghost";
    timelineButton.type = "button";
    timelineButton.textContent = "Abrir timeline deste contrato";
    timelineButton.disabled = !item.accepted;
    timelineButton.addEventListener("click", async () => {
      setActiveTab("timeline");
      if (timelineSearchForm) timelineSearchForm.budgetId.value = item.id;
      await loadTimelineForBudgetId(item.id);
    });
    controls.appendChild(timelineButton);

    const answers = document.createElement("pre");
    answers.className = "code-block";
    answers.textContent = safeJson(item.answers || {});

    wrapper.appendChild(summary);
    wrapper.appendChild(contact);
    wrapper.appendChild(controls);
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
