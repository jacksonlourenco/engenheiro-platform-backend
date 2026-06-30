const token = localStorage.getItem("auth_token");
const logoutButton = document.getElementById("logout");
const profileForm = document.getElementById("profile-form");
const profileStatus = document.getElementById("profile-status");
const profileMessage = document.getElementById("profile-message");
const budgetButton = document.getElementById("budget-button");
const budgetMessage = document.getElementById("budget-message");
const pendingList = document.getElementById("pending-list");
const contractTimelineStatus = document.getElementById("contract-timeline-status");
const contractTimelineList = document.getElementById("contract-timeline-list");
const meetingFilterForm = document.getElementById("meeting-filter-form");
const meetingMessage = document.getElementById("meeting-message");
const meetingSlotsList = document.getElementById("meeting-slots-list");
const meetingSearchButton = document.getElementById("meeting-search-button");
const currentMeeting = document.getElementById("current-meeting");
const editProfileButton = document.getElementById("edit-profile");
const saveProfileButton = document.getElementById("save-profile");
const cepLookupButton = document.getElementById("cep-lookup");
const budgetModal = document.getElementById("budget-modal");
const budgetStep = document.getElementById("budget-step");
const budgetBackButton = document.getElementById("budget-back");
const budgetNextButton = document.getElementById("budget-next");
const budgetResult = document.getElementById("budget-result");
const budgetTotal = document.getElementById("budget-total");
const budgetStructural = document.getElementById("budget-structural");
const budgetComplementary = document.getElementById("budget-complementary");
const budgetProgress = document.getElementById("budget-progress");
const budgetRecap = document.getElementById("budget-recap");
const budgetAccept = document.getElementById("budget-accept");
const budgetDecline = document.getElementById("budget-decline");
const budgetStatus = document.getElementById("budget-status");
const budgetCloseButtons = document.querySelectorAll("[data-close-budget]");
const budgetNav = document.querySelector(".budget-nav");
let originalProfile = null;
let budgetQueue = [];
let budgetAnswers = null;
let budgetProfile = "leigo";
let currentStepIndex = 0;
let lastBudgetResult = null;
let budgetQuestionsData = null;
let activeMeetingContracts = [];
let meetingBookingsByContract = new Map();
let questionMeta = {
  tecnico: null,
  leigo: null,
};

if (!token) {
  window.location.href = "/";
}

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("auth_token");
  window.location.href = "/";
});

budgetCloseButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    closeBudgetModal();
  });
});

if (budgetBackButton) {
  budgetBackButton.addEventListener("click", () => {
    if (currentStepIndex <= 0) return;
    saveCurrentAnswerSoft();
    currentStepIndex -= 1;
    renderQuestion();
  });
}

if (budgetButton) {
  budgetButton.addEventListener("click", () => {
    if (budgetButton.disabled) return;
    openBudgetModal();
  });
}

function setFormEditable(enabled) {
  const fields = profileForm.querySelectorAll("input, select");
  fields.forEach((field) => {
    if (field.name) {
      // CPF is set at registration time and must not be edited here.
      if (field.name === "cpf") {
        field.disabled = true;
        return;
      }
      field.disabled = !enabled;
    }
  });
  if (cepLookupButton) {
    cepLookupButton.disabled = !enabled;
  }
  saveProfileButton.disabled = true;
  editProfileButton.disabled = enabled;
}

function markMissingFields() {
  const requiredFields = ["phone", "address", "addressNumber", "gender", "birthDate", "maritalStatus", "childrenCount"];
  requiredFields.forEach((name) => {
    const field = profileForm.querySelector(`[name='${name}']`);
    if (!field) return;
    const value = String(field.value || "").trim();
    const isMissing = value === "";
    field.classList.toggle("missing", isMissing);
  });
}

function snapshotProfile() {
  return {
    cep: profileForm.cep.value,
    phone: profileForm.phone.value,
    address: profileForm.address.value,
    addressNumber: profileForm.addressNumber.value,
    gender: profileForm.gender.value,
    birthDate: profileForm.birthDate.value,
    maritalStatus: profileForm.maritalStatus.value,
    childrenCount: profileForm.childrenCount.value,
  };
}

function hasChanges() {
  if (!originalProfile) return false;
  const current = snapshotProfile();
  return Object.keys(current).some((key) => current[key] !== originalProfile[key]);
}

function handleChange() {
  if (!originalProfile) return;
  saveProfileButton.disabled = !hasChanges();
}

