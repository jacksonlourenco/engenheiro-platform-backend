import { Request, Response } from "express";
import { pool } from "../config/database";

type YesNo = "SIM" | "NÃO";

type StructuralInput = {
  area: number;
  lajePiso: YesNo;
  lajeCobertura: YesNo;
  vaoMaior5: YesNo;
  vaoMaior8: YesNo;
  piscina: YesNo;
  balancoMaior1: YesNo;
  fundacaoRasaEspecial: YesNo;
  terrenoDeclive: YesNo;
  elevador: YesNo;
  muroArrimo: YesNo;
  memorialDescritivo: YesNo;
  memorialCalculo: YesNo;
};

type ComplementaryInput = {
  area: number;
  abastecimento: "CONCESSIONÁRIA" | "POÇO ARTESIANO";
  esgotamento: "REDE" | "FOSSA SÉPTICA";
  pluvial: "SOLO" | "DRENAGEM ESPECÍFICA";
  normaCondominio: YesNo;
  contratar: {
    hidraulico: YesNo;
    sanitario: YesNo;
    pluvial: YesNo;
    eletrico: YesNo;
    incendio: YesNo;
  };
  boilerEletrico: YesNo;
  banheira: YesNo;
  spa: YesNo;
  aquecimentoSolar: YesNo;
  arCondicionadoQtd: number;
  equipamentoEspecial: YesNo;
  gerador: YesNo;
  subestacao: YesNo;
  concessionariaPadraoEspecial: YesNo;
};

type BudgetRequest = {
  profile: "tecnico" | "leigo";
  structural: StructuralInput;
  complementary: ComplementaryInput;
};

const BASE_PRICES = {
  estrutural: 13.5,
  hidraulico: 3.85,
  sanitario: 2.78,
  pluvial: 0.9,
  eletrico: 6.8,
  incendio: 2.9,
  pacoteHSP: 6.777,
  pacoteCompleto: 25.047,
};

const AREA_FACTORS = [
  { min: 0, max: 120, estrutural: 1.15, complementares: 1.12 },
  { min: 121, max: 200, estrutural: 1, complementares: 1 },
  { min: 201, max: 300, estrutural: 0.95, complementares: 0.96 },
  { min: 301, max: 450, estrutural: 0.9, complementares: 0.92 },
  { min: 451, max: 600, estrutural: 0.86, complementares: 0.89 },
  { min: 601, max: 99999, estrutural: 0.82, complementares: 0.86 },
];

const FACTORS = {
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
};

type CalcConfig = {
  basePrices: typeof BASE_PRICES;
  areaFactors: typeof AREA_FACTORS;
  factors: typeof FACTORS;
};

function mergeNumber(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num;
}

function getEffectiveConfig(content: any): CalcConfig {
  const calc = content?.calculation || {};
  const basePrices = { ...BASE_PRICES } as any;
  const factors = { ...FACTORS } as any;
  const areaFactorsRaw = Array.isArray(calc.areaFactors) ? calc.areaFactors : AREA_FACTORS;

  if (calc.basePrices && typeof calc.basePrices === "object") {
    Object.keys(BASE_PRICES).forEach((key) => {
      basePrices[key] = mergeNumber(calc.basePrices[key], (BASE_PRICES as any)[key]);
    });
  }

  if (calc.factors && typeof calc.factors === "object") {
    Object.keys(FACTORS).forEach((key) => {
      factors[key] = mergeNumber(calc.factors[key], (FACTORS as any)[key]);
    });
  }

  const validatedArea = (Array.isArray(areaFactorsRaw) ? areaFactorsRaw : AREA_FACTORS).map((row: any) => ({
    min: mergeNumber(row?.min, 0),
    max: mergeNumber(row?.max, 99999),
    estrutural: mergeNumber(row?.estrutural, 1),
    complementares: mergeNumber(row?.complementares, 1),
  }));

  return { basePrices, factors, areaFactors: validatedArea as any };
}

function applyQuestionOverrides(base: any, overrides: any) {
  if (!overrides || typeof overrides !== "object") return base;
  const next = { ...base };

  if (overrides.label) next.label = String(overrides.label);
  if (overrides.help !== undefined) next.help = overrides.help === null ? undefined : String(overrides.help);
  if (Array.isArray(overrides.options)) next.options = overrides.options;

  return next;
}

