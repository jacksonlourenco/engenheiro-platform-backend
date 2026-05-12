import { pool } from "../config/database";
import { sendEmail } from "./email";

type NotifyBudgetAcceptedParams = {
  budgetId: number;
  userId: number;
};

function getAdminNotifyEmail(): string | null {
  const value = String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
  return value ? value : null;
}

function formatMoney(value: unknown): string {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return `R$ ${num.toFixed(2)}`;
}

function formatDateBR(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function formatBudgetCode(id: number): string {
  return `BUD-${String(id).padStart(6, "0")}`;
}

function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAnswerValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function renderAnswersTable(answers: any): string {
  const structural = answers?.structural || {};
  const complementary = answers?.complementary || {};

  const rows: Array<{ group: string; key: string; value: string }> = [];
  Object.keys(structural).forEach((key) => {
    rows.push({ group: "Estrutural", key, value: formatAnswerValue(structural[key]) });
  });
  Object.keys(complementary).forEach((key) => {
    rows.push({ group: "Complementares", key, value: formatAnswerValue(complementary[key]) });
  });

  if (!rows.length) {
    return `<p style="margin:0;color:#6b7280">Sem respostas registradas.</p>`;
  }

  const tr = rows
    .map(
      (r) => `
        <tr>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;font-weight:600;white-space:nowrap;">${escapeHtml(r.group)}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;white-space:nowrap;">${escapeHtml(r.key)}</td>
          <td style="padding:10px 12px;border-top:1px solid #e5e7eb;color:#111827;">${escapeHtml(r.value)}</td>
        </tr>
      `.trim(),
    )
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="text-align:left;padding:10px 12px;color:#374151;font-size:12px;letter-spacing:.04em;text-transform:uppercase;">Grupo</th>
          <th style="text-align:left;padding:10px 12px;color:#374151;font-size:12px;letter-spacing:.04em;text-transform:uppercase;">Campo</th>
          <th style="text-align:left;padding:10px 12px;color:#374151;font-size:12px;letter-spacing:.04em;text-transform:uppercase;">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${tr}
      </tbody>
    </table>
  `.trim();
}

export async function notifyAdminBudgetAccepted(params: NotifyBudgetAcceptedParams): Promise<void> {
  const adminEmail = getAdminNotifyEmail();
  if (!adminEmail) {
    // Not configured: skip silently (do not block the request).
    return;
  }

  const result = await pool.query(
    `
      SELECT
        b.id AS budget_id,
        b.profile AS budget_profile,
        b.answers AS budget_answers,
        b.result AS budget_result,
        b.created_at AS budget_created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.cpf AS user_cpf,
        u.phone AS user_phone
        ,u.address AS user_address
        ,u.address_number AS user_address_number
        ,u.birth_date AS user_birth_date
      FROM budgets b
      JOIN users u ON u.id = b.user_id
      WHERE b.id = $1 AND b.user_id = $2
      LIMIT 1
    `,
    [params.budgetId, params.userId],
  );

  const row = result.rows[0];
  if (!row) return;

  const totalSuggested = row.budget_result?.totalSuggested;
  const discountFinal = row.budget_result?.discount?.finalTotal;
  const finalTotal = typeof discountFinal === "number" ? discountFinal : totalSuggested;

  const subject = `Orcamento aceito (${formatBudgetCode(params.budgetId)}) - ${row.user_name || row.user_email}`;

  const text = [
    `Orcamento aceito: ${formatBudgetCode(params.budgetId)}`,
    "",
    "Contato do cliente:",
    `Nome: ${row.user_name || "-"}`,
    `Email: ${row.user_email || "-"}`,
    `CPF: ${row.user_cpf || "-"}`,
    `Telefone: ${row.user_phone || "-"}`,
    `Endereco: ${row.user_address || "-"}`,
    `Numero: ${row.user_address_number || "-"}`,
    `Data de nascimento: ${formatDateBR(row.user_birth_date)}`,
    "",
    `Total sugerido: ${formatMoney(totalSuggested)}`,
    `Total final: ${formatMoney(finalTotal)}`,
    "",
    "Observacao: o cliente aceitou o orcamento no sistema.",
  ].join("\n");

  const answersHtml = renderAnswersTable(row.budget_answers || {});

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; background:#f3f4f6; padding: 24px;">
      <div style="max-width: 720px; margin: 0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
        <div style="padding: 18px 20px; background:#111827; color:#ffffff;">
          <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; opacity:.9;">Engenheiro Platform</div>
          <div style="font-size:20px; font-weight:800; margin-top:6px;">Orcamento aceito</div>
          <div style="margin-top:4px; font-size:14px; opacity:.9;">ID do orcamento: <strong>${escapeHtml(formatBudgetCode(params.budgetId))}</strong></div>
        </div>

        <div style="padding: 18px 20px;">
          <h3 style="margin: 0 0 10px; font-size:16px; color:#111827;">Resumo</h3>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div style="padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
              <div style="font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.04em;">Valor do orcamento</div>
              <div style="font-size:18px; font-weight:800; color:#111827; margin-top:4px;">${escapeHtml(formatMoney(finalTotal))}</div>
              <div style="font-size:13px; color:#6b7280; margin-top:4px;">Total sugerido: ${escapeHtml(formatMoney(totalSuggested))}</div>
            </div>
            <div style="padding:12px; border:1px solid #e5e7eb; border-radius:12px;">
              <div style="font-size:12px; color:#6b7280; text-transform:uppercase; letter-spacing:.04em;">Perfil</div>
              <div style="font-size:16px; font-weight:800; color:#111827; margin-top:4px;">${escapeHtml(row.budget_profile || "-")}</div>
              <div style="font-size:13px; color:#6b7280; margin-top:4px;">Criado em: ${escapeHtml(formatDateBR(row.budget_created_at))}</div>
            </div>
          </div>

          <h3 style="margin: 18px 0 10px; font-size:16px; color:#111827;">Informacoes do orcamento</h3>
          ${answersHtml}

          <h3 style="margin: 18px 0 10px; font-size:16px; color:#111827;">Dados cruciais do usuario</h3>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            <tbody>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151; width: 220px;">ID do orcamento</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatBudgetCode(params.budgetId))}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Nome completo</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_name || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Data de nascimento</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatDateBR(row.user_birth_date))}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Valor do orcamento</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatMoney(finalTotal))}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Telefone</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_phone || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Endereco</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_address || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Numero</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_address_number || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">CPF</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_cpf || "-")}</td></tr>
            </tbody>
          </table>

          <p style="margin: 16px 0 0; color:#6b7280; font-size:13px;">O cliente aceitou o orcamento no sistema. Use os dados acima para contato e continuidade do atendimento.</p>
        </div>
      </div>
    </div>
  `.trim();

  try {
    await sendEmail({
      toEmail: adminEmail,
      toName: "Administrador",
      subject,
      text,
      html,
    });
  } catch (err) {
    // Do not fail the request if Mailjet is not configured or is down.
    console.warn("Failed to notify admin about accepted budget:", err);
  }
}