async function loadUser() {
  const response = await fetch("/auth/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    localStorage.removeItem("auth_token");
    window.location.href = "/";
    return;
  }

  const user = await response.json();

  profileForm.cpf.value = user.cpf || "";
  profileForm.phone.value = user.phone || "";
  profileForm.cep.value = "";
  profileForm.address.value = user.address || "";
  profileForm.addressNumber.value = user.address_number || "";
  profileForm.gender.value = user.gender || "";
  profileForm.birthDate.value = user.birth_date ? String(user.birth_date).slice(0, 10) : "";
  profileForm.maritalStatus.value = user.marital_status || "";
  profileForm.childrenCount.value =
    user.children_count === null || user.children_count === undefined ? "" : String(user.children_count);

  originalProfile = snapshotProfile();
  const complete = Boolean(user.profile_complete);
  profileStatus.textContent = complete
    ? "Cadastro completo. Voce ja pode solicitar orcamento."
    : "Cadastro incompleto. Preencha os dados abaixo.";
  budgetButton.disabled = !complete;
  budgetMessage.textContent = complete ? "" : "Para seguir com o orcamento, complete seu cadastro.";
  markMissingFields();
  setFormEditable(false);
}

editProfileButton.addEventListener("click", () => {
  setFormEditable(true);
  saveProfileButton.disabled = true;
});

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  profileMessage.textContent = "";

  const payload = {
    phone: profileForm.phone.value,
    address: profileForm.address.value,
    addressNumber: profileForm.addressNumber.value,
    gender: profileForm.gender.value,
    birthDate: profileForm.birthDate.value,
    maritalStatus: profileForm.maritalStatus.value,
    childrenCount: profileForm.childrenCount.value === "" ? null : Number(profileForm.childrenCount.value),
  };

  const required = ["phone", "address", "addressNumber", "gender", "birthDate", "maritalStatus", "childrenCount"];
  const missing = required.filter((key) => {
    const value = payload[key];
    return value === null || value === undefined || String(value).trim() === "";
  });

  if (missing.length) {
    profileMessage.textContent = "Preencha todos os campos obrigatorios.";
    markMissingFields();
    return;
  }

  const response = await fetch("/auth/me", {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    profileMessage.textContent = data.message || "Erro ao salvar.";
    return;
  }

  profileMessage.textContent = "Cadastro atualizado.";
  const complete = Boolean(data.profile_complete);
  profileStatus.textContent = complete
    ? "Cadastro completo. Voce ja pode solicitar orcamento."
    : "Cadastro incompleto. Preencha os dados abaixo.";
  budgetButton.disabled = !complete;
  budgetMessage.textContent = complete ? "" : "Para seguir com o orcamento, complete seu cadastro.";
  markMissingFields();
  setFormEditable(false);
  originalProfile = snapshotProfile();
});

profileForm.addEventListener("input", handleChange);
profileForm.addEventListener("change", handleChange);

if (cepLookupButton) {
  cepLookupButton.addEventListener("click", async () => {
    const raw = String(profileForm.cep.value || "").trim();
    const cep = raw.replace(/\D/g, "");
    if (cep.length !== 8) {
      profileMessage.textContent = "CEP invalido. Use 8 numeros.";
      return;
    }
    profileMessage.textContent = "Buscando CEP...";
    try {
      const resp = await fetch(`/utils/cep/${cep}`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        profileMessage.textContent = data.message || "Falha ao buscar CEP.";
        return;
      }

      const parts = [data.logradouro, data.bairro, data.localidade && data.uf ? `${data.localidade} - ${data.uf}` : ""]
        .map((p) => String(p || "").trim())
        .filter(Boolean);
      const formatted = parts.join(", ");
      if (formatted) {
        profileForm.address.value = formatted;
      }
      profileMessage.textContent = "Endereco preenchido a partir do CEP. Revise e complete o numero.";
      markMissingFields();
      handleChange();
    } catch (_err) {
      profileMessage.textContent = "Falha ao buscar CEP.";
    }
  });
}

function openBudgetModal() {
  if (!budgetModal) return;
  budgetModal.style.display = "flex";
  budgetModal.classList.add("show");
  budgetModal.setAttribute("aria-hidden", "false");
  resetBudgetFlow();
  loadBudgetQuestions();
}