async function loadBudgetSettings() {
  const result = await pool.query("SELECT content FROM budget_settings WHERE id = 1");
  return result.rows[0]?.content || {};
}

function getAreaFactor(area: number, cfg: CalcConfig) {
  return (
    cfg.areaFactors.find((range) => area >= range.min && area <= range.max) ||
    cfg.areaFactors[cfg.areaFactors.length - 1]
  );
}

function yes(value: YesNo) {
  return value === "SIM";
}

function calcStructural(input: StructuralInput, cfg: CalcConfig) {
  const areaEq =
    input.area +
    (yes(input.lajePiso) ? input.area * 0.5 : 0) +
    (yes(input.lajeCobertura) ? input.area * 0.5 : 0);

  const areaFactor = getAreaFactor(input.area, cfg).estrutural;
  const complexityFactor =
    1 +
    (yes(input.vaoMaior5) ? 0.1 : 0) +
    (yes(input.vaoMaior8) ? 0.15 : 0) +
    (yes(input.balancoMaior1) ? 0.4 : 0) +
    (yes(input.fundacaoRasaEspecial) ? 0.3 : 0) +
    (yes(input.terrenoDeclive) ? 0.3 : 0) +
    (yes(input.elevador) ? 0.15 : 0) +
    (yes(input.muroArrimo) ? 0.5 : 0) +
    (yes(input.memorialCalculo) ? 1 : 0);

  const valorBase = areaEq * cfg.basePrices.estrutural * areaFactor;
  const honorarioEstrutural = valorBase * complexityFactor;
  const memorialDescritivo = yes(input.memorialDescritivo) ? 2 * 1412 : 0;
  const honorarioTotal = yes(input.piscina) ? honorarioEstrutural : honorarioEstrutural + memorialDescritivo;

  return {
    areaEq,
    areaFactor,
    complexityFactor,
    valorBase,
    honorarioEstrutural,
    memorialDescritivo,
    honorarioTotal,
    piscinaSeparada: yes(input.piscina),
  };
}

