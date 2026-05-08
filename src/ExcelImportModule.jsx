import React, { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs/dist/exceljs.min.js";
import { supabase } from "./lib/supabaseClient";

const importTargets = [
  {
    id: "inventario",
    label: "Inventario médico",
    helper: "Medicamentos, stock, mínimos y unidades",
  },
  {
    id: "atenciones",
    label: "Atenciones médicas",
    helper: "Registros clínicos in-plant",
  },
  {
    id: "antidoping",
    label: "Antidoping",
    helper: "Pruebas toxicológicas, ingreso, aleatorio y resultados",
  },
];

const fieldAliases = {
  patient_name: [
    "paciente",
    "empleado",
    "colaborador",
    "nombre",
    "nombre completo",
    "nombre del paciente",
    "nombre paciente",
    "nombre empleado",
    "nombre del empleado",
    "nombre colaborador",
    "nombre del colaborador",
    "nombre trabajador",
    "nombre del trabajador",
    "trabajador",
    "persona",
    "personal",
  ],

  employee_number: [
    "numero empleado",
    "número empleado",
    "numero de empleado",
    "número de empleado",
    "no empleado",
    "no. empleado",
    "num empleado",
    "núm empleado",
    "num. empleado",
    "núm. empleado",
    "id empleado",
    "id colaborador",
    "id trabajador",
    "nomina",
    "nómina",
    "codigo",
    "código",
    "clave",
    "clave empleado",
    "clave colaborador",
    "matricula",
    "matrícula",
  ],

  company: [
    "empresa",
    "cliente",
    "compania",
    "compañia",
    "compañía",
    "razon social",
    "razón social",
    "contratante",
    "cliente empresa",
  ],

  plant: [
    "planta",
    "sucursal",
    "centro de trabajo",
    "ubicacion",
    "ubicación",
    "sitio",
    "site",
    "unidad",
    "unidad operativa",
  ],

  date: [
    "fecha",
    "fecha atencion",
    "fecha atención",
    "fecha de atencion",
    "fecha de atención",
    "fecha prueba",
    "fecha de prueba",
    "dia",
    "día",
    "fecha consulta",
    "fecha de consulta",
    "fecha registro",
    "fecha de registro",
  ],

  area: [
    "area",
    "área",
    "categoria",
    "categoría",
    "departamento",
    "linea",
    "línea",
    "puesto area",
    "zona",
    "seccion",
    "sección",
  ],

  diagnosis: [
    "diagnostico",
    "diagnóstico",
    "descripcion",
    "descripción",
    "descripcion del padecimiento",
    "descripción del padecimiento",
    "motivo",
    "padecimiento",
    "consulta",
    "motivo de consulta",
    "causa",
    "impresion diagnostica",
    "impresión diagnóstica",
    "dx",
  ],

  condition_classification: [
    "clasificacion",
    "clasificación",
    "clasificacion padecimiento",
    "clasificación padecimiento",
    "clasificacion del padecimiento",
    "clasificación del padecimiento",
    "tipo de padecimiento",
    "tipo padecimiento",
    "grupo",
    "grupo diagnostico",
    "grupo diagnóstico",
    "familia diagnostica",
    "familia diagnóstica",
    "categoria diagnostica",
    "categoría diagnóstica",
  ],

  risk_level: [
    "riesgo",
    "nivel riesgo",
    "nivel de riesgo",
    "prioridad",
    "severidad",
  ],

  attention_minutes: [
    "minutos",
    "tiempo",
    "tiempo atencion",
    "tiempo atención",
    "tiempo de atencion",
    "tiempo de atención",
    "duracion",
    "duración",
  ],

  notes: [
    "notas",
    "observaciones",
    "comentarios",
    "comentario",
    "nota",
    "evolucion",
    "evolución",
    "indicaciones",
    "observacion",
    "observación",
  ],

  medicine: [
    "medicamento",
    "medicamento indicado",
    "medicamento entregado",
    "insumo",
    "farmaco",
    "fármaco",
    "tratamiento",
    "material",
  ],

  medicine_quantity: [
    "cantidad medicamento",
    "cantidad de medicamento",
    "cantidad",
    "dosis",
    "cantidad entregada",
    "piezas entregadas",
    "unidades entregadas",
  ],

  heart_rate: [
    "fc",
    "frecuencia cardiaca",
    "frecuencia cardíaca",
    "pulso",
    "ppm",
  ],

  respiratory_rate: [
    "fr",
    "frecuencia respiratoria",
    "respiraciones",
    "rpm",
  ],

  systolic_bp: [
    "ta sistolica",
    "ta sistólica",
    "sistolica",
    "sistólica",
    "presion sistolica",
    "presión sistólica",
    "tas",
    "pa sistolica",
    "pa sistólica",
  ],

  diastolic_bp: [
    "ta diastolica",
    "ta diastólica",
    "diastolica",
    "diastólica",
    "presion diastolica",
    "presión diastólica",
    "tad",
    "pa diastolica",
    "pa diastólica",
  ],

  temperature: ["temperatura", "temp", "t", "temperatura corporal"],

  inventory_name: [
    "medicamento",
    "medicamento / insumo",
    "insumo",
    "nombre",
    "producto",
    "material",
    "descripcion",
    "descripción",
    "articulo",
    "artículo",
  ],

  inventory_stock: [
    "stock",
    "existencia",
    "existencias",
    "cantidad",
    "cantidad actual",
    "inventario",
    "stock actual",
    "disponible",
  ],

  inventory_minimum_stock: [
    "minimo",
    "mínimo",
    "stock minimo",
    "stock mínimo",
    "min",
    "punto reorden",
    "punto de reorden",
    "existencia minima",
    "existencia mínima",
  ],

  inventory_unit: [
    "unidad",
    "unidad de medida",
    "presentacion",
    "presentación",
    "tipo unidad",
    "medida",
  ],

  antidoping_consecutive: [
    "no",
    "no.",
    "numero",
    "número",
    "consecutivo",
    "registro",
  ],

  antidoping_reason: [
    "motivo",
    "razon",
    "razón",
    "tipo",
    "tipo prueba",
    "tipo de prueba",
    "causa",
  ],

  antidoping_ingreso: [
    "ingreso",
    "nuevo ingreso",
    "preingreso",
    "pre ingreso",
  ],

  antidoping_aleatorio: [
    "aleatorio",
    "random",
    "sorteo",
  ],

  antidoping_result: [
    "resultado",
    "resultados",
    "resultado antidoping",
    "resultado doping",
    "dictamen",
  ],

  antidoping_pregnancy: [
    "prueba inmunologica embarazo",
    "prueba inmunológica embarazo",
    "embarazo",
    "prueba embarazo",
    "prueba de embarazo",
    "inmunologica embarazo",
    "inmunológica embarazo",
  ],

  antidoping_test_type: [
    "tipo de prueba",
    "panel",
    "panel antidoping",
    "antidoping",
    "prueba",
    "tipo antidoping",
  ],

  antidoping_sample_type: [
    "muestra",
    "tipo muestra",
    "tipo de muestra",
  ],

  antidoping_sample_code: [
    "codigo muestra",
    "código muestra",
    "codigo de muestra",
    "código de muestra",
    "muestra codigo",
    "muestra código",
    "folio muestra",
    "folio",
    "cadena custodia",
    "cadena de custodia",
  ],

  antidoping_lot_number: [
    "lote",
    "lote prueba",
    "lote de prueba",
    "lote reactivo",
    "lote de reactivo",
    "reactivo",
  ],

  antidoping_collector: [
    "responsable",
    "responsable toma",
    "responsable de toma",
    "toma",
    "realizo",
    "realizó",
    "aplico",
    "aplicó",
    "colector",
  ],
};

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeHeader(value) {
  return normalizeText(value)
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "_");
}