function closeBudgetModal() {
  if (!budgetModal) return;
  budgetModal.classList.remove("show");
  budgetModal.setAttribute("aria-hidden", "true");
  budgetModal.style.display = "";
}

function resetBudgetFlow() {
  budgetQueue = [];
  budgetAnswers = { structural: {}, complementary: {} };
  budgetProfile = "leigo";
  currentStepIndex = 0;
  lastBudgetResult = null;
  budgetQuestionsData = null;
  if (budgetResult) {
    budgetResult.classList.add("hidden");
  }
  if (budgetNav) {
    budgetNav.classList.remove("hidden");
  }
  if (budgetStatus) {
    budgetStatus.textContent = "";
  }
  if (budgetNextButton) {
    budgetNextButton.disabled = true;
  }
  if (budgetStep) {
    budgetStep.innerHTML = "";
    budgetStep.classList.remove("hidden");
  }
  if (budgetProgress) {
    budgetProgress.textContent = "";
  }
  if (budgetRecap) {
    budgetRecap.innerHTML = "";
  }
  if (budgetBackButton) {
    budgetBackButton.disabled = true;
  }
}

async function loadBudgetQuestions(profile, skipIntro) {
  const query = profile ? `?profile=${profile}` : "";
  const response = await fetch(`/budget/questions${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    budgetStep.textContent = "Nao foi possivel carregar as perguntas.";
    return;
  }

  const data = await response.json();
  budgetQuestionsData = data;
  budgetProfile = data.profile;
  budgetQueue = buildQueue(data, Boolean(skipIntro));
  currentStepIndex = 0;
  renderQuestion();
}

function buildQueue(data, skipIntro) {
  const queue = [];
  if (!skipIntro && data.intro) {
    queue.push({ ...data.intro, group: "intro" });
  }
  data.questions.structural.forEach((q) => queue.push({ ...q, group: "structural" }));
  data.questions.complementary.forEach((q) => queue.push({ ...q, group: "complementary" }));
  return queue;
}

function renderQuestion() {
  if (budgetStep) {
    budgetStep.innerHTML = "";
  }
  if (budgetNextButton) {
    budgetNextButton.disabled = true;
  }

  const current = budgetQueue[currentStepIndex];
  if (!current) return;

  if (budgetProgress) {
    budgetProgress.textContent = `Pergunta ${currentStepIndex + 1} de ${budgetQueue.length}`;
  }
  if (budgetBackButton) {
    budgetBackButton.disabled = currentStepIndex === 0;
  }

  const error = document.createElement("p");
  error.className = "form-status";
  error.id = "budget-error";

  const card = document.createElement("div");
  card.className = "budget-question-card";

  const label = document.createElement("span");
  label.textContent = current.label;
  label.className = "budget-label";
  card.appendChild(label);

  if (current.help) {
    const help = document.createElement("p");
    help.className = "budget-help";
    help.textContent = current.help;
    card.appendChild(help);
  }

  const field = document.createElement("div");
  field.className = "budget-field";

  let input;
  if (current.type === "number") {
    input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.step = "0.01";
    input.placeholder = "Digite um numero";
    field.appendChild(input);
  } else if (current.type === "select") {
    const options =
      current.options && current.options.length ? current.options : ["SIM", "NÃO"];

    const normalized = options.map((option) => {
      if (typeof option === "string") return { value: option, label: option };
      return { value: option.value, label: option.label };
    });

    const useButtons = normalized.length <= 4;
    if (useButtons) {
      const hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.value = "";
      hidden.dataset.budgetChoice = "1";
      field.appendChild(hidden);

      const group = document.createElement("div");
      group.className = "choice-group";
      normalized.forEach((option) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "choice-btn";
        btn.textContent = option.label;
        btn.dataset.value = option.value;
        btn.addEventListener("click", () => {
          group.querySelectorAll(".choice-btn").forEach((el) => el.classList.remove("active"));
          btn.classList.add("active");
          hidden.value = option.value;
          updateNextState();
        });
        group.appendChild(btn);
      });
      field.appendChild(group);
    } else {
      input = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Selecione";
      input.appendChild(placeholder);
      normalized.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        input.appendChild(opt);
      });
      field.appendChild(input);
    }
  } else if (current.type === "multi") {
    input = document.createElement("div");
    input.className = "budget-multi";
    current.options.forEach((option) => {
      const row = document.createElement("label");
      row.className = "budget-checkbox";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option;
      row.appendChild(checkbox);
      const text = document.createElement("span");
      text.textContent = option;
      row.appendChild(text);
      input.appendChild(row);
    });
    field.appendChild(input);
  }

  card.appendChild(field);
  card.appendChild(error);
  budgetStep.appendChild(card);

  card.addEventListener("input", () => updateNextState());
  card.addEventListener("change", () => updateNextState());
  restoreCurrentAnswer(current, field);
  updateNextState();
}

function isCurrentAnswerValid() {
  const current = budgetQueue[currentStepIndex];
  if (!current) return false;
  if (current.type === "multi") {
    return true;
  }
  const input = budgetStep.querySelector("input[data-budget-choice], input[type='number'], select");
  if (!input) return false;
  const value = String(input.value || "").trim();
  if (value === "") return false;

  if (current.type === "number") {
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (current.id === "area") return num > 0;
  }

  return true;
}

function readCurrentAnswer() {
  const current = budgetQueue[currentStepIndex];
  if (!current) return null;
  if (current.type === "multi") {
    const map = {};
    const checks = budgetStep.querySelectorAll("input[type='checkbox']");
    checks.forEach((box) => {
      map[box.value] = box.checked ? "SIM" : "NÃO";
    });
    return map;
  }
  const input = budgetStep.querySelector("input[data-budget-choice], input[type='number'], select");
  if (!input) return null;
  if (current.type === "number") {
    return Number(input.value);
  }
  return input.value;
}

function saveCurrentAnswer() {
  const current = budgetQueue[currentStepIndex];
  const value = readCurrentAnswer();
  if (!current) return;

  if (current.group === "intro") {
    budgetProfile = value;
    return;
  }

  if (current.group === "structural") {
    budgetAnswers.structural[current.id] = value;
  }

  if (current.group === "complementary") {
    budgetAnswers.complementary[current.id] = value;
  }
}

function saveCurrentAnswerSoft() {
  const current = budgetQueue[currentStepIndex];
  if (!current) return;

  const value = readCurrentAnswer();
  if (current.group === "intro") {
    if (value) budgetProfile = value;
    return;
  }

  if (value === null || value === undefined) return;
  if (typeof value === "string" && value.trim() === "") return;

  if (current.group === "structural") {
    budgetAnswers.structural[current.id] = value;
  }

  if (current.group === "complementary") {
    budgetAnswers.complementary[current.id] = value;
  }
}

function getSavedAnswer(current) {
  if (current.group === "intro") return budgetProfile;
  if (current.group === "structural") return budgetAnswers?.structural?.[current.id];
  if (current.group === "complementary") return budgetAnswers?.complementary?.[current.id];
  return undefined;
}

function restoreCurrentAnswer(current, container) {
  const saved = getSavedAnswer(current);
  if (saved === undefined || saved === null) return;

  if (current.type === "number") {
    const input = container.querySelector("input[type='number']");
    if (input) input.value = String(saved);
    return;
  }

  if (current.type === "select") {
    const hidden = container.querySelector("input[data-budget-choice]");
    if (hidden) {
      hidden.value = String(saved);
      const group = container.querySelector(".choice-group");
      if (group) {
        group.querySelectorAll(".choice-btn").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.value === String(saved));
        });
      }
      return;
    }

    const select = container.querySelector("select");
    if (select) select.value = String(saved);
    return;
  }

  if (current.type === "multi") {
    const map = saved || {};
    container.querySelectorAll("input[type='checkbox']").forEach((box) => {
      box.checked = map[box.value] === "SIM" || map[box.value] === true;
    });
  }
}

function updateNextState() {
  const error = document.getElementById("budget-error");
  if (error) error.textContent = "";
  if (budgetNextButton) {
    budgetNextButton.disabled = !isCurrentAnswerValid();
  }
}

budgetNextButton.addEventListener("click", async () => {
  const error = document.getElementById("budget-error");
  if (!isCurrentAnswerValid()) {
    if (error) {
      error.textContent = "Selecione ou preencha a resposta para continuar.";
    }
    return;
  }

  if (error) {
    error.textContent = "";
  }

  const current = budgetQueue[currentStepIndex];
  saveCurrentAnswer();

  if (current.group === "intro" && budgetQuestionsData) {
    if (budgetProfile !== budgetQuestionsData.profile) {
      // Reload questions for the selected profile, but do not ask the intro again.
      await loadBudgetQuestions(budgetProfile, true);
      return;
    }
  }

  currentStepIndex += 1;
  if (currentStepIndex >= budgetQueue.length) {
    finalizeBudget();
  } else {
    renderQuestion();
  }
});

async function finalizeBudget() {
  const payload = {
    profile: budgetProfile,
    structural: { ...budgetAnswers.structural },
    complementary: { ...budgetAnswers.complementary },
  };

  if (!payload.structural.area && payload.complementary.area) {
    payload.structural.area = payload.complementary.area;
  }
  if (!payload.complementary.area && payload.structural.area) {
    payload.complementary.area = payload.structural.area;
  }

  const response = await fetch("/budget/calculate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    budgetStep.textContent = data.message || "Erro ao calcular orcamento.";
    return;
  }

  lastBudgetResult = data;
  if (budgetNav) {
    budgetNav.classList.add("hidden");
  }
  if (budgetResult) {
    budgetResult.classList.remove("hidden");
  }
  if (budgetStep) {
    budgetStep.classList.add("hidden");
  }
  if (budgetProgress) {
    budgetProgress.textContent = "Orcamento calculado";
  }
  if (budgetTotal) {
    if (data.discount && typeof data.discount.finalTotal === "number") {
      budgetTotal.innerHTML = `Total: <span class="budget-price-old">R$ ${data.totalSuggested.toFixed(2)}</span><br /><span class="budget-price-new">Com desconto: R$ ${data.discount.finalTotal.toFixed(2)}</span>`;
    } else {
      budgetTotal.textContent = `Total sugerido: R$ ${data.totalSuggested.toFixed(2)}`;
    }
  }
}

async function saveBudget(accepted) {
  if (!lastBudgetResult) return;
  const response = await fetch("/budgets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile: budgetProfile,
      answers: budgetAnswers,
      result: lastBudgetResult,
      accepted,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    budgetStatus.textContent = data.message || "Erro ao salvar orcamento.";
    return;
  }

  budgetStatus.textContent = accepted
    ? "Orcamento confirmado e salvo."
    : "Orcamento salvo como recusado.";
  await loadBudgets();
  setTimeout(() => {
    closeBudgetModal();
  }, 800);
}

if (budgetAccept) {
  budgetAccept.addEventListener("click", () => saveBudget(true));
}
if (budgetDecline) {
  budgetDecline.addEventListener("click", () => saveBudget(false));
}

function renderBudgets(items) {
  pendingList.innerHTML = "";
  if (!items.length) {
    pendingList.textContent = "Nenhum orcamento encontrado.";
    return;
  }

  items.forEach((item) => {
    const wrapper = document.createElement("details");
    wrapper.className = `pending-item ${item.accepted ? "" : "pending-declined"}`;
    const summary = document.createElement("summary");
    const total = item?.result?.totalSuggested;
    const totalText = typeof total === "number" ? ` - R$ ${total.toFixed(2)}` : "";
    const contractText = item.contract_active ? " - Contrato ativo" : "";
    summary.textContent = `Orcamento #${item.id}${totalText} - ${item.accepted ? "Aceito" : "Recusado"}${contractText}`;
    const info = document.createElement("p");
    const created = item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "";
    info.textContent = created ? `Criado em: ${created}` : "";

    const answersBox = document.createElement("div");
    answersBox.className = "budget-recap";
    const recapItems = buildBudgetRecapItems(item.profile || "leigo", item.answers || {});
    recapItems.forEach(({ label, value }) => {
      const row = document.createElement("div");
      row.className = "budget-recap-item";
      const key = document.createElement("strong");
      key.textContent = label;
      const val = document.createElement("span");
      val.textContent = value;
      row.appendChild(key);
      row.appendChild(val);
      answersBox.appendChild(row);
    });

    const action = document.createElement("button");
    action.className = item.accepted ? "btn remove" : "btn primary";
    action.textContent = item.accepted ? "Desativar orcamento" : "Ativar orcamento";
    action.disabled = false;

    action.addEventListener("click", async () => {
      if (item.accepted) {
        const ok = window.confirm("Deseja desativar este orcamento? Voce podera ativar novamente depois.");
        if (!ok) return;
      }
      const response = await fetch(`/budgets/${item.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accepted: !item.accepted }),
      });

      if (response.ok) {
        await loadBudgets();
      }
    });

    wrapper.appendChild(summary);
    wrapper.appendChild(info);
    wrapper.appendChild(answersBox);
    wrapper.appendChild(action);
    pendingList.appendChild(wrapper);
  });
}

async function loadBudgets() {
  const response = await fetch("/budgets", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    pendingList.textContent = "Falha ao carregar orcamentos.";
    return;
  }

  const items = await response.json();
  renderBudgets(items);
}

loadUser();
loadBudgets();
loadContractTimeline();
loadQuestionMeta();
initMeetingAgenda();

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

function formatSlotTime(start, end) {
  return `${String(start || "").slice(0, 5)} ate ${String(end || "").slice(0, 5)}`;
}

function slotMinutesValue(value) {
  const [hour, minute] = String(value || "").slice(0, 5).split(":").map(Number);
  return hour * 60 + minute;
}

function applyMeetingFilters(slots) {
  const period = meetingFilterForm.period.value;
  const preferredTime = meetingFilterForm.preferredTime.value;
  const preferredMinutes = preferredTime ? slotMinutesValue(preferredTime) : null;

  const filtered = slots.filter((slot) => {
    const startMinutes = slotMinutesValue(slot.startTime);
    if (period === "morning") return startMinutes < 12 * 60;
    if (period === "afternoon") return startMinutes >= 12 * 60;
    return true;
  });

  return filtered.sort((left, right) => {
    if (preferredMinutes !== null) {
      const leftDistance = Math.abs(slotMinutesValue(left.startTime) - preferredMinutes);
      const rightDistance = Math.abs(slotMinutesValue(right.startTime) - preferredMinutes);
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    }
    return String(left.startsAt).localeCompare(String(right.startsAt));
  });
}

async function loadMyMeetingBookings() {
  const response = await fetch("/meetings/mine", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    meetingBookingsByContract = new Map();
    return;
  }
  const bookings = await response.json();
  meetingBookingsByContract = new Map(bookings.map((booking) => [Number(booking.budget_id), booking]));
}

function formatMeetingDateTime(value) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderCurrentMeeting() {
  if (!currentMeeting || !meetingFilterForm) return;
  const budgetId = Number(meetingFilterForm.contractId.value);
  const booking = meetingBookingsByContract.get(budgetId);
  currentMeeting.innerHTML = "";
  currentMeeting.classList.toggle("hidden", !booking);
  if (!booking) return;

  currentMeeting.innerHTML = `
    <div>
      <small>Reuniao atual do contrato #${budgetId}</small>
      <strong>${formatMeetingDateTime(booking.starts_at)}</strong>
      <span>Para alterar, escolha um novo horario disponivel.</span>
    </div>
    <button class="btn primary" type="button">Remarcar reuniao</button>
  `;
  currentMeeting.querySelector("button").addEventListener("click", async () => {
    await loadMeetingSlots();
    meetingSlotsList.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

async function configureMeetingContracts(contracts) {
  if (!meetingFilterForm) return;
  const select = meetingFilterForm.contractId;
  activeMeetingContracts = Array.isArray(contracts) ? contracts : [];
  select.innerHTML = "";

  if (!activeMeetingContracts.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Nenhum contrato ativo";
    select.appendChild(option);
    if (meetingSearchButton) meetingSearchButton.disabled = true;
    meetingSlotsList.innerHTML = "";
    meetingMessage.textContent = "O agendamento sera liberado quando houver um contrato ativo.";
    if (currentMeeting) currentMeeting.classList.add("hidden");
    return;
  }

  activeMeetingContracts.forEach((contract) => {
    const option = document.createElement("option");
    option.value = String(contract.budgetId);
    const total = contract?.result?.discount?.finalTotal ?? contract?.result?.totalSuggested;
    option.textContent = `Contrato #${contract.budgetId}${typeof total === "number" ? ` - R$ ${total.toFixed(2)}` : ""}`;
    select.appendChild(option);
  });
  if (meetingSearchButton) meetingSearchButton.disabled = false;
  await loadMyMeetingBookings();
  renderCurrentMeeting();
  await loadMeetingSlots();
}

async function loadMeetingSlots() {
  if (!meetingSlotsList || !meetingFilterForm) return;
  meetingMessage.textContent = "";
  meetingSlotsList.textContent = "Carregando horarios...";

  const budgetId = Number(meetingFilterForm.contractId.value);
  if (!Number.isInteger(budgetId)) {
    meetingSlotsList.textContent = "";
    meetingMessage.textContent = "Selecione um contrato ativo para consultar os horarios.";
    return;
  }

  const from = meetingFilterForm.from.value || todayDateInput();
  const to = meetingFilterForm.to.value || plusDaysDateInput(30);
  if (to < from) {
    meetingSlotsList.textContent = "";
    meetingMessage.textContent = "A data final deve ser igual ou posterior a data inicial.";
    return;
  }
  const preferredTime = meetingFilterForm.preferredTime.value;
  if (preferredTime && !/^(?:[01]\d|2[0-3]):(?:00|30)$/.test(preferredTime)) {
    meetingSlotsList.textContent = "";
    meetingMessage.textContent = "O melhor horario deve terminar em :00 ou :30.";
    return;
  }
  const response = await fetch(`/meetings/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    meetingSlotsList.textContent = "";
    meetingMessage.textContent = data.message || "Falha ao carregar horarios.";
    return;
  }

  const filteredSlots = applyMeetingFilters(data);
  meetingSlotsList.innerHTML = "";
  if (!filteredSlots.length) {
    meetingSlotsList.textContent = "Nenhum horario disponivel para os filtros informados.";
    return;
  }

  const periodLabel = meetingFilterForm.period.value === "morning"
    ? " pela manha"
    : meetingFilterForm.period.value === "afternoon" ? " pela tarde" : "";
  meetingMessage.textContent = `${filteredSlots.length} horario(s) encontrado(s)${periodLabel}.`;

  const currentBookingForContract = meetingBookingsByContract.get(budgetId);
  filteredSlots.forEach((slot, index) => {
    const row = document.createElement("div");
    const isPreferredSuggestion = Boolean(preferredTime) && index === 0;
    row.className = `timeline-item meeting-slot${isPreferredSuggestion ? " meeting-slot-preferred" : ""}`;
    row.innerHTML = `
      <div>
        <strong>${formatDateOnlyBR(slot.date)}</strong>
        <p>${formatSlotTime(slot.startTime, slot.endTime)}</p>
        <small>${isPreferredSuggestion ? "Mais proximo do horario de sua preferencia." : "Reuniao de 30 minutos."}</small>
      </div>
      <div class="timeline-actions">
        <button class="btn primary" type="button">${currentBookingForContract ? "Remarcar para este horario" : "Agendar este horario"}</button>
      </div>
    `;

    row.querySelector("button").addEventListener("click", async () => {
      const action = currentBookingForContract ? "remarcar a reuniao" : "confirmar a reuniao";
      const ok = window.confirm(`Deseja ${action} para ${formatDateOnlyBR(slot.date)} das ${formatSlotTime(slot.startTime, slot.endTime)}?`);
      if (!ok) return;

      meetingMessage.textContent = "Agendando...";
      const response = await fetch("/meetings/book", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startsAt: slot.startsAt, budgetId, reschedule: Boolean(currentBookingForContract) }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        meetingMessage.textContent = result.message || "Falha ao agendar reuniao.";
        return;
      }

      meetingMessage.textContent = currentBookingForContract
        ? "Reuniao remarcada. A agenda e a timeline foram atualizadas."
        : "Reuniao agendada. O engenheiro sera notificado por e-mail.";
      await loadContractTimeline();
    });

    meetingSlotsList.appendChild(row);
  });
}

function initMeetingAgenda() {
  if (!meetingFilterForm) return;
  meetingFilterForm.from.value = todayDateInput();
  meetingFilterForm.to.value = plusDaysDateInput(30);
  meetingMessage.textContent = "Carregando contratos ativos...";
  meetingFilterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadMeetingSlots();
  });
  meetingFilterForm.contractId.addEventListener("change", () => {
    meetingSlotsList.innerHTML = "";
    renderCurrentMeeting();
    meetingMessage.textContent = "Clique em Buscar horarios para consultar este contrato.";
  });
}

function formatTimelineStatus(status) {
  const labels = {
    pendente: "Pendente",
    em_andamento: "Em andamento",
    concluido: "Concluido",
  };
  return labels[status] || "Pendente";
}

function renderContractTimeline(data) {
  if (!contractTimelineStatus || !contractTimelineList) return;
  contractTimelineList.innerHTML = "";

  if (!data.contractActive || !data.contracts || !data.contracts.length) {
    contractTimelineStatus.textContent = "Contrato ainda nao ativado pelo administrador.";
    return;
  }

  contractTimelineStatus.textContent = "Contratos ativos. Acompanhe abaixo as etapas cadastradas pelo engenheiro.";

  data.contracts.forEach((contract) => {
    const contractBox = document.createElement("details");
    contractBox.className = "pending-item";
    contractBox.open = true;

    const total = contract?.result?.totalSuggested;
    const summary = document.createElement("summary");
    summary.textContent = `Contrato #${contract.budgetId}${typeof total === "number" ? ` - R$ ${total.toFixed(2)}` : ""}`;
    contractBox.appendChild(summary);

    if (!contract.items || !contract.items.length) {
      const empty = document.createElement("p");
      empty.textContent = "Nenhuma atividade cadastrada no momento.";
      contractBox.appendChild(empty);
    } else {
      contract.items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "timeline-item";
        row.innerHTML = `
          <div>
            <strong>${item.title}</strong>
            <p>${item.description || "Sem descricao."}</p>
            <small>Prazo: ${item.deadline ? new Date(item.deadline).toLocaleDateString("pt-BR") : "Nao definido"}</small>
          </div>
          <span class="status-chip status-${item.status || "pendente"}">${formatTimelineStatus(item.status)}</span>
        `;
        contractBox.appendChild(row);
      });
    }

    contractTimelineList.appendChild(contractBox);
  });
}