function calcComplementary(input: ComplementaryInput, cfg: CalcConfig) {
  const areaFactor = getAreaFactor(input.area, cfg).complementares;
  const norma = yes(input.normaCondominio) ? cfg.factors.normaCondominio : 1;
  const concessionariaEspecial = yes(input.concessionariaPadraoEspecial)
    ? cfg.factors.concessionariaPadraoEspecial
    : 1;

  const hidraulicoFactor =
    (yes(input.boilerEletrico) ? cfg.factors.boilerEletrico : 1) *
    (yes(input.banheira) ? cfg.factors.banheira : 1) *
    (yes(input.spa) ? cfg.factors.spa : 1) *
    (yes(input.aquecimentoSolar) ? cfg.factors.aquecimentoSolar : 1) *
    concessionariaEspecial *
    norma *
    (input.abastecimento === "POÇO ARTESIANO" ? cfg.factors.pocoArtesiano : 1);

  const sanitarioFactor = (input.esgotamento === "FOSSA SÉPTICA" ? cfg.factors.fossaSeptica : 1) * norma;

  const pluvialFactor = (input.pluvial === "DRENAGEM ESPECÍFICA" ? cfg.factors.drenagemEspecifica : 1) * norma;

  const arCondFactor = 1 + Math.max(input.arCondicionadoQtd - 5, 0) * 0.02;

  const eletricoFactor =
    (yes(input.boilerEletrico) ? cfg.factors.boilerEletrico : 1) *
    (yes(input.banheira) ? cfg.factors.banheira : 1) *
    (yes(input.spa) ? cfg.factors.spa : 1) *
    arCondFactor *
    (yes(input.equipamentoEspecial) ? cfg.factors.equipamentoEspecial : 1) *
    (yes(input.gerador) ? cfg.factors.gerador : 1) *
    (yes(input.subestacao) ? cfg.factors.subestacao : 1) *
    concessionariaEspecial *
    norma;

  const incendioFactor = norma;

  const services = {
    hidraulico: {
      base: cfg.basePrices.hidraulico,
      factor: hidraulicoFactor,
      contratar: yes(input.contratar.hidraulico),
    },
    sanitario: {
      base: cfg.basePrices.sanitario,
      factor: sanitarioFactor,
      contratar: yes(input.contratar.sanitario),
    },
    pluvial: {
      base: cfg.basePrices.pluvial,
      factor: pluvialFactor,
      contratar: yes(input.contratar.pluvial),
    },
    eletrico: {
      base: cfg.basePrices.eletrico,
      factor: eletricoFactor,
      contratar: yes(input.contratar.eletrico),
    },
    incendio: {
      base: cfg.basePrices.incendio,
      factor: incendioFactor,
      contratar: yes(input.contratar.incendio),
    },
  };

  const breakdown = Object.entries(services).map(([key, value]) => {
    const unit = value.base * areaFactor * value.factor;
    const honorario = value.contratar ? input.area * unit : 0;
    return { service: key, unit, honorario, contratar: value.contratar };
  });

  const totalComplementares = breakdown.reduce((sum, item) => sum + item.honorario, 0);

  const hspSelected =
    yes(input.contratar.hidraulico) && yes(input.contratar.sanitario) && yes(input.contratar.pluvial);

  const allSelected = hspSelected && yes(input.contratar.eletrico) && yes(input.contratar.incendio);

  const pacoteHSP = hspSelected ? input.area * cfg.basePrices.pacoteHSP * areaFactor : 0;
  const pacoteCompleto = allSelected ? input.area * cfg.basePrices.pacoteCompleto * areaFactor : 0;

  const melhorOpcao =
    pacoteHSP > 0
      ? Math.min(totalComplementares, pacoteHSP)
      : pacoteCompleto > 0
        ? Math.min(totalComplementares, pacoteCompleto)
        : totalComplementares;

  return {
    areaFactor,
    breakdown,
    totalComplementares,
    pacoteHSP,
    pacoteCompleto,
    melhorOpcao,
  };
}