function getCellValue(value) {
  if (value === null || value === undefined) return "";

  if (value instanceof Date) return value;

  if (typeof value === "object") {
    if (value.text) return value.text;
    if (value.result !== undefined) return value.result;

    if (value.richText) {
      return value.richText.map((part) => part.text).join("");
    }

    if (value.hyperlink && value.text) {
      return value.text;
    }
  }

  return value;
}

function findValue(row, possibleNames) {
  const normalizedRow = {};

  Object.entries(row).forEach(([key, value]) => {
    normalizedRow[normalizeHeader(key)] = value;
  });

  for (const name of possibleNames) {
    const normalizedName = normalizeHeader(name);

    if (
      normalizedRow[normalizedName] !== undefined &&
      normalizedRow[normalizedName] !== null &&
      String(normalizedRow[normalizedName]).trim() !== ""
    ) {
      return normalizedRow[normalizedName];
    }
  }

  return "";
}

function getField(row, canonicalField) {
  return findValue(row, fieldAliases[canonicalField] || [canonicalField]);
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;

  const cleanValue = String(value).replace(",", ".").trim();
  const numberValue = Number(cleanValue);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function toIntegerOrZero(value) {
  if (value === "" || value === null || value === undefined) return 0;

  const cleanValue = String(value).replace(",", ".").trim();
  const numberValue = Number(cleanValue);

  return Number.isFinite(numberValue)
    ? Math.max(0, Math.trunc(numberValue))
    : 0;
}

function excelSerialToDate(serial) {
  const numericSerial = Number(serial);

  if (!Number.isFinite(numericSerial)) return null;

  if (numericSerial < 20000 || numericSerial > 80000) return null;

  const milliseconds = Math.round((numericSerial - 25569) * 86400 * 1000);
  const date = new Date(milliseconds);

  if (Number.isNaN(date.getTime())) return null;

  const isoDate = date.toISOString().slice(0, 10);

  return isValidIsoDate(isoDate) ? isoDate : null;
}

function normalizeYear(value) {
  const raw = String(value || "")
    .trim()
    .replace(/[^\d]/g, "");

  if (!raw) return "";

  // Corrige años deformados por Excel o captura:
  // 02025 -> 2025
  // 20205 -> 2025
  // 002025 -> 2025
  // 02026 -> 2026
  if (raw.length > 4) {
    const knownYears = [
      "2026",
      "2025",
      "2024",
      "2023",
      "2022",
      "2021",
      "2020",
    ];

    const foundYear = knownYears.find((year) => raw.includes(year));

    if (foundYear) return foundYear;

    const lastFour = raw.slice(-4);
    const lastFourNumber = Number(lastFour);

    if (lastFourNumber >= 2000 && lastFourNumber <= 2100) {
      return lastFour;
    }
  }

  if (raw.length === 4) return raw;

  if (raw.length === 2) return `20${raw}`;

  return raw;
}

function isValidIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);

  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
}

function parseDate(value) {
  const today = new Date().toISOString().slice(0, 10);

  if (value === null || value === undefined || value === "") {
    return today;
  }

  if (typeof value === "number") {
    const excelDate = excelSerialToDate(value);

    if (excelDate && isValidIsoDate(excelDate)) {
      return excelDate;
    }

    return today;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const isoDate = value.toISOString().slice(0, 10);

    if (isValidIsoDate(isoDate)) {
      return isoDate;
    }

    return today;
  }

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text) && isValidIsoDate(text)) {
    return text;
  }

  // dd/mm/yyyy, dd/mm/02025, dd/mm/20205
  if (/^\d{1,2}\/\d{1,2}\/\d{2,6}$/.test(text)) {
    const [rawDay, rawMonth, rawYear] = text.split("/");

    const day = rawDay.padStart(2, "0");
    const month = rawMonth.padStart(2, "0");
    const year = normalizeYear(rawYear);

    const isoDate = `${year}-${month}-${day}`;

    if (isValidIsoDate(isoDate)) {
      return isoDate;
    }

    return today;
  }

  // dd-mm-yyyy, dd-mm-02025, dd-mm-20205
  if (/^\d{1,2}-\d{1,2}-\d{2,6}$/.test(text)) {
    const [rawDay, rawMonth, rawYear] = text.split("-");

    const day = rawDay.padStart(2, "0");
    const month = rawMonth.padStart(2, "0");
    const year = normalizeYear(rawYear);

    const isoDate = `${year}-${month}-${day}`;

    if (isValidIsoDate(isoDate)) {
      return isoDate;
    }

    return today;
  }

  const fallback = new Date(text);

  if (!Number.isNaN(fallback.getTime())) {
    const isoDate = fallback.toISOString().slice(0, 10);

    if (isValidIsoDate(isoDate)) {
      return isoDate;
    }
  }

  return today;
}

function parseRisk(value) {
  const text = normalizeText(value);

  if (text.includes("crit")) return "Crítico";
  if (text.includes("alto")) return "Alto";
  if (text.includes("medio")) return "Medio";
  if (text.includes("bajo")) return "Bajo";

  return "Bajo";
}

