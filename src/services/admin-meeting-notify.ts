import { pool } from "../config/database";
import { sendEmail } from "./email";

type NotifyMeetingBookedParams = {
  bookingId: number;
  rescheduled?: boolean;
  previousStartsAt?: unknown;
};

function getAdminNotifyEmail(): string | null {
  const value = String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
  return value ? value : null;
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

function formatDateTimeBR(value: unknown): string {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function notifyAdminMeetingBooked(params: NotifyMeetingBookedParams): Promise<void> {
  const adminEmail = getAdminNotifyEmail();
  if (!adminEmail) return;

  const result = await pool.query(
    `
      SELECT
        mb.id AS booking_id,
        mb.budget_id,
        mb.starts_at,
        mb.ends_at,
        u.name AS user_name,
        u.email AS user_email,
        u.cpf AS user_cpf,
        u.phone AS user_phone,
        u.address AS user_address,
        u.address_number AS user_address_number
      FROM meeting_bookings mb
      JOIN users u ON u.id = mb.user_id
      WHERE mb.id = $1
      LIMIT 1
    `,
    [params.bookingId],
  );

  const row = result.rows[0];
  if (!row) return;

  const eventTitle = params.rescheduled ? "Reuniao remarcada" : "Nova reuniao agendada";
  const subject = `${eventTitle} - ${row.user_name || row.user_email}`;
  const text = [
    `${eventTitle}.`,
    "",
    ...(params.rescheduled ? [`Horario anterior: ${formatDateTimeBR(params.previousStartsAt)}`] : []),
    `Inicio: ${formatDateTimeBR(row.starts_at)}`,
    `Fim: ${formatDateTimeBR(row.ends_at)}`,
    `Contrato: #${row.budget_id || "-"}`,
    "",
    `Nome: ${row.user_name || "-"}`,
    `Email: ${row.user_email || "-"}`,
    `CPF: ${row.user_cpf || "-"}`,
    `Telefone: ${row.user_phone || "-"}`,
    `Endereco: ${row.user_address || "-"}`,
    `Numero: ${row.user_address_number || "-"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; background:#f3f4f6; padding:24px;">
      <div style="max-width:680px; margin:0 auto; background:#fff; border:1px solid #e5e7eb; border-radius:16px; overflow:hidden;">
        <div style="padding:18px 20px; background:#111827; color:#fff;">
          <div style="font-size:12px; letter-spacing:.08em; text-transform:uppercase; opacity:.9;">Engenheiro Platform</div>
          <div style="font-size:20px; font-weight:800; margin-top:6px;">${escapeHtml(eventTitle)}</div>
        </div>
        <div style="padding:18px 20px;">
          <h3 style="margin:0 0 10px; color:#111827;">Horario</h3>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            <tbody>
              ${params.rescheduled ? `<tr><td style="padding:10px 12px; background:#f9fafb; color:#374151; width:180px;">Horario anterior</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatDateTimeBR(params.previousStartsAt))}</td></tr>` : ""}
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151; width:180px;">Inicio</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatDateTimeBR(row.starts_at))}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Fim</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(formatDateTimeBR(row.ends_at))}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Contrato</td><td style="padding:10px 12px; color:#111827; font-weight:700;">#${escapeHtml(row.budget_id || "-")}</td></tr>
            </tbody>
          </table>
          <h3 style="margin:18px 0 10px; color:#111827;">Cliente</h3>
          <table style="width:100%; border-collapse:collapse; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
            <tbody>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151; width:180px;">Nome</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_name || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Email</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_email || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">CPF</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_cpf || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Telefone</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_phone || "-")}</td></tr>
              <tr><td style="padding:10px 12px; background:#f9fafb; color:#374151;">Endereco</td><td style="padding:10px 12px; color:#111827; font-weight:700;">${escapeHtml(row.user_address || "-")}, ${escapeHtml(row.user_address_number || "-")}</td></tr>
            </tbody>
          </table>
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
    console.warn("Failed to notify admin about booked meeting:", err);
  }
}