export async function getBudgetQuestions(req: Request, res: Response): Promise<Response> {
  const profile = String(req.query.profile || "leigo") === "tecnico" ? "tecnico" : "leigo";
  const isLeigo = profile === "leigo";

  const settings = await loadBudgetSettings();
  const overrides = settings?.questionOverrides?.[profile] || {};

  const intro = applyQuestionOverrides(
    {
      id: "knowledge_level",
      label: "Voce possui conhecimento tecnico em engenharia?",
      type: "select",
      options: [
        { value: "tecnico", label: "Sim, tenho conhecimento tecnico" },
        { value: "leigo", label: "Nao, sou cliente sem experiencia tecnica" },
      ],
      help: isLeigo ? "Vamos ajustar as perguntas para ficarem mais claras para voce." : undefined,
    },
    overrides?.intro,
  );

  const baseQuestions = {
    structural: [
      {
        id: "area",
        label: profile === "tecnico" ? "Area total construida (m²)" : "Area aproximada da residencia (m²)",
        type: "number",
        help: isLeigo
          ? "Soma aproximada das areas de todos os pavimentos (na duvida, use uma estimativa)."
          : undefined,
      },
      {
        id: "lajePiso",
        label: profile === "tecnico" ? "Laje de piso?" : "Tem laje entre os pavimentos?",
        type: "select",
        help: isLeigo ? "Laje e a estrutura de concreto entre um andar e outro." : undefined,
      },
      {
        id: "lajeCobertura",
        label: profile === "tecnico" ? "Laje de cobertura?" : "Tera laje na cobertura?",
        type: "select",
        help: isLeigo ? "Ex.: laje plana no teto/terraco (nao telhado leve)." : undefined,
      },
      {
        id: "vaoMaior5",
        label: profile === "tecnico" ? "Vao > 5 m?" : "Ha vaos (espacos) maiores que 5m?",
        type: "select",
        help: isLeigo ? "Vao e um espaco livre sem apoio (sem pilares no meio)." : undefined,
      },
      {
        id: "vaoMaior8",
        label: profile === "tecnico" ? "Vao > 8 m?" : "Ha vaos (espacos) maiores que 8m?",
        type: "select",
        help: isLeigo ? "Vao grande costuma aparecer em salas amplas, garagens grandes, etc." : undefined,
      },
      { id: "piscina", label: "Piscina?", type: "select", help: isLeigo ? "Considere se havera piscina na obra." : undefined },
      {
        id: "balancoMaior1",
        label: profile === "tecnico" ? "Balanco > 1 m?" : "Ha balanco (laje em balanco) maior que 1m?",
        type: "select",
        help: isLeigo ? "Balanco e quando a laje avanca para fora sem apoio embaixo." : undefined,
      },
      {
        id: "fundacaoRasaEspecial",
        label: profile === "tecnico" ? "Fundacao rasa especial?" : "A fundacao sera diferente do comum?",
        type: "select",
        help: isLeigo ? "Ex.: terreno ruim, necessidade de solucao mais robusta que sapatas comuns." : undefined,
      },
      {
        id: "terrenoDeclive",
        label: "Terreno em declive?",
        type: "select",
        help: isLeigo ? "Terreno inclinado pode exigir estrutura/fundacao mais complexa." : undefined,
      },
      {
        id: "elevador",
        label: profile === "tecnico" ? "Elevador / nucleo rigido?" : "Havera elevador ou nucleo rigido?",
        type: "select",
        help: isLeigo ? "Inclui elevador ou caixa/parede estrutural mais rigida." : undefined,
      },
      {
        id: "muroArrimo",
        label: profile === "tecnico" ? "Muro de arrimo > 3,20 m?" : "Havera muro de arrimo alto?",
        type: "select",
        help: isLeigo ? "Muro para segurar terra (contencao). Se nao sabe, marque Nao." : undefined,
      },
      {
        id: "memorialDescritivo",
        label: "Memorial descritivo?",
        type: "select",
        help: isLeigo ? "Documento que descreve o projeto e materiais/criterios." : undefined,
      },
      {
        id: "memorialCalculo",
        label: "Memorial de calculo?",
        type: "select",
        help: isLeigo ? "Documento com os calculos/criterios tecnicos do dimensionamento." : undefined,
      },
    ],
    complementary: [
      {
        id: "area",
        label: profile === "tecnico" ? "Area total construida (m²)" : "Area aproximada da residencia (m²)",
        type: "number",
        help: isLeigo ? "Use a mesma area informada anteriormente (aproximada)." : undefined,
      },
      {
        id: "abastecimento",
        label: profile === "tecnico" ? "Tipo de abastecimento" : "A agua vira de concessionaria ou poco?",
        type: "select",
        options: ["CONCESSIONÁRIA", "POÇO ARTESIANO"],
        help: isLeigo ? "Concessionaria = agua da rua. Poco artesiano = captacao no terreno." : undefined,
      },
      {
        id: "esgotamento",
        label: profile === "tecnico" ? "Esgotamento" : "Esgoto em rede publica ou fossa septica?",
        type: "select",
        options: ["REDE", "FOSSA SÉPTICA"],
        help: isLeigo ? "Rede = esgoto da rua. Fossa septica = sistema no terreno." : undefined,
      },
      {
        id: "pluvial",
        label: profile === "tecnico" ? "Pluvial" : "Agua da chuva vai para o solo ou drenagem especifica?",
        type: "select",
        options: ["SOLO", "DRENAGEM ESPECÍFICA"],
        help: isLeigo ? "Solo = escoamento simples. Drenagem especifica = necessidade de sistema dedicado." : undefined,
      },
      {
        id: "normaCondominio",
        label: "Norma especifica de condominio/loteamento?",
        type: "select",
        help: isLeigo ? "Ex.: regras tecnicas do condominio que mudam os projetos." : undefined,
      },
      {
        id: "boilerEletrico",
        label: "Boiler eletrico?",
        type: "select",
        help: isLeigo ? "Reservatorio de agua quente (aquecimento) com apoio eletrico." : undefined,
      },
      { id: "banheira", label: "Banheira(s)?", type: "select", help: isLeigo ? "Inclui banheira ou ofuro." : undefined },
      {
        id: "spa",
        label: "Spa/jacuzzi?",
        type: "select",
        help: isLeigo ? "Spa/jacuzzi com bombas e instalacoes dedicadas." : undefined,
      },
      { id: "aquecimentoSolar", label: "Aquecimento solar?", type: "select", help: isLeigo ? "Aquecimento de agua por placas solares." : undefined },
      {
        id: "arCondicionadoQtd",
        label: "Quantidade de aparelhos de ar-condicionado",
        type: "number",
        help: isLeigo ? "Quantidade total prevista (ex.: quartos + sala)." : undefined,
      },
      {
        id: "equipamentoEspecial",
        label: "Equipamento especial/industrial?",
        type: "select",
        help: isLeigo ? "Ex.: maquinas, cargas especiais, equipamentos fora do padrao residencial." : undefined,
      },
      { id: "gerador", label: "Gerador?", type: "select", help: isLeigo ? "Gerador de energia instalado na residencia/obra." : undefined },
      {
        id: "subestacao",
        label: "Subestacao (pre-dimensionamento)?",
        type: "select",
        help: isLeigo ? "Normalmente nao se aplica a residencias comuns. Se nao sabe, marque Nao." : undefined,
      },
      {
        id: "concessionariaPadraoEspecial",
        label: "Concessionaria exige padrao especial?",
        type: "select",
        help: isLeigo ? "Se a concessionaria pede quadro/entrada diferente do padrao." : undefined,
      },
      {
        id: "contratar",
        label: "Servicos a contratar",
        type: "multi",
        options: ["hidraulico", "sanitario", "pluvial", "eletrico", "incendio"],
        help: isLeigo ? "Selecione quais projetos voce quer incluir no orcamento (pode marcar nenhum por enquanto)." : undefined,
      },
    ],
  };

  const questions = {
    structural: baseQuestions.structural.map((q: any) => applyQuestionOverrides(q, overrides?.structural?.[q.id])),
    complementary: baseQuestions.complementary.map((q: any) => applyQuestionOverrides(q, overrides?.complementary?.[q.id])),
  };

  return res.status(200).json({ intro, profile, questions });
}