function classifyCondition(value) {
  const text = normalizeText(value);

  if (!text) return "Sin clasificar";

  if (
    text.includes("lumb") ||
    text.includes("espalda") ||
    text.includes("cervical") ||
    text.includes("cuello") ||
    text.includes("hombro") ||
    text.includes("rodilla") ||
    text.includes("tobillo") ||
    text.includes("muneca") ||
    text.includes("muñeca") ||
    text.includes("dolor muscular") ||
    text.includes("contractura") ||
    text.includes("esguince") ||
    text.includes("torcedura") ||
    text.includes("muscular")
  ) {
    return "Músculo-esquelético";
  }

  if (
    text.includes("cefalea") ||
    text.includes("cabeza") ||
    text.includes("migra") ||
    text.includes("mareo") ||
    text.includes("vertigo") ||
    text.includes("vértigo")
  ) {
    return "Neurológico / cefalea";
  }

  if (
    text.includes("tos") ||
    text.includes("gripe") ||
    text.includes("gripa") ||
    text.includes("faring") ||
    text.includes("garganta") ||
    text.includes("resfriado") ||
    text.includes("congestion") ||
    text.includes("congestión") ||
    text.includes("rinorrea") ||
    text.includes("respiratorio")
  ) {
    return "Respiratorio";
  }

  if (
    text.includes("diarrea") ||
    text.includes("vomito") ||
    text.includes("vómito") ||
    text.includes("nausea") ||
    text.includes("náusea") ||
    text.includes("gastr") ||
    text.includes("abdominal") ||
    text.includes("estomago") ||
    text.includes("estómago")
  ) {
    return "Gastrointestinal";
  }

  if (
    text.includes("cort") ||
    text.includes("herida") ||
    text.includes("golpe") ||
    text.includes("contusion") ||
    text.includes("contusión") ||
    text.includes("trauma") ||
    text.includes("quemadura") ||
    text.includes("lesion") ||
    text.includes("lesión")
  ) {
    return "Lesión / trauma";
  }

  if (
    text.includes("hipertension") ||
    text.includes("hipertensión") ||
    text.includes("presion alta") ||
    text.includes("presión alta") ||
    text.includes("diabetes") ||
    text.includes("glucosa") ||
    text.includes("hta") ||
    text.includes("dm2")
  ) {
    return "Crónico-degenerativo";
  }

  if (
    text.includes("ansiedad") ||
    text.includes("estres") ||
    text.includes("estrés") ||
    text.includes("crisis nerviosa") ||
    text.includes("panico") ||
    text.includes("pánico")
  ) {
    return "Psicosocial";
  }

  if (
    text.includes("ojo") ||
    text.includes("ocular") ||
    text.includes("conjunt") ||
    text.includes("vision") ||
    text.includes("visión")
  ) {
    return "Oftalmológico";
  }

  if (
    text.includes("piel") ||
    text.includes("dermat") ||
    text.includes("roncha") ||
    text.includes("alerg") ||
    text.includes("comezon") ||
    text.includes("comezón")
  ) {
    return "Dermatológico / alérgico";
  }

  return "Otros";
}

function isYes(value) {
  const text = normalizeText(value);

  return (
    text === "si" ||
    text === "sí" ||
    text === "x" ||
    text === "ok" ||
    text === "yes" ||
    text === "1" ||
    text === "true"
  );
}

function normalizeAntidopingResult(value) {
  const text = normalizeText(value);

  if (!text) return "Pendiente";

  if (
    text.includes("pendiente") ||
    text === "pte" ||
    text.includes("pdt") ||
    text.includes("por confirmar")
  ) {
    return "Pendiente";
  }

  if (
    text.includes("cadena de custodia incorrecta") ||
    text.includes("custodia incorrecta") ||
    text.includes("invalido") ||
    text.includes("inválido") ||
    text.includes("muestra invalida") ||
    text.includes("muestra inválida")
  ) {
    return "Inválido";
  }

  if (
    text.includes("no negativo") ||
    text.includes("positivo") ||
    text.includes("(+)") ||
    text.includes("+") ||
    text.includes("thc") ||
    text.includes("coc") ||
    text.includes("met") ||
    text.includes("amp") ||
    text.includes("bzd") ||
    text.includes("opi") ||
    text.includes("bar") ||
    text.includes("pcp") ||
    text.includes("mdma")
  ) {
    return "No negativo";
  }

  if (
    text.includes("negativo") ||
    text.includes("nevativo") ||
    text.includes("negatiivo") ||
    text.includes("negative")
  ) {
    return "Negativo";
  }

  return "Pendiente";
}

function getAntidopingReason(row) {
  const manualReason = String(getField(row, "antidoping_reason")).trim();

  if (manualReason) return manualReason;

  const ingreso = getField(row, "antidoping_ingreso");
  const aleatorio = getField(row, "antidoping_aleatorio");

  if (isYes(ingreso)) return "Ingreso / aspirante";
  if (isYes(aleatorio)) return "Aleatorio";

  return "No especificado";
}

function formatDopingIdentifier(originalConsecutive, fallbackIndex) {
  const raw = String(originalConsecutive || "").trim();
  const digits = raw.replace(/\D/g, "");
  const base = digits || String(fallbackIndex + 1);

  return `DOPING-${base.padStart(4, "0")}`;
}

function getCompanyIdByName(companies, value) {
  const text = normalizeText(value);

  if (!text) return "";

  return (
    companies.find((company) => {
      return (
        normalizeText(company.name) === text ||
        normalizeText(company.legal_name) === text ||
        normalizeText(company.rfc) === text
      );
    })?.id || ""
  );
}

function getPlantIdByName(plants, companyId, value) {
  const text = normalizeText(value);

  if (!text) return "";

  return (
    plants.find((plant) => {
      const sameCompany = companyId ? plant.company_id === companyId : true;

      return sameCompany && normalizeText(plant.name) === text;
    })?.id || ""
  );
}

function getMedicineIdByName(medicines, value) {
  const text = normalizeText(value);

  if (!text) return "";

  return (
    medicines.find((medicine) => normalizeText(medicine.name) === text)?.id || ""
  );
}

function getCompanyName(companies, companyId) {
  if (!companyId) return "-";

  return (
    companies.find((company) => company.id === companyId)?.name ||
    "Empresa no identificada"
  );
}

function getPlantName(plants, plantId) {
  if (!plantId) return "-";

  return (
    plants.find((plant) => plant.id === plantId)?.name ||
    "Planta no identificada"
  );
}

function getPlantsForCompany(plants, companyId) {
  if (!companyId) return [];

  return plants.filter((plant) => plant.company_id === companyId);
}

function scoreHeaders(headers, words) {
  const normalizedHeaders = headers.map(normalizeHeader).join(" ");

  return words.filter((word) => normalizedHeaders.includes(normalizeHeader(word)))
    .length;
}