async function loadContractTimeline() {
  if (!contractTimelineStatus || !contractTimelineList) return;
  contractTimelineStatus.textContent = "Carregando acompanhamento...";
  const response = await fetch("/timeline/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    contractTimelineStatus.textContent = "Falha ao carregar acompanhamento do contrato.";
    await configureMeetingContracts([]);
    return;
  }

  const data = await response.json();
  renderContractTimeline(data);
  await configureMeetingContracts(data.contracts || []);
}

async function loadQuestionMeta() {
  try {
    const [leigo, tecnico] = await Promise.all([
      fetch("/budget/questions?profile=leigo", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/budget/questions?profile=tecnico", { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    if (leigo.ok) questionMeta.leigo = await leigo.json();
    if (tecnico.ok) questionMeta.tecnico = await tecnico.json();

    // Refresh list so labels/descriptions show up.
    await loadBudgets();
  } catch (err) {
    // Best-effort only: budgets still render, but without labels.
  }
}

function getQuestionLabel(meta, group, id) {
  if (!meta || !meta.questions || !meta.questions[group]) return null;
  const found = meta.questions[group].find((q) => q.id === id);
  return found ? found.label : null;
}

function formatAnswerValue(key, value) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object" && value) {
    if (key === "contratar") {
      const selected = Object.entries(value)
        .filter(([, v]) => v === "SIM" || v === true)
        .map(([k]) => k);
      return selected.length ? selected.join(", ") : "Nenhum selecionado";
    }
    return JSON.stringify(value);
  }
  return String(value);
}

function buildBudgetRecapItems(profile, answers) {
  const meta = profile === "tecnico" ? questionMeta.tecnico : questionMeta.leigo;

  const structural = (answers && answers.structural) || {};
  const complementary = (answers && answers.complementary) || {};
  const items = [];

  const add = (group, key, value) => {
    if (value === undefined || value === null || value === "") return;
    const label = getQuestionLabel(meta, group, key) || `${group}.${key}`;
    items.push({ label, value: formatAnswerValue(key, value) });
  };

  if (meta && meta.questions) {
    meta.questions.structural.forEach((q) => {
      if (Object.prototype.hasOwnProperty.call(structural, q.id)) {
        add("structural", q.id, structural[q.id]);
      }
    });
    meta.questions.complementary.forEach((q) => {
      if (Object.prototype.hasOwnProperty.call(complementary, q.id)) {
        add("complementary", q.id, complementary[q.id]);
      }
    });
  } else {
    Object.keys(structural).forEach((key) => add("structural", key, structural[key]));
    Object.keys(complementary).forEach((key) => add("complementary", key, complementary[key]));
  }

  return items;
}

function renderBudgetRecap(profile, answers) {
  if (!budgetRecap) return;
  budgetRecap.innerHTML = "";
  const items = buildBudgetRecapItems(profile, answers);
  items.forEach(({ label, value }) => {
    const row = document.createElement("div");
    row.className = "budget-recap-item";
    const key = document.createElement("strong");
    key.textContent = label;
    const val = document.createElement("span");
    val.textContent = value;
    row.appendChild(key);
    row.appendChild(val);
    budgetRecap.appendChild(row);
  });
}

