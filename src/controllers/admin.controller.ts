import { Request, Response } from "express";
import { pool } from "../config/database";
import { sendEmail } from "../services/email";
import { notifyAdminBudgetAccepted } from "../services/admin-budget-notify";

const defaultContent = {
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
      { title: "Experiencia solida", text: "Mais de 10 anos entregando projetos estruturais com foco em seguranca e viabilidade." },
      { title: "Obras acompanhadas", text: "Gestao tecnica rigorosa, reduzindo retrabalho e custos inesperados." },
      { title: "Atuacao consultiva", text: "Diagnosticos objetivos para tomada de decisao rapida e segura." },
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

function clampOpacity(value: unknown) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return defaultContent.services.backgroundOpacity;
  }
  return Math.min(1, Math.max(0, num));
}

function normalizeContent(input: unknown) {
  if (!input || typeof input !== "object") {
    return defaultContent;
  }

  const rawServices = (input as any).services || {};

  return {
    hero: { ...defaultContent.hero, ...(input as any).hero },
    about: {
      ...defaultContent.about,
      ...(input as any).about,
      cards: Array.isArray((input as any).about?.cards) ? (input as any).about.cards : defaultContent.about.cards,
    },
    services: {
      ...defaultContent.services,
      ...rawServices,
      backgroundOpacity: clampOpacity(rawServices.backgroundOpacity),
      cards: Array.isArray(rawServices.cards) ? rawServices.cards : defaultContent.services.cards,
    },
    blog: {
      ...defaultContent.blog,
      ...(input as any).blog,
      videos: Array.isArray((input as any).blog?.videos) ? (input as any).blog.videos : defaultContent.blog.videos,
    },
    contacts: { ...defaultContent.contacts, ...(input as any).contacts },
  };
}

export async function getLandingSettings(_req: Request, res: Response): Promise<Response> {
  const result = await pool.query("SELECT content FROM landing_settings WHERE id = 1");
  const content = result.rows[0]?.content || {};
  return res.status(200).json(normalizeContent(content));
}

export async function updateLandingSettings(req: Request, res: Response): Promise<Response> {
  const normalized = normalizeContent(req.body);

  await pool.query("UPDATE landing_settings SET content = $1 WHERE id = 1", [normalized]);
  return res.status(200).json(normalized);
}

export async function searchUsers(req: Request, res: Response): Promise<Response> {
  const query = String(req.query.query || "").trim().toLowerCase();

  if (!query) {
    return res.status(200).json([]);
  }

  const isEmail = query.includes("@");
  const sql = `
    SELECT u.id, u.name, u.email, u.cpf, u.phone, u.role, u.contract_active,
           d.percent AS discount_percent, d.starts_at AS discount_starts_at, d.ends_at AS discount_ends_at
    FROM users u
    LEFT JOIN user_discounts d ON d.user_id = u.id
  `;

  const users = await pool.query(
    isEmail
      ? `${sql} WHERE u.email ILIKE $1 LIMIT 20`
      : `${sql} WHERE u.cpf = $1 LIMIT 20`,
    [isEmail ? `%${query}%` : query],
  );

  return res.status(200).json(users.rows);
}

export async function updateContractStatus(req: Request, res: Response): Promise<Response> {
  const userId = Number(req.params.userId);
  const { active } = req.body;

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  await pool.query("UPDATE users SET contract_active = $1 WHERE id = $2", [Boolean(active), userId]);
  return res.status(200).json({ success: true });
}

