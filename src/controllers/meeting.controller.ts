import { Request, Response } from "express";
import { pool } from "../config/database";
import { notifyAdminMeetingBooked } from "../services/admin-meeting-notify";

const slotMinutes = 30;
const saoPauloOffset = "-03:00";

function isDateOnly(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string): boolean {
  return /^\d{2}:\d{2}$/.test(value);
}

function timeToMinutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function isHalfHour(value: string): boolean {
  const minute = Number(value.split(":")[1]);
  return minute === 0 || minute === 30;
}

function minutesToTime(value: number): string {
  const hour = Math.floor(value / 60);
  const minute = value % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toSaoPauloDate(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${saoPauloOffset}`);
}

function formatDateOnly(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeTime(value: unknown): string {
  return String(value || "").slice(0, 5);
}

function dateInSaoPaulo(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function listDatesBetween(from: string, to: string): string[] {
  const dates = [];
  const current = new Date(`${from}T12:00:00${saoPauloOffset}`);
  const end = new Date(`${to}T12:00:00${saoPauloOffset}`);
  while (current.getTime() <= end.getTime()) {
    dates.push(dateInSaoPaulo(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function weekdayFromDate(date: string): number {
  return toSaoPauloDate(date, "12:00").getUTCDay();
}

function isTimeBlocked(startMin: number, ruleStart: string, ruleEnd: string): boolean {
  const blockStart = timeToMinutes(ruleStart);
  const blockEnd = timeToMinutes(ruleEnd);

  if (blockStart === blockEnd) return true;
  if (blockStart < blockEnd) {
    return startMin >= blockStart && startMin < blockEnd;
  }
  return startMin >= blockStart || startMin < blockEnd;
}

async function getBlockRules(): Promise<any[]> {
  const result = await pool.query(
    `
      SELECT id, label, block_type, to_char(block_date, 'YYYY-MM-DD') AS block_date,
             to_char(end_date, 'YYYY-MM-DD') AS end_date, weekday, start_time::text, end_time::text,
             persistent, annual, created_at
      FROM meeting_block_rules
      ORDER BY created_at DESC
    `,
  );
  return result.rows;
}

function workHoursForDate(date: string, rules: any[]): any[] {
  const weekday = weekdayFromDate(date);
  return rules.filter((rule) => {
    if (rule.block_type !== "work_hours") return false;
    return rule.weekday === null || rule.weekday === undefined || Number(rule.weekday) === weekday;
  });
}

function hasDayBlock(date: string, rules: any[]): boolean {
  const weekday = weekdayFromDate(date);
  return rules.some((rule) => {
    if (rule.block_type === "date") return rule.block_date === date;
    if (rule.block_type === "weekday") return Number(rule.weekday) === weekday;
    if (rule.block_type === "holiday") {
      return rule.annual ? String(rule.block_date).slice(5) === date.slice(5) : rule.block_date === date;
    }
    if (rule.block_type === "vacation") return date >= rule.block_date && date <= rule.end_date;
    return false;
  });
}

function hasTimeBlock(date: string, startTime: string, rules: any[]): boolean {
  const weekday = weekdayFromDate(date);
  const startMin = timeToMinutes(startTime);
  return rules.some((rule) => {
    if (rule.block_type === "period") {
      return rule.block_date === date && isTimeBlocked(startMin, normalizeTime(rule.start_time), normalizeTime(rule.end_time));
    }
    if (rule.block_type === "lunch") {
      return workHoursForDate(date, rules).length > 0
        && isTimeBlocked(startMin, normalizeTime(rule.start_time), normalizeTime(rule.end_time));
    }
    if (rule.block_type !== "time_range") return false;
    const appliesToDay = rule.weekday === null || rule.weekday === undefined || Number(rule.weekday) === weekday;
    if (!appliesToDay) return false;
    return isTimeBlocked(startMin, normalizeTime(rule.start_time), normalizeTime(rule.end_time));
  });
}

async function getBookedStartSet(from: string, to: string): Promise<Set<string>> {
  const result = await pool.query(
    `
      SELECT starts_at
      FROM meeting_bookings
      WHERE status = 'scheduled'
        AND starts_at >= $1
        AND starts_at < $2
    `,
    [`${from}T00:00:00${saoPauloOffset}`, `${to}T23:59:59${saoPauloOffset}`],
  );

  return new Set(
    result.rows.map((row) => new Date(row.starts_at).toISOString()),
  );
}

export async function createAvailability(req: Request, res: Response): Promise<Response> {
  const { date, startTime, endTime } = req.body || {};
  const meetingDate = String(date || "").trim();
  const start = String(startTime || "").trim();
  const end = String(endTime || "").trim();

  if (!isDateOnly(meetingDate) || !isTime(start) || !isTime(end)) {
    return res.status(400).json({ message: "Informe date, startTime e endTime validos." });
  }

  if (!isHalfHour(start) || !isHalfHour(end)) {
    return res.status(400).json({ message: "Use horarios fechados em blocos de 30 minutos." });
  }

  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (endMin <= startMin || endMin - startMin < slotMinutes) {
    return res.status(400).json({ message: "O periodo deve ter pelo menos 30 minutos." });
  }

  const result = await pool.query(
    `
      INSERT INTO meeting_availability (meeting_date, start_time, end_time)
      VALUES ($1, $2, $3)
      RETURNING id, meeting_date, start_time, end_time, created_at
    `,
    [meetingDate, start, end],
  );

  return res.status(201).json(result.rows[0]);
}

export async function listAvailability(req: Request, res: Response): Promise<Response> {
  const from = String(req.query.from || new Date().toISOString().slice(0, 10));
  const to = String(req.query.to || from);

  const result = await pool.query(
    `
      SELECT id, to_char(meeting_date, 'YYYY-MM-DD') AS meeting_date, start_time::text, end_time::text, created_at
      FROM meeting_availability
      WHERE meeting_date BETWEEN $1 AND $2
      ORDER BY meeting_date, start_time
    `,
    [from, to],
  );

  return res.status(200).json(result.rows);
}

export async function createBlockRule(req: Request, res: Response): Promise<Response> {
  const label = String(req.body?.label || "").trim();
  const blockType = String(req.body?.blockType || "").trim();
  const blockDate = req.body?.blockDate ? String(req.body.blockDate).trim() : null;
  const endDate = req.body?.endDate ? String(req.body.endDate).trim() : null;
  const weekday = req.body?.weekday === "" || req.body?.weekday === undefined || req.body?.weekday === null
    ? null
    : Number(req.body.weekday);
  const startTime = req.body?.startTime ? String(req.body.startTime).trim() : null;
  const endTime = req.body?.endTime ? String(req.body.endTime).trim() : null;
  const persistent = req.body?.persistent === undefined ? true : Boolean(req.body.persistent);
  const annual = Boolean(req.body?.annual);

  if (!label) {
    return res.status(400).json({ message: "Informe um nome para o bloqueio." });
  }

  if (!["date", "weekday", "time_range", "work_hours", "period", "holiday", "vacation", "lunch"].includes(blockType)) {
    return res.status(400).json({ message: "Tipo de bloqueio invalido." });
  }

  if (["date", "period", "holiday", "vacation"].includes(blockType) && (!blockDate || !isDateOnly(blockDate))) {
    return res.status(400).json({ message: "Informe uma data valida." });
  }

  if (blockType === "vacation" && (!endDate || !isDateOnly(endDate) || endDate < String(blockDate))) {
    return res.status(400).json({ message: "Informe um periodo de ferias valido." });
  }

  if ((blockType === "weekday" || weekday !== null) && (weekday === null || !Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
    return res.status(400).json({ message: "Dia da semana invalido." });
  }

  if (["time_range", "work_hours", "period", "lunch"].includes(blockType)) {
    if (!startTime || !endTime || !isTime(startTime) || !isTime(endTime)) {
      return res.status(400).json({ message: "Informe horario inicial e final validos." });
    }
    if (!isHalfHour(startTime) || !isHalfHour(endTime)) {
      return res.status(400).json({ message: "Use horarios em blocos de 30 minutos." });
    }
    if (["work_hours", "period", "lunch"].includes(blockType) && timeToMinutes(endTime) <= timeToMinutes(startTime)) {
      return res.status(400).json({ message: "O horario final deve ser posterior ao inicial." });
    }
  }

  const result = await pool.query(
    `
      INSERT INTO meeting_block_rules (label, block_type, block_date, end_date, weekday, start_time, end_time, persistent, annual)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, label, block_type, to_char(block_date, 'YYYY-MM-DD') AS block_date,
                to_char(end_date, 'YYYY-MM-DD') AS end_date, weekday, start_time::text, end_time::text,
                persistent, annual, created_at
    `,
    [
      label,
      blockType,
      ["date", "period", "holiday", "vacation"].includes(blockType) ? blockDate : null,
      blockType === "vacation" ? endDate : null,
      blockType === "weekday" || blockType === "time_range" || blockType === "work_hours" ? weekday : null,
      ["time_range", "work_hours", "period", "lunch"].includes(blockType) ? startTime : null,
      ["time_range", "work_hours", "period", "lunch"].includes(blockType) ? endTime : null,
      persistent,
      blockType === "holiday" ? annual : false,
    ],
  );

  return res.status(201).json(result.rows[0]);
}

export async function saveWorkSchedule(req: Request, res: Response): Promise<Response> {
  const label = String(req.body?.label || "Horario de trabalho").trim();
  const requestedWeekdays: unknown[] = Array.isArray(req.body?.weekdays) ? req.body.weekdays : [];
  const weekdays: number[] = requestedWeekdays.length
    ? [...new Set(requestedWeekdays.map((day) => Number(day)))].filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : [];
  const startTime = String(req.body?.startTime || "").trim();
  const endTime = String(req.body?.endTime || "").trim();

  if (!weekdays.length) {
    return res.status(400).json({ message: "Selecione pelo menos um dia disponivel." });
  }
  if (!isTime(startTime) || !isTime(endTime) || !isHalfHour(startTime) || !isHalfHour(endTime)) {
    return res.status(400).json({ message: "Use horarios validos em intervalos de 30 minutos." });
  }
  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return res.status(400).json({ message: "O horario final deve ser posterior ao inicial." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM meeting_block_rules WHERE block_type = 'work_hours' AND weekday = ANY($1::int[])", [weekdays]);
    for (const weekday of weekdays) {
      await client.query(
        `INSERT INTO meeting_block_rules (label, block_type, weekday, start_time, end_time, persistent)
         VALUES ($1, 'work_hours', $2, $3, $4, TRUE)`,
        [label || "Horario de trabalho", weekday, startTime, endTime],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return res.status(200).json({ success: true });
}

export async function listBlockRules(_req: Request, res: Response): Promise<Response> {
  return res.status(200).json(await getBlockRules());
}

export async function deleteBlockRule(req: Request, res: Response): Promise<Response> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid block rule id." });
  }

  const result = await pool.query("DELETE FROM meeting_block_rules WHERE id = $1 RETURNING id", [id]);
  if (!result.rows.length) {
    return res.status(404).json({ message: "Block rule not found." });
  }

  return res.status(200).json({ success: true });
}

export async function deleteAvailability(req: Request, res: Response): Promise<Response> {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "Invalid availability id." });
  }

  const result = await pool.query("DELETE FROM meeting_availability WHERE id = $1 RETURNING id", [id]);
  if (!result.rows.length) {
    return res.status(404).json({ message: "Availability not found." });
  }

  return res.status(200).json({ success: true });
}

export async function listMeetingBookings(_req: Request, res: Response): Promise<Response> {
  const result = await pool.query(
    `
      SELECT
        mb.id,
        mb.budget_id,
        mb.starts_at,
        mb.ends_at,
        mb.status,
        mb.created_at,
        u.name AS user_name,
        u.email AS user_email,
        u.cpf AS user_cpf,
        u.phone AS user_phone
      FROM meeting_bookings mb
      JOIN users u ON u.id = mb.user_id
      WHERE mb.status = 'scheduled'
      ORDER BY mb.starts_at DESC
      LIMIT 100
    `,
  );

  return res.status(200).json(result.rows);
}

export async function listMyMeetingBookings(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized." });

  const result = await pool.query(
    `
      SELECT id, budget_id, starts_at, ends_at, status, created_at
      FROM meeting_bookings
      WHERE user_id = $1 AND status = 'scheduled' AND budget_id IS NOT NULL
      ORDER BY starts_at
    `,
    [userId],
  );
  return res.status(200).json(result.rows);
}

export async function listAvailableSlots(req: Request, res: Response): Promise<Response> {
  const today = new Date().toISOString().slice(0, 10);
  const from = String(req.query.from || today);
  const to = String(req.query.to || from);

  if (!isDateOnly(from) || !isDateOnly(to)) {
    return res.status(400).json({ message: "Datas invalidas." });
  }

  const availability = await pool.query(
    `
      SELECT id, to_char(meeting_date, 'YYYY-MM-DD') AS meeting_date, start_time::text, end_time::text
      FROM meeting_availability
      WHERE meeting_date BETWEEN $1 AND $2
      ORDER BY meeting_date, start_time
    `,
    [from, to],
  );

  const booked = await getBookedStartSet(from, to);
  const rules = await getBlockRules();
  const slotMap = new Map<string, any>();

  const addSlots = (date: string, start: string, end: string, availabilityId: number | null) => {
    if (hasDayBlock(date, rules)) return;
    const startMin = timeToMinutes(normalizeTime(start));
    const endMin = timeToMinutes(normalizeTime(end));

    for (let current = startMin; current + slotMinutes <= endMin; current += slotMinutes) {
      const startTime = minutesToTime(current);
      const endTime = minutesToTime(current + slotMinutes);
      const startsAt = toSaoPauloDate(date, startTime);
      const key = startsAt.toISOString();

      if (!booked.has(key) && !hasTimeBlock(date, startTime, rules) && startsAt.getTime() > Date.now()) {
        slotMap.set(key, {
          availabilityId,
          date,
          startTime,
          endTime,
          startsAt: key,
          endsAt: toSaoPauloDate(date, endTime).toISOString(),
        });
      }
    }
  };

  for (const date of listDatesBetween(from, to)) {
    workHoursForDate(date, rules).forEach((rule) => addSlots(date, normalizeTime(rule.start_time), normalizeTime(rule.end_time), null));
  }

  for (const item of availability.rows) {
    const date = formatDateOnly(item.meeting_date);
    addSlots(date, normalizeTime(item.start_time), normalizeTime(item.end_time), item.id);
  }

  return res.status(200).json(Array.from(slotMap.values()).sort((a, b) => String(a.startsAt).localeCompare(String(b.startsAt))));
}

export async function getAdminCalendar(req: Request, res: Response): Promise<Response> {
  const month = String(req.query.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: "Informe month no formato YYYY-MM." });
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const from = `${month}-01`;
  const to = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const availability = await pool.query(
    `
      SELECT to_char(meeting_date, 'YYYY-MM-DD') AS meeting_date, COUNT(*)::int AS count
      FROM meeting_availability
      WHERE meeting_date BETWEEN $1 AND $2
      GROUP BY meeting_date
    `,
    [from, to],
  );

  const bookings = await pool.query(
    `
      SELECT to_char(starts_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') AS meeting_date, COUNT(*)::int AS count
      FROM meeting_bookings
      WHERE status = 'scheduled'
        AND starts_at >= $1
        AND starts_at < $2
      GROUP BY to_char(starts_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD')
    `,
    [`${from}T00:00:00${saoPauloOffset}`, `${to}T23:59:59${saoPauloOffset}`],
  );

  const rules = await getBlockRules();
  const availabilityMap = new Map(availability.rows.map((row) => [row.meeting_date, Number(row.count)]));
  const bookingMap = new Map(bookings.rows.map((row) => [row.meeting_date, Number(row.count)]));

  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${month}-${String(index + 1).padStart(2, "0")}`;
    const hasAvailability = (availabilityMap.get(date) || 0) > 0 || workHoursForDate(date, rules).length > 0;
    const hasBooking = (bookingMap.get(date) || 0) > 0;
    const blockedByRule = hasDayBlock(date, rules);
    return {
      date,
      day: index + 1,
      hasAvailability,
      hasBooking,
      blocked: blockedByRule || !hasAvailability,
    };
  });

  return res.status(200).json({ month, days });
}

export async function getAdminDaySchedule(req: Request, res: Response): Promise<Response> {
  const date = String(req.query.date || "").trim();
  if (!isDateOnly(date)) {
    return res.status(400).json({ message: "Data invalida." });
  }

  const availability = await pool.query(
    `
      SELECT id, start_time::text, end_time::text
      FROM meeting_availability
      WHERE meeting_date = $1
      ORDER BY start_time
    `,
    [date],
  );

  const bookings = await pool.query(
    `
      SELECT mb.id, mb.starts_at, mb.ends_at, u.name AS user_name, u.email AS user_email
      FROM meeting_bookings mb
      JOIN users u ON u.id = mb.user_id
      WHERE mb.status = 'scheduled'
        AND mb.starts_at >= $1
        AND mb.starts_at < $2
      ORDER BY mb.starts_at
    `,
    [`${date}T00:00:00${saoPauloOffset}`, `${date}T23:59:59${saoPauloOffset}`],
  );

  const rules = await getBlockRules();
  const dayBlocked = hasDayBlock(date, rules);
  const workHours = workHoursForDate(date, rules);
  const bookedMap = new Map(bookings.rows.map((booking) => [new Date(booking.starts_at).toISOString(), booking]));
  const blocks = [];

  for (let current = 0; current < 24 * 60; current += slotMinutes) {
    const startTime = minutesToTime(current);
    const endTime = minutesToTime(current + slotMinutes);
    const startsAt = toSaoPauloDate(date, startTime);
    const booked = bookedMap.get(startsAt.toISOString());
    const inExplicitAvailability = availability.rows.some((item) => {
      const startMin = timeToMinutes(normalizeTime(item.start_time));
      const endMin = timeToMinutes(normalizeTime(item.end_time));
      return current >= startMin && current + slotMinutes <= endMin;
    });
    const inWorkHours = workHours.some((rule) => {
      const startMin = timeToMinutes(normalizeTime(rule.start_time));
      const endMin = timeToMinutes(normalizeTime(rule.end_time));
      return current >= startMin && current + slotMinutes <= endMin;
    });
    const timeBlocked = hasTimeBlock(date, startTime, rules);

    blocks.push({
      startTime,
      endTime,
      status: booked ? "booked" : dayBlocked || timeBlocked || (!inExplicitAvailability && !inWorkHours) ? "blocked" : "available",
      booking: booked
        ? {
            id: booked.id,
            userName: booked.user_name,
            userEmail: booked.user_email,
          }
        : null,
    });
  }

  return res.status(200).json({ date, blocks });
}

export async function bookMeeting(req: Request, res: Response): Promise<Response> {
  const userId = req.user?.id;
  const startsAtRaw = String(req.body?.startsAt || "").trim();
  const budgetId = Number(req.body?.budgetId);
  const reschedule = req.body?.reschedule === true;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized." });
  }

  if (!Number.isInteger(budgetId)) {
    return res.status(400).json({ message: "Selecione um contrato ativo para agendar a reuniao." });
  }

  const activeContract = await pool.query(
    `SELECT id FROM budgets
     WHERE id = $1 AND user_id = $2 AND accepted = TRUE AND contract_active = TRUE
     LIMIT 1`,
    [budgetId, userId],
  );
  if (!activeContract.rows.length) {
    return res.status(403).json({ message: "A reuniao so pode ser agendada para um contrato ativo do usuario." });
  }

  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() <= Date.now()) {
    return res.status(400).json({ message: "Horario invalido." });
  }

  const endsAt = new Date(startsAt.getTime() + slotMinutes * 60 * 1000);
  const date = dateInSaoPaulo(startsAt);
  const [year, month, day] = date.split("-");
  const dateLabel = `${day}/${month}/${year}`;
  const time = startsAt.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const availability = await pool.query(
    `
      SELECT id
      FROM meeting_availability
      WHERE meeting_date = $1
        AND start_time <= $2::time
        AND end_time >= ($2::time + INTERVAL '30 minutes')
      ORDER BY start_time
      LIMIT 1
    `,
    [date, time],
  );

  const rules = await getBlockRules();
  const workHours = workHoursForDate(date, rules);
  const inWorkHours = workHours.some((rule) => {
    const startMin = timeToMinutes(time);
    const workStart = timeToMinutes(normalizeTime(rule.start_time));
    const workEnd = timeToMinutes(normalizeTime(rule.end_time));
    return startMin >= workStart && startMin + slotMinutes <= workEnd;
  });

  if (!availability.rows.length && !inWorkHours) {
    return res.status(400).json({ message: "Horario nao esta disponivel." });
  }

  if (hasDayBlock(date, rules) || hasTimeBlock(date, time, rules)) {
    return res.status(400).json({ message: "Horario esta bloqueado pelo administrador." });
  }

  const client = await pool.connect();
  let booking: any;
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [budgetId]);
    const contractCheck = await client.query(
      `SELECT id FROM budgets
       WHERE id = $1 AND user_id = $2 AND accepted = TRUE AND contract_active = TRUE
       FOR UPDATE`,
      [budgetId, userId],
    );
    if (!contractCheck.rows.length) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "O contrato nao esta mais ativo." });
    }

    const currentBooking = await client.query(
      `SELECT id, starts_at FROM meeting_bookings
       WHERE budget_id = $1 AND status = 'scheduled'
       LIMIT 1 FOR UPDATE`,
      [budgetId],
    );
    const existing = currentBooking.rows[0];
    if (existing && !reschedule) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        code: "MEETING_ALREADY_BOOKED",
        message: "Este contrato ja possui uma reuniao. Use a opcao de remarcar.",
      });
    }
    if (!existing && reschedule) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Nenhuma reuniao encontrada para remarcar neste contrato." });
    }
    if (existing && new Date(existing.starts_at).toISOString() === startsAt.toISOString()) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "O novo horario deve ser diferente da reuniao atual." });
    }

    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [startsAt.toISOString()]);
    const conflict = await client.query(
      `SELECT id FROM meeting_bookings
       WHERE status = 'scheduled' AND starts_at = $1
         AND ($2::int IS NULL OR id <> $2)
       LIMIT 1`,
      [startsAt.toISOString(), existing?.id || null],
    );
    if (conflict.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Horario ja foi agendado." });
    }

    if (existing) {
      const updated = await client.query(
        `UPDATE meeting_bookings
         SET availability_id = $1, starts_at = $2, ends_at = $3
         WHERE id = $4
         RETURNING id, budget_id, starts_at, ends_at, status, created_at`,
        [availability.rows[0]?.id || null, startsAt.toISOString(), endsAt.toISOString(), existing.id],
      );
      booking = updated.rows[0];
      const timeline = await client.query(
        `UPDATE contract_timeline_items
         SET title = $1, description = $2, deadline = $3, status = 'pendente', updated_at = NOW()
         WHERE meeting_booking_id = $4
         RETURNING id`,
        [
          `Reuniao remarcada - ${dateLabel} ${time}`,
          "Reuniao de 30 minutos remarcada pelo cliente.",
          date,
          existing.id,
        ],
      );
      if (!timeline.rows.length) {
        const restoredTimeline = await client.query(
          `INSERT INTO contract_timeline_items
             (user_id, budget_id, meeting_booking_id, title, description, deadline, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'pendente') RETURNING id`,
          [userId, budgetId, existing.id, `Reuniao remarcada - ${dateLabel} ${time}`, "Reuniao de 30 minutos remarcada pelo cliente.", date],
        );
        booking.timelineItemId = restoredTimeline.rows[0].id;
      } else {
        booking.timelineItemId = timeline.rows[0].id;
      }
      booking.rescheduled = true;
      booking.previousStartsAt = existing.starts_at;
    } else {
      const created = await client.query(
        `INSERT INTO meeting_bookings (user_id, budget_id, availability_id, starts_at, ends_at, status)
         VALUES ($1, $2, $3, $4, $5, 'scheduled')
         RETURNING id, budget_id, starts_at, ends_at, status, created_at`,
        [userId, budgetId, availability.rows[0]?.id || null, startsAt.toISOString(), endsAt.toISOString()],
      );
      booking = created.rows[0];
      const timeline = await client.query(
        `INSERT INTO contract_timeline_items
           (user_id, budget_id, meeting_booking_id, title, description, deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'pendente') RETURNING id`,
        [userId, budgetId, booking.id, `Reuniao agendada - ${dateLabel} ${time}`, "Reuniao de 30 minutos agendada pelo cliente.", date],
      );
      booking.timelineItemId = timeline.rows[0].id;
      booking.rescheduled = false;
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  notifyAdminMeetingBooked({
    bookingId: booking.id,
    rescheduled: booking.rescheduled,
    previousStartsAt: booking.previousStartsAt,
  }).catch(() => {
    // best-effort
  });

  return res.status(booking.rescheduled ? 200 : 201).json(booking);
}