export async function calculateBudget(req: Request, res: Response): Promise<Response> {
  const body = req.body as BudgetRequest;

  if (!body || !body.structural || !body.complementary) {
    return res.status(400).json({ message: "Invalid payload." });
  }

  const settings = await loadBudgetSettings();
  const cfg = getEffectiveConfig(settings);

  const structural = calcStructural(body.structural, cfg);
  const complementary = calcComplementary(body.complementary, cfg);

  const originalTotal = structural.honorarioTotal + complementary.melhorOpcao;

  const userId = req.user?.id;
  let discountPercent = 0;

  if (userId) {
    const discountResult = await pool.query(
      `
        SELECT percent
        FROM user_discounts
        WHERE user_id = $1
          AND (starts_at IS NULL OR starts_at <= NOW())
          AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY percent DESC, created_at DESC
        LIMIT 1
      `,
      [userId],
    );

    if (discountResult.rows[0]?.percent !== undefined) {
      discountPercent = Number(discountResult.rows[0].percent);
      if (!Number.isFinite(discountPercent)) discountPercent = 0;
      discountPercent = Math.min(100, Math.max(0, discountPercent));
    }
  }

  if (discountPercent === 0) {
    const globalResult = await pool.query(`
      SELECT percent
      FROM user_discounts
      WHERE user_id IS NULL
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
      ORDER BY percent DESC, created_at DESC
      LIMIT 1
    `);
    if (globalResult.rows[0]?.percent !== undefined) {
      discountPercent = Math.min(100, Math.max(0, Number(globalResult.rows[0].percent) || 0));
    }
  }

  const discountAmount = originalTotal * (discountPercent / 100);
  const finalTotal = Math.max(0, originalTotal - discountAmount);

  return res.status(200).json({
    structural,
    complementary,
    totalSuggested: originalTotal,
    discount: discountPercent > 0 ? { percent: discountPercent, amount: discountAmount, finalTotal } : null,
  });
}