export async function listBudgets(req: Request, res: Response): Promise<Response> {
  const query = String(req.query.query || "").trim().toLowerCase();

  const limitRaw = Number(req.query.limit || 100);
  const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 100;

  const base = `
    SELECT
      b.id,
      b.profile,
      b.answers,
      b.result,
      b.accepted,
      b.created_at,
      u.id AS user_id,
      u.name AS user_name,
      u.email AS user_email,
      u.cpf AS user_cpf,
      u.phone AS user_phone,
      u.address AS user_address,
      u.address_number AS user_address_number
    FROM budgets b
    JOIN users u ON u.id = b.user_id
  `;

  if (!query) {
    const result = await pool.query(`${base} ORDER BY b.created_at DESC LIMIT $1`, [limit]);
    return res.status(200).json(result.rows);
  }

  const budgetIdFromQuery = (() => {
    // Allow searching by numeric id (e.g. "123") or formatted code (e.g. "BUD-000123").
    const cleaned = query.replace(/^bud-/, "");
    if (!/^\d+$/.test(cleaned)) return null;
    const num = Number(cleaned);
    return Number.isInteger(num) ? num : null;
  })();

  if (budgetIdFromQuery !== null) {
    const result = await pool.query(
      `${base} WHERE b.id = $1 ORDER BY b.created_at DESC LIMIT $2`,
      [budgetIdFromQuery, limit],
    );
    return res.status(200).json(result.rows);
  }

  const isEmail = query.includes("@");
  const isCpf = /^\d{11}$/.test(query);

  if (isEmail) {
    const result = await pool.query(
      `${base} WHERE u.email ILIKE $1 ORDER BY b.created_at DESC LIMIT $2`,
      [`%${query}%`, limit],
    );
    return res.status(200).json(result.rows);
  }

  if (isCpf) {
    const result = await pool.query(
      `${base} WHERE u.cpf = $1 ORDER BY b.created_at DESC LIMIT $2`,
      [query, limit],
    );
    return res.status(200).json(result.rows);
  }

  const result = await pool.query(
    `${base} WHERE u.name ILIKE $1 ORDER BY b.created_at DESC LIMIT $2`,
    [`%${query}%`, limit],
  );
  return res.status(200).json(result.rows);
}

export async function getBudgetSettings(_req: Request, res: Response): Promise<Response> {
  const result = await pool.query("SELECT content FROM budget_settings WHERE id = 1");
  const content = result.rows[0]?.content || {};
  return res.status(200).json({ content, effective: getEffectiveBudgetConfig(content) });
}

export async function updateBudgetSettings(req: Request, res: Response): Promise<Response> {
  const content = req.body && typeof req.body === "object" ? req.body : {};
  await pool.query("UPDATE budget_settings SET content = $1 WHERE id = 1", [content]);
  return res.status(200).json({ content, effective: getEffectiveBudgetConfig(content) });
}

function mergeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function getEffectiveBudgetConfig(content: any) {
  const defaults = {
    basePrices: {
      estrutural: 13.5,
      hidraulico: 3.85,
      sanitario: 2.78,
      pluvial: 0.9,
      eletrico: 6.8,
      incendio: 2.9,
      pacoteHSP: 6.777,
      pacoteCompleto: 25.047,
    },
    factors: {
      boilerEletrico: 1.04,
      pocoArtesiano: 1.04,
      concessionariaPadraoEspecial: 0.99,
      fossaSeptica: 1.1,
      drenagemEspecifica: 1.1,
      banheira: 1.04,
      equipamentoEspecial: 1.05,
      gerador: 1.2,
      subestacao: 8.5,
      normaCondominio: 1.01,
      aquecimentoSolar: 1.02,
      spa: 1.04,
    },
    areaFactors: [
      { min: 0, max: 120, estrutural: 1.15, complementares: 1.12 },
      { min: 121, max: 200, estrutural: 1, complementares: 1 },
      { min: 201, max: 300, estrutural: 0.95, complementares: 0.96 },
      { min: 301, max: 450, estrutural: 0.9, complementares: 0.92 },
      { min: 451, max: 600, estrutural: 0.86, complementares: 0.89 },
      { min: 601, max: 99999, estrutural: 0.82, complementares: 0.86 },
    ],
  };

  const calc = content?.calculation || {};
  const basePrices = { ...defaults.basePrices } as any;
  const factors = { ...defaults.factors } as any;

  if (calc.basePrices && typeof calc.basePrices === "object") {
    Object.keys(defaults.basePrices).forEach((key) => {
      basePrices[key] = mergeNumber(calc.basePrices[key], (defaults.basePrices as any)[key]);
    });
  }

  if (calc.factors && typeof calc.factors === "object") {
    Object.keys(defaults.factors).forEach((key) => {
      factors[key] = mergeNumber(calc.factors[key], (defaults.factors as any)[key]);
    });
  }

  const areaFactorsRaw = Array.isArray(calc.areaFactors) ? calc.areaFactors : defaults.areaFactors;
  const areaFactors = (Array.isArray(areaFactorsRaw) ? areaFactorsRaw : defaults.areaFactors).map((row: any) => ({
    min: mergeNumber(row?.min, 0),
    max: mergeNumber(row?.max, 99999),
    estrutural: mergeNumber(row?.estrutural, 1),
    complementares: mergeNumber(row?.complementares, 1),
  }));

  return { basePrices, factors, areaFactors };
}

function parseDateTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export async function updateUserDiscount(req: Request, res: Response): Promise<Response> {
  const userId = Number(req.params.userId);
  const { percent, startsAt, endsAt } = req.body || {};

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: "Invalid user id." });
  }

  if (percent === null || percent === undefined || percent === "") {
    await pool.query("DELETE FROM user_discounts WHERE user_id = $1", [userId]);
    return res.status(200).json({ success: true });
  }

  const pct = Number(percent);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return res.status(400).json({ message: "Percent must be between 0 and 100." });
  }

  const startIso = parseDateTime(startsAt);
  const endIso = parseDateTime(endsAt);
  if ((startsAt && !startIso) || (endsAt && !endIso)) {
    return res.status(400).json({ message: "Invalid start/end date." });
  }

  await pool.query(
    `
      INSERT INTO user_discounts (user_id, percent, starts_at, ends_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id)
      DO UPDATE SET percent = EXCLUDED.percent, starts_at = EXCLUDED.starts_at, ends_at = EXCLUDED.ends_at
    `,
    [userId, pct, startIso, endIso],
  );

  return res.status(200).json({ success: true });
}

function getAdminNotifyEmail(): string | null {
  const value = String(process.env.ADMIN_NOTIFY_EMAIL || "").trim();
  return value ? value : null;
}

export async function testAdminEmail(req: Request, res: Response): Promise<Response> {
  const adminEmail = getAdminNotifyEmail();
  const toEmail = String(req.body?.toEmail || adminEmail || "").trim();
  const subject = String(req.body?.subject || "Teste de e-mail (Engenheiro Platform)").trim();
  const text = String(req.body?.text || "Teste de envio via Mailjet.").trim();

  if (!toEmail) {
    return res.status(400).json({ message: "Missing toEmail (or set ADMIN_NOTIFY_EMAIL)." });
  }

  try {
    await sendEmail({
      toEmail,
      subject,
      text,
      html: `<p>${text}</p>`,
    });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({
      message: "Failed to send email.",
      error: err?.message || String(err),
    });
  }
}

export async function resendBudgetAcceptedEmail(req: Request, res: Response): Promise<Response> {
  const budgetId = Number(req.params.budgetId);
  if (!Number.isInteger(budgetId)) {
    return res.status(400).json({ message: "Invalid budget id." });
  }

  const result = await pool.query("SELECT user_id FROM budgets WHERE id = $1 LIMIT 1", [budgetId]);
  const userId = result.rows[0]?.user_id;
  if (!userId) {
    return res.status(404).json({ message: "Budget not found." });
  }

  try {
    await notifyAdminBudgetAccepted({ budgetId, userId });
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({
      message: "Failed to notify admin.",
      error: err?.message || String(err),
    });
  }
}