function detectTarget(headers) {
  const inventoryScore = scoreHeaders(headers, [
    "medicamento",
    "insumo",
    "stock",
    "existencia",
    "cantidad",
    "minimo",
    "unidad",
    "producto",
    "inventario",
  ]);

  const attentionScore = scoreHeaders(headers, [
    "colaborador",
    "paciente",
    "empleado",
    "diagnostico",
    "descripcion",
    "riesgo",
    "presion",
    "temperatura",
    "empresa",
    "planta",
    "nombre",
    "area",
    "categoria",
    "consulta",
    "motivo",
    "clasificacion",
  ]);

  const antidopingScore = scoreHeaders(headers, [
    "resultado",
    "ingreso",
    "aleatorio",
    "prueba inmunologica embarazo",
    "prueba inmunológica embarazo",
    "antidoping",
    "doping",
    "no.",
    "nombre",
    "fecha",
  ]);

  if (antidopingScore >= inventoryScore && antidopingScore >= attentionScore) {
    return "antidoping";
  }

  if (attentionScore > inventoryScore) return "atenciones";

  return "inventario";
}

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const toneClass =
    tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-900"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : "border-zinc-200 bg-white text-zinc-950";

  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight">{value}</p>
      {helper && <p className="mt-2 text-sm opacity-70">{helper}</p>}
    </div>
  );
}

export default function ExcelImportModule({
  session,
  userRole,
  companies,
  plants,
  medicines,
  onReload,
}) {
  const [target, setTarget] = useState("inventario");
  const [workbook, setWorkbook] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [rawRows, setRawRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [userProfile, setUserProfile] = useState(null);

  const [defaultCompanyId, setDefaultCompanyId] = useState("");
  const [defaultPlantId, setDefaultPlantId] = useState("");
  const [allowMissingEmployeeNumber, setAllowMissingEmployeeNumber] =
    useState(true);

  const canImportInventory = ["admin", "medico", "enfermeria"].includes(
    userRole
  );

  const canImportAttentions = ["admin", "medico", "enfermeria"].includes(
    userRole
  );

  const canImportAntidoping = ["admin", "medico", "enfermeria"].includes(
    userRole
  );

  const isAdmin = userRole === "admin";

  const usesOperationalDefaults =
    target === "atenciones" || target === "antidoping";

  const availableDefaultPlants = useMemo(() => {
    if (!defaultCompanyId) return [];
    return plants.filter((plant) => plant.company_id === defaultCompanyId);
  }, [plants, defaultCompanyId]);

  useEffect(() => {
    loadUserProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!isAdmin && userProfile?.company_id) {
      setDefaultCompanyId(userProfile.company_id);
    }

    if (!isAdmin && userProfile?.plant_id) {
      setDefaultPlantId(userProfile.plant_id);
    }
  }, [isAdmin, userProfile]);

  async function loadUserProfile() {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("user_profiles")
      .select("scope, company_id, plant_id")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      setUserProfile(null);
      return;
    }

    setUserProfile(data || null);
  }

  const operationalContext = useMemo(() => {
    if (isAdmin) {
      return {
        scope: "global",
        company_id: null,
        plant_id: null,
        label: "Admin global: puede importar para cualquier empresa/planta.",
      };
    }

    if (!userProfile) {
      return {
        scope: "none",
        company_id: null,
        plant_id: null,
        label:
          "Usuario sin asignación operativa. El admin debe asignar empresa/planta.",
      };
    }

    if (userProfile.scope === "plant") {
      return {
        ...userProfile,
        label: `Asignado a ${getCompanyName(
          companies,
          userProfile.company_id
        )} · ${getPlantName(plants, userProfile.plant_id)}`,
      };
    }

    if (userProfile.scope === "company") {
      return {
        ...userProfile,
        label: `Asignado a empresa completa: ${getCompanyName(
          companies,
          userProfile.company_id
        )}`,
      };
    }

    return {
      ...userProfile,
      label: "Alcance global.",
    };
  }, [isAdmin, userProfile, companies, plants]);

  function resolveCompanyAndPlant(row) {
    let companyId = "";
    let plantId = "";

    const companyName = getField(row, "company");
    const plantName = getField(row, "plant");

    if (operationalContext.scope === "global") {
      companyId = getCompanyIdByName(companies, companyName) || defaultCompanyId;
      plantId = getPlantIdByName(plants, companyId, plantName) || defaultPlantId;
    }

    if (operationalContext.scope === "company") {
      companyId = operationalContext.company_id || defaultCompanyId;
      plantId = getPlantIdByName(plants, companyId, plantName) || defaultPlantId;
    }

    if (operationalContext.scope === "plant") {
      companyId = operationalContext.company_id;
      plantId = operationalContext.plant_id;
    }

    return {
      companyId,
      plantId,
    };
  }

  const interpretedRows = useMemo(() => {
    if (target === "inventario") {
      return rawRows.map((row, index) => {
        const excelRowNumber = row.__excelRowNumber || index + 2;
        const name = String(getField(row, "inventory_name")).trim();

        const stock = toIntegerOrZero(getField(row, "inventory_stock"));

        const minimumStock = toIntegerOrZero(
          getField(row, "inventory_minimum_stock")
        );

        const unit = String(getField(row, "inventory_unit")).trim() || "piezas";

        const errors = [];

        if (!name) errors.push("Falta medicamento/insumo");

        return {
          rowNumber: excelRowNumber,
          valid: errors.length === 0,
          errors,
          payload: {
            name,
            stock,
            minimum_stock: minimumStock,
            unit,
          },
        };
      });
    }

    if (target === "antidoping") {
      return rawRows.map((row, index) => {
        const excelRowNumber = row.__excelRowNumber || index + 2;
        const { companyId, plantId } = resolveCompanyAndPlant(row);

        const employeeName = String(getField(row, "patient_name")).trim();

        const rawEmployeeNumber = String(getField(row, "employee_number")).trim();

        const originalConsecutive = String(
          getField(row, "antidoping_consecutive")
        ).trim();

        const dopingIdentifier = formatDopingIdentifier(
          originalConsecutive,
          index
        );

        const employeeNumber = rawEmployeeNumber || dopingIdentifier;

        const originalResult = String(getField(row, "antidoping_result")).trim();

        const pregnancyResult = String(
          getField(row, "antidoping_pregnancy")
        ).trim();

        const ingresoValue = String(getField(row, "antidoping_ingreso")).trim();
        const aleatorioValue = String(getField(row, "antidoping_aleatorio")).trim();

        const reason = getAntidopingReason(row);

        const normalizedResult = normalizeAntidopingResult(originalResult);

        const sampleCode =
          String(getField(row, "antidoping_sample_code")).trim() ||
          dopingIdentifier;

        const baseNotes = String(getField(row, "notes")).trim();

        const parsedDate = parseDate(getField(row, "date"));

        const notes = [
          baseNotes,
          `Identificador operativo: ${dopingIdentifier}`,
          originalConsecutive ? `Consecutivo original: ${originalConsecutive}` : "",
          originalResult ? `Resultado original: ${originalResult}` : "",
          pregnancyResult
            ? `Prueba inmunológica embarazo: ${pregnancyResult}`
            : "",
          ingresoValue ? `Columna ingreso: ${ingresoValue}` : "",
          aleatorioValue ? `Columna aleatorio: ${aleatorioValue}` : "",
          rawEmployeeNumber
            ? ""
            : "Sin número de empleado en Excel; se generó identificador operativo DOPING.",
        ]
          .filter(Boolean)
          .join(" | ");

        const errors = [];

        if (operationalContext.scope === "none") {
          errors.push("Usuario sin empresa/planta asignada");
        }

        if (!companyId) errors.push("Empresa no encontrada/asignada");
        if (!plantId) errors.push("Planta no encontrada/asignada");
        if (!employeeName) errors.push("Falta nombre del colaborador/aspirante");
        if (!isValidIsoDate(parsedDate)) errors.push("Fecha inválida");

        return {
          rowNumber: excelRowNumber,
          valid: errors.length === 0,
          errors,
          display: {
            companyName: getCompanyName(companies, companyId),
            plantName: getPlantName(plants, plantId),
            generatedEmployeeNumber: !rawEmployeeNumber,
            originalResult,
            pregnancyResult,
          },
          payload: {
            company_id: companyId || null,
            plant_id: plantId || null,
            test_date: parsedDate,
            employee_name: employeeName,
            employee_number: employeeNumber,
            area: String(getField(row, "area")).trim() || null,
            reason,
            test_type:
              String(getField(row, "antidoping_test_type")).trim() ||
              "Antidoping laboral",
            sample_type:
              String(getField(row, "antidoping_sample_type")).trim() || "Orina",
            sample_code: sampleCode,
            lot_number:
              String(getField(row, "antidoping_lot_number")).trim() || null,
            result: normalizedResult,
            collector_name:
              String(getField(row, "antidoping_collector")).trim() || null,
            observations: notes || null,
            created_by_user_id: session?.user?.id || null,
            created_by_email: session?.user?.email || "Sin correo",
          },
        };
      });
    }

    return rawRows.map((row, index) => {
      const excelRowNumber = row.__excelRowNumber || index + 2;
      const { companyId, plantId } = resolveCompanyAndPlant(row);

      const patientName = String(getField(row, "patient_name")).trim();

      const rawEmployeeNumber = String(getField(row, "employee_number")).trim();

      const employeeNumber =
        rawEmployeeNumber || `SIN-NUMERO-FILA-${excelRowNumber}`;

      const diagnosis = String(getField(row, "diagnosis")).trim();
      const manualClassification = String(
        getField(row, "condition_classification")
      ).trim();

      const conditionClassification =
        manualClassification || classifyCondition(diagnosis);

      const medicineName = getField(row, "medicine");
      const medicineId = getMedicineIdByName(medicines, medicineName);

      const baseNotes = String(getField(row, "notes")).trim();

      const generatedEmployeeNote = rawEmployeeNumber
        ? ""
        : "Número de empleado no incluido en Excel; se generó identificador temporal.";

      const parsedDate = parseDate(getField(row, "date"));

      const errors = [];

      if (operationalContext.scope === "none") {
        errors.push("Usuario sin empresa/planta asignada");
      }

      if (!companyId) errors.push("Empresa no encontrada/asignada");
      if (!plantId) errors.push("Planta no encontrada/asignada");
      if (!patientName) errors.push("Falta colaborador/paciente/nombre");
      if (!isValidIsoDate(parsedDate)) errors.push("Fecha inválida");

      if (!rawEmployeeNumber && !allowMissingEmployeeNumber) {
        errors.push("Falta número de empleado");
      }

      return {
        rowNumber: excelRowNumber,
        valid: errors.length === 0,
        errors,
        display: {
          companyName: getCompanyName(companies, companyId),
          plantName: getPlantName(plants, plantId),
          generatedEmployeeNumber: !rawEmployeeNumber,
        },
        payload: {
          company_id: companyId || null,
          plant_id: plantId || null,
          patient_name: patientName,
          employee_number: employeeNumber,
          attention_date: parsedDate,
          area: String(getField(row, "area")).trim() || null,
          diagnosis: diagnosis || null,
          condition_classification: conditionClassification,
          risk_level: parseRisk(getField(row, "risk_level")),
          attention_minutes: toIntegerOrZero(getField(row, "attention_minutes")),
          medicine_id: medicineId || null,
          medicine_quantity: toIntegerOrZero(getField(row, "medicine_quantity")),
          heart_rate: toNumberOrNull(getField(row, "heart_rate")),
          respiratory_rate: toNumberOrNull(getField(row, "respiratory_rate")),
          systolic_bp: toNumberOrNull(getField(row, "systolic_bp")),
          diastolic_bp: toNumberOrNull(getField(row, "diastolic_bp")),
          temperature: toNumberOrNull(getField(row, "temperature")),
          notes:
            [baseNotes, generatedEmployeeNote].filter(Boolean).join(" | ") ||
            null,
          created_by_user_id: session?.user?.id || null,
          created_by_email: session?.user?.email || "Sin correo",
        },
      };
    });
  }, [
    rawRows,
    target,
    companies,
    plants,
    medicines,
    session,
    operationalContext,
    defaultCompanyId,
    defaultPlantId,
    allowMissingEmployeeNumber,
  ]);

  const validRows = interpretedRows.filter((row) => row.valid);
  const invalidRows = interpretedRows.filter((row) => !row.valid);

  async function handleFileUpload(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Por ahora solo se aceptan archivos .xlsx.");
      return;
    }

    setResultMessage("");
    setFileName(file.name);

    const buffer = await file.arrayBuffer();
    const nextWorkbook = new ExcelJS.Workbook();

    await nextWorkbook.xlsx.load(buffer);

    const nextSheetNames = nextWorkbook.worksheets.map(
      (worksheet) => worksheet.name
    );

    const firstSheetName = nextSheetNames[0] || "";

    setWorkbook(nextWorkbook);
    setSheetNames(nextSheetNames);
    setSheetName(firstSheetName);

    if (firstSheetName) {
      loadSheet(nextWorkbook, firstSheetName);
    }
  }

  function getHeaderScore(headers) {
    if (headers.length === 0) return 0;

    const allHeaderText = headers.map(normalizeHeader).join(" ");

    const importantWords = [
      "nombre",
      "fecha",
      "resultado",
      "ingreso",
      "aleatorio",
      "paciente",
      "colaborador",
      "empleado",
      "diagnostico",
      "descripcion",
      "medicamento",
      "stock",
      "cantidad",
      "area",
      "categoria",
      "empresa",
      "planta",
    ];

    return importantWords.filter((word) =>
      allHeaderText.includes(normalizeHeader(word))
    ).length;
  }

  function detectHeaderRow(worksheet) {
    const maxRowsToInspect = Math.min(12, worksheet.rowCount);
    let bestHeaderRow = 1;
    let bestHeaders = [];
    let bestScore = 0;

    for (let rowNumber = 1; rowNumber <= maxRowsToInspect; rowNumber += 1) {
      const excelRow = worksheet.getRow(rowNumber);
      const currentHeaders = [];

      excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = String(getCellValue(cell.value) || "").trim();

        if (header) {
          currentHeaders.push({
            header,
            colNumber,
          });
        }
      });

      const currentScore = getHeaderScore(
        currentHeaders.map((item) => item.header)
      );

      if (
        currentScore > bestScore ||
        (currentScore === bestScore && currentHeaders.length > bestHeaders.length)
      ) {
        bestHeaderRow = rowNumber;
        bestHeaders = currentHeaders;
        bestScore = currentScore;
      }
    }

    return {
      headerRowNumber: bestHeaderRow,
      detectedHeaders: bestHeaders,
    };
  }

  function loadSheet(selectedWorkbook, selectedSheetName) {
    const worksheet = selectedWorkbook.getWorksheet(selectedSheetName);

    if (!worksheet) {
      setHeaders([]);
      setRawRows([]);
      return;
    }

    const { headerRowNumber, detectedHeaders } = detectHeaderRow(worksheet);

    const nextRows = [];

    for (
      let rowNumber = headerRowNumber + 1;
      rowNumber <= worksheet.rowCount;
      rowNumber += 1
    ) {
      const excelRow = worksheet.getRow(rowNumber);
      const rowObject = {};
      let hasAnyValue = false;

      detectedHeaders.forEach(({ header, colNumber }) => {
        const value = getCellValue(excelRow.getCell(colNumber).value);

        if (String(value || "").trim() !== "") {
          hasAnyValue = true;
        }

        rowObject[header] = value;
      });

      if (hasAnyValue) {
        rowObject.__excelRowNumber = rowNumber;
        nextRows.push(rowObject);
      }
    }

    const cleanHeaders = detectedHeaders.map((item) => item.header);

    setHeaders(cleanHeaders);
    setRawRows(nextRows);
    setTarget(detectTarget(cleanHeaders));
  }

  function handleSheetChange(nextSheetName) {
    setSheetName(nextSheetName);

    if (workbook) {
      loadSheet(workbook, nextSheetName);
    }
  }

  async function importInventory() {
    const rowsToImport = validRows.map((row) => row.payload);

    if (rowsToImport.length === 0) {
      alert("No hay filas válidas para importar.");
      return;
    }

    const { error } = await supabase.from("medicines").insert(rowsToImport);

    if (error) {
      alert("No se pudo importar inventario: " + error.message);
      return;
    }

    setResultMessage(`Inventario importado: ${rowsToImport.length} registro(s).`);
  }

  async function importAttentions() {
    const rowsToImport = validRows.map((row) => row.payload);

    if (rowsToImport.length === 0) {
      alert("No hay filas válidas para importar.");
      return;
    }

    const { error } = await supabase.from("attentions").insert(rowsToImport);

    if (error) {
      alert("No se pudieron importar atenciones: " + error.message);
      return;
    }

    setResultMessage(`Atenciones importadas: ${rowsToImport.length} registro(s).`);
  }

  async function importAntidoping() {
    const rowsToImport = validRows.map((row) => row.payload);

    if (rowsToImport.length === 0) {
      alert("No hay filas válidas para importar.");
      return;
    }

    const { error } = await supabase.from("antidoping_tests").insert(rowsToImport);

    if (error) {
      alert("No se pudieron importar antidoping: " + error.message);
      return;
    }

    setResultMessage(
      `Antidoping importado: ${rowsToImport.length} registro(s).`
    );
  }

  async function handleImport() {
    setImporting(true);
    setResultMessage("");

    if (target === "inventario") {
      if (!canImportInventory) {
        alert("Tu rol no permite importar inventario.");
        setImporting(false);
        return;
      }

      await importInventory();
    }

    if (target === "atenciones") {
      if (!canImportAttentions) {
        alert("Tu rol no permite importar atenciones.");
        setImporting(false);
        return;
      }

      await importAttentions();
    }

    if (target === "antidoping") {
      if (!canImportAntidoping) {
        alert("Tu rol no permite importar antidoping.");
        setImporting(false);
        return;
      }

      await importAntidoping();
    }

    await onReload?.();
    setImporting(false);
  }

  async function downloadTemplate() {
    const nextWorkbook = new ExcelJS.Workbook();

    if (target === "inventario") {
      const worksheet = nextWorkbook.addWorksheet("Inventario");

      worksheet.columns = [
        { header: "Medicamento", key: "medicamento", width: 30 },
        { header: "Stock", key: "stock", width: 14 },
        { header: "Stock mínimo", key: "stock_minimo", width: 16 },
        { header: "Unidad", key: "unidad", width: 18 },
      ];

      worksheet.addRow({
        medicamento: "Paracetamol 500 mg",
        stock: 100,
        stock_minimo: 20,
        unidad: "tabletas",
      });

      worksheet.addRow({
        medicamento: "Vida Suero Oral",
        stock: 30,
        stock_minimo: 10,
        unidad: "sobres",
      });
    }

    if (target === "atenciones") {
      const worksheet = nextWorkbook.addWorksheet("Atenciones");

      const includeCompanyColumns = operationalContext.scope === "global";
      const includePlantColumn =
        operationalContext.scope === "global" ||
        operationalContext.scope === "company";

      const columns = [];

      if (includeCompanyColumns) {
        columns.push({ header: "Empresa", key: "empresa", width: 28 });
      }

      if (includePlantColumn) {
        columns.push({ header: "Planta", key: "planta", width: 24 });
      }

      columns.push(
        { header: "Fecha", key: "fecha", width: 16 },
        { header: "Colaborador", key: "colaborador", width: 30 },
        { header: "Número empleado", key: "numero_empleado", width: 20 },
        { header: "Categoría", key: "categoria", width: 20 },
        { header: "Descripción", key: "descripcion", width: 35 },
        { header: "Clasificación", key: "clasificacion", width: 28 },
        { header: "Riesgo", key: "riesgo", width: 14 },
        { header: "Tiempo atención", key: "tiempo", width: 18 },
        { header: "FC", key: "fc", width: 10 },
        { header: "FR", key: "fr", width: 10 },
        { header: "TA sistólica", key: "ta_sistolica", width: 15 },
        { header: "TA diastólica", key: "ta_diastolica", width: 15 },
        { header: "Temperatura", key: "temperatura", width: 15 },
        { header: "Medicamento", key: "medicamento", width: 28 },
        { header: "Cantidad medicamento", key: "cantidad_medicamento", width: 22 },
        { header: "Observaciones", key: "observaciones", width: 40 }
      );

      worksheet.columns = columns;

      const sampleRow = {
        fecha: new Date().toISOString().slice(0, 10),
        colaborador: "Juan Prueba",
        numero_empleado: "001",
        categoria: "Producción",
        descripcion: "Dolor lumbar",
        clasificacion: "Músculo-esquelético",
        riesgo: "Bajo",
        tiempo: 10,
        fc: 78,
        fr: 18,
        ta_sistolica: 120,
        ta_diastolica: 80,
        temperatura: 36.5,
        medicamento: "Paracetamol 500 mg",
        cantidad_medicamento: 1,
        observaciones: "Sin datos de alarma",
      };

      if (includeCompanyColumns) {
        sampleRow.empresa =
          defaultCompanyId
            ? getCompanyName(companies, defaultCompanyId)
            : companies[0]?.name || "Imperial Auto Fluid";
      }

      if (includePlantColumn) {
        const plant =
          defaultPlantId
            ? plants.find((item) => item.id === defaultPlantId)
            : operationalContext.scope === "company"
            ? getPlantsForCompany(plants, operationalContext.company_id)[0]
            : plants[0];

        sampleRow.planta = plant?.name || "Ramos Arizpe";
      }

      worksheet.addRow(sampleRow);
    }

    if (target === "antidoping") {
      const worksheet = nextWorkbook.addWorksheet("Antidoping");

      const includeCompanyColumns = operationalContext.scope === "global";
      const includePlantColumn =
        operationalContext.scope === "global" ||
        operationalContext.scope === "company";

      const columns = [];

      if (includeCompanyColumns) {
        columns.push({ header: "Empresa", key: "empresa", width: 28 });
      }

      if (includePlantColumn) {
        columns.push({ header: "Planta", key: "planta", width: 24 });
      }

      columns.push(
        { header: "NO.", key: "no", width: 10 },
        { header: "NOMBRE", key: "nombre", width: 34 },
        { header: "FECHA", key: "fecha", width: 16 },
        { header: "INGRESO", key: "ingreso", width: 14 },
        { header: "ALEATORIO", key: "aleatorio", width: 14 },
        { header: "RESULTADO", key: "resultado", width: 26 },
        {
          header: "PRUEBA INMUNOLOGICA EMBARAZO",
          key: "embarazo",
          width: 34,
        },
        { header: "Número empleado", key: "numero_empleado", width: 20 },
        { header: "Tipo de prueba", key: "tipo_prueba", width: 22 },
        { header: "Tipo de muestra", key: "tipo_muestra", width: 18 },
        { header: "Código de muestra", key: "codigo_muestra", width: 24 },
        { header: "Lote de prueba", key: "lote", width: 20 },
        { header: "Responsable de toma", key: "responsable", width: 26 },
        { header: "Observaciones", key: "observaciones", width: 40 }
      );

      worksheet.columns = columns;

      const sampleRow = {
        no: 1,
        nombre: "JUAN PRUEBA",
        fecha: new Date().toISOString().slice(0, 10),
        ingreso: "SI",
        aleatorio: "",
        resultado: "NEGATIVO",
        embarazo: "",
        numero_empleado: "",
        tipo_prueba: "Antidoping laboral",
        tipo_muestra: "Orina",
        codigo_muestra: "",
        lote: "",
        responsable: "",
        observaciones: "",
      };

      if (includeCompanyColumns) {
        sampleRow.empresa =
          defaultCompanyId
            ? getCompanyName(companies, defaultCompanyId)
            : companies[0]?.name || "Imperial Auto Fluid";
      }

      if (includePlantColumn) {
        const plant =
          defaultPlantId
            ? plants.find((item) => item.id === defaultPlantId)
            : operationalContext.scope === "company"
            ? getPlantsForCompany(plants, operationalContext.company_id)[0]
            : plants[0];

        sampleRow.planta = plant?.name || "Ramos Arizpe";
      }

      worksheet.addRow(sampleRow);
    }

    nextWorkbook.eachSheet((worksheet) => {
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      worksheet.views = [{ state: "frozen", ySplit: 1 }];
    });

    const buffer = await nextWorkbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download =
      target === "inventario"
        ? "plantilla-inventario-sos.xlsx"
        : target === "antidoping"
        ? "plantilla-antidoping-sos.xlsx"
        : "plantilla-atenciones-sos.xlsx";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard
          label="Filas leídas"
          value={rawRows.length}
          helper="Total detectado"
          tone="dark"
        />

        <KpiCard
          label="Válidas"
          value={validRows.length}
          helper="Listas para importar"
          tone="blue"
        />

        <KpiCard
          label="Con observación"
          value={invalidRows.length}
          helper="Requieren ajuste"
          tone={invalidRows.length > 0 ? "amber" : "neutral"}
        />

        <KpiCard
          label="Columnas"
          value={headers.length}
          helper="Encabezados detectados"
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Importador inteligente
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Importar tablas de Excel
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              El sistema interpreta encabezados comunes y convierte las filas en
              registros operativos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={downloadTemplate}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Descargar plantilla
            </button>

            <label className="cursor-pointer rounded-2xl bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-white hover:bg-zinc-800">
              Seleccionar Excel
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        <div className="mb-5 rounded-2xl bg-zinc-950 p-4 text-white">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-400">
            Alcance operativo
          </p>
          <p className="mt-2 text-sm text-zinc-200">
            {operationalContext.label}
          </p>
        </div>

        {usesOperationalDefaults && (
          <div className="mb-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Valores por defecto para importación
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-xs font-bold text-zinc-500">
                  Empresa por defecto
                </label>

                <select
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-bold"
                  value={defaultCompanyId}
                  disabled={!isAdmin && operationalContext.scope !== "global"}
                  onChange={(event) => {
                    setDefaultCompanyId(event.target.value);
                    setDefaultPlantId("");
                  }}
                >
                  <option value="">Sin empresa por defecto</option>

                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-zinc-500">
                  Planta por defecto
                </label>

                <select
                  className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-bold"
                  value={defaultPlantId}
                  disabled={
                    !defaultCompanyId ||
                    (!isAdmin && operationalContext.scope === "plant")
                  }
                  onChange={(event) => setDefaultPlantId(event.target.value)}
                >
                  <option value="">Sin planta por defecto</option>

                  {availableDefaultPlants.map((plant) => (
                    <option key={plant.id} value={plant.id}>
                      {plant.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold text-zinc-700">
                <input
                  type="checkbox"
                  checked={allowMissingEmployeeNumber}
                  onChange={(event) =>
                    setAllowMissingEmployeeNumber(event.target.checked)
                  }
                />
                Permitir número de empleado pendiente
              </label>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Para antidoping, el número de empleado no es obligatorio. Si falta,
              se genera un identificador operativo tipo DOPING-0001.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Tipo de importación
            </label>

            <select
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-bold"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
            >
              {importTargets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-zinc-500">
              {importTargets.find((item) => item.id === target)?.helper}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Hoja
            </label>

            <select
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 font-bold"
              value={sheetName}
              onChange={(event) => handleSheetChange(event.target.value)}
              disabled={!workbook}
            >
              {!workbook && <option value="">Sin archivo</option>}

              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <p className="mt-2 text-xs text-zinc-500">
              Archivo: {fileName || "ninguno"}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Acción
            </label>

            <button
              type="button"
              onClick={handleImport}
              disabled={importing || validRows.length === 0}
              className="w-full rounded-2xl bg-red-700 px-4 py-3 font-black text-white hover:bg-red-800 disabled:opacity-50"
            >
              {importing
                ? "Importando..."
                : `Importar ${validRows.length} fila(s)`}
            </button>

            {resultMessage && (
              <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                {resultMessage}
              </p>
            )}
          </div>
        </div>

        {headers.length > 0 && (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Columnas detectadas
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {headers.map((header) => (
                <span
                  key={header}
                  className="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-700 ring-1 ring-zinc-200"
                >
                  {header}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Vista previa
          </p>

          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Interpretación de datos
          </h2>

          <p className="mt-1 text-sm text-zinc-500">
            Revisa errores antes de importar. Las filas con observación no se
            guardan.
          </p>
        </div>

        {interpretedRows.length === 0 ? (
          <EmptyState text="Carga un archivo Excel para ver la interpretación." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1450px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Fila</th>
                  <th className="p-3">Estado</th>

                  {target === "inventario" ? (
                    <>
                      <th className="p-3">Medicamento / insumo</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Mínimo</th>
                      <th className="p-3">Unidad</th>
                    </>
                  ) : target === "antidoping" ? (
                    <>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Planta</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Colaborador / aspirante</th>
                      <th className="p-3">Identificador</th>
                      <th className="p-3">Motivo</th>
                      <th className="p-3">Resultado</th>
                      <th className="p-3">Resultado original</th>
                      <th className="p-3">Embarazo</th>
                    </>
                  ) : (
                    <>
                      <th className="p-3">Empresa</th>
                      <th className="p-3">Planta</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Empleado</th>
                      <th className="p-3">Área</th>
                      <th className="p-3">Diagnóstico</th>
                      <th className="p-3">Clasificación</th>
                      <th className="p-3">Riesgo</th>
                    </>
                  )}

                  <th className="p-3">Observaciones</th>
                </tr>
              </thead>

              <tbody>
                {interpretedRows.slice(0, 150).map((row) => (
                  <tr
                    key={row.rowNumber}
                    className={`border-b align-top ${
                      row.valid ? "hover:bg-zinc-50" : "bg-red-50"
                    }`}
                  >
                    <td className="p-3 font-bold">{row.rowNumber}</td>

                    <td className="p-3">
                      {row.valid ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          Válida
                        </span>
                      ) : (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          Revisar
                        </span>
                      )}
                    </td>

                    {target === "inventario" ? (
                      <>
                        <td className="p-3 font-bold">{row.payload.name}</td>
                        <td className="p-3">{row.payload.stock}</td>
                        <td className="p-3">{row.payload.minimum_stock}</td>
                        <td className="p-3">{row.payload.unit}</td>
                      </>
                    ) : target === "antidoping" ? (
                      <>
                        <td className="p-3">{row.display.companyName}</td>
                        <td className="p-3">{row.display.plantName}</td>
                        <td className="p-3">{row.payload.test_date}</td>
                        <td className="p-3 font-bold">
                          {row.payload.employee_name}
                        </td>
                        <td className="p-3">
                          {row.payload.employee_number}
                          {row.display.generatedEmployeeNumber && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                              DOPING
                            </span>
                          )}
                        </td>
                        <td className="p-3">{row.payload.reason}</td>
                        <td className="p-3">{row.payload.result}</td>
                        <td className="p-3">{row.display.originalResult || "-"}</td>
                        <td className="p-3">
                          {row.display.pregnancyResult || "-"}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3">{row.display.companyName}</td>
                        <td className="p-3">{row.display.plantName}</td>
                        <td className="p-3">{row.payload.attention_date}</td>
                        <td className="p-3 font-bold">
                          {row.payload.patient_name}
                        </td>
                        <td className="p-3">
                          {row.payload.employee_number}
                          {row.display.generatedEmployeeNumber && (
                            <span className="ml-2 rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-800">
                              generado
                            </span>
                          )}
                        </td>
                        <td className="p-3">{row.payload.area || "-"}</td>
                        <td className="p-3">{row.payload.diagnosis || "-"}</td>
                        <td className="p-3">
                          {row.payload.condition_classification || "-"}
                        </td>
                        <td className="p-3">{row.payload.risk_level}</td>
                      </>
                    )}

                    <td className="p-3 text-red-700">
                      {row.errors.length > 0 ? row.errors.join(" | ") : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {interpretedRows.length > 150 && (
              <p className="mt-3 text-xs text-zinc-500">
                Vista previa limitada a 150 filas. Se importarán todas las filas
                válidas.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}