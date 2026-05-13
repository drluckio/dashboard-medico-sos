import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import AntidopingModule from "./AntidopingModule.jsx";
import ChronicDegenerativeModule from "./ChronicDegenerativeModule.jsx";
import CompaniesPlantsModule from "./CompaniesPlantsModule.jsx";
import AdminAccessModule from "./AdminAccessModule.jsx";
import ExcelImportModule from "./ExcelImportModule.jsx";

const riskOptions = ["Bajo", "Medio", "Alto", "Crítico"];

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Centro de mando",
  },
  {
    id: "empresas",
    label: "Empresas",
    subtitle: "Clientes y plantas",
  },
  {
    id: "admin",
    label: "Admin",
    subtitle: "Usuarios y alcance",
  },
  {
    id: "importar",
    label: "Importar Excel",
    subtitle: "Carga masiva",
  },
  {
    id: "atenciones",
    label: "Atenciones",
    subtitle: "Consulta in-plant",
  },
  {
    id: "antidoping",
    label: "Antidoping",
    subtitle: "Pruebas toxicológicas",
  },
  {
    id: "cronicos",
    label: "Crónico-degenerativos",
    subtitle: "Programa preventivo",
  },
  {
    id: "inventario",
    label: "Inventario",
    subtitle: "Medicamentos",
  },
  {
    id: "reportes",
    label: "Reportes",
    subtitle: "Indicadores",
  },
];

function createInitialAttentionForm() {
  return {
    company_id: "",
    plant_id: "",
    patient_name: "",
    employee_number: "",
    attention_date: new Date().toISOString().slice(0, 10),
    area: "",
    diagnosis: "",
    condition_classification: "",
    risk_level: "Bajo",
    attention_minutes: "",
    medicine_id: "",
    medicine_quantity: "",
    heart_rate: "",
    respiratory_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    temperature: "",
    notes: "",
  };
}

function createInitialMedicineForm() {
  return {
    name: "",
    stock: "",
    minimum_stock: "",
    unit: "piezas",
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toIntegerOrZero(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const numberValue = Number(value);
  return Number.isFinite(numberValue)
    ? Math.max(0, Math.trunc(numberValue))
    : 0;
}

function normalizeSimpleText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function classifyCondition(value) {
  const text = normalizeSimpleText(value);

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

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthKey(dateString) {
  if (!dateString) return "";
  return dateString.slice(0, 7);
}

function getMonthLabel(monthKey) {
  if (!monthKey) return "Sin mes";

  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleDateString("es-MX", {
    month: "long",
    year: "numeric",
  });
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function getRiskBadgeClass(risk) {
  if (risk === "Crítico") return "bg-red-100 text-red-800 ring-red-200";
  if (risk === "Alto") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (risk === "Medio") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function hasVitalAlert(attention) {
  const heartRate = Number(attention.heart_rate);
  const respiratoryRate = Number(attention.respiratory_rate);
  const systolic = Number(attention.systolic_bp);
  const diastolic = Number(attention.diastolic_bp);
  const temperature = Number(attention.temperature);

  return Boolean(
    (heartRate && (heartRate < 50 || heartRate > 120)) ||
      (respiratoryRate && (respiratoryRate < 10 || respiratoryRate > 24)) ||
      (systolic && (systolic < 90 || systolic > 160)) ||
      (diastolic && (diastolic < 60 || diastolic > 100)) ||
      (temperature && (temperature < 35.5 || temperature >= 38))
  );
}

function getCompanyName(companies, companyId) {
  if (!companyId) return "Sin empresa";
  return (
    companies.find((company) => company.id === companyId)?.name ||
    "Empresa no identificada"
  );
}

function getPlantName(plants, plantId) {
  if (!plantId) return "Sin planta";
  return (
    plants.find((plant) => plant.id === plantId)?.name ||
    "Planta no identificada"
  );
}

function getPlantsForCompany(plants, companyId) {
  if (!companyId) return [];
  return plants.filter((plant) => plant.company_id === companyId && plant.active);
}

function getMedicineName(medicines, medicineId) {
  if (!medicineId) return "";
  return medicines.find((medicine) => medicine.id === medicineId)?.name || "";
}

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const toneClass =
    tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-900"
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

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    if (!email.trim() || !password) {
      alert("Captura correo y contraseña.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      alert("No se pudo iniciar sesión: " + error.message);
    }
  }

  async function handlePasswordRecovery(event) {
    event.preventDefault();

    if (!email.trim()) {
      alert("Captura tu correo.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    if (error) {
      alert("No se pudo enviar recuperación: " + error.message);
      return;
    }

    alert("Se envió el correo de recuperación.");
    setMode("login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white p-8 shadow-2xl">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-zinc-950">
            <img src="/logo.png" alt="SOS" className="h-12 w-12 object-contain" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">
              SOS MedicalOps
            </p>
            <h1 className="text-2xl font-black tracking-tight">
              Centro médico-operativo
            </h1>
          </div>
        </div>

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Correo"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button className="w-full rounded-2xl bg-red-700 px-5 py-4 font-black text-white hover:bg-red-800">
              Entrar
            </button>

            <button
              type="button"
              onClick={() => setMode("recovery")}
              className="w-full rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Recuperar contraseña
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordRecovery} className="space-y-4">
            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Correo"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <button className="w-full rounded-2xl bg-red-700 px-5 py-4 font-black text-white hover:bg-red-800">
              Enviar recuperación
            </button>

            <button
              type="button"
              onClick={() => setMode("login")}
              className="w-full rounded-2xl border border-zinc-300 px-5 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Volver
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function DashboardModule({ attentions, medicines, companies, plants }) {
  const kpis = useMemo(() => {
    return {
      attentions: attentions.length,
      highRisk: attentions.filter((attention) =>
        ["Alto", "Crítico"].includes(attention.risk_level)
      ).length,
      vitalAlerts: attentions.filter(hasVitalAlert).length,
      lowStock: medicines.filter(
        (medicine) => Number(medicine.stock) <= Number(medicine.minimum_stock)
      ).length,
      activeCompanies: companies.filter((company) => company.active).length,
      activePlants: plants.filter((plant) => plant.active).length,
    };
  }, [attentions, medicines, companies, plants]);

  const recentAttentions = attentions.slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          label="Atenciones"
          value={kpis.attentions}
          helper="Total histórico"
          tone="dark"
        />
        <KpiCard
          label="Alto / crítico"
          value={kpis.highRisk}
          helper="Prioridad clínica"
          tone={kpis.highRisk > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Alertas vitales"
          value={kpis.vitalAlerts}
          helper="Signos fuera de rango"
          tone={kpis.vitalAlerts > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Bajo stock"
          value={kpis.lowStock}
          helper="Medicamentos en mínimo"
          tone={kpis.lowStock > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Empresas"
          value={kpis.activeCompanies}
          helper="Clientes activos"
          tone="blue"
        />
        <KpiCard
          label="Plantas"
          value={kpis.activePlants}
          helper="Sitios activos"
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Operación reciente
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Últimas atenciones médicas
          </h2>
        </div>

        {recentAttentions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Planta</th>
                  <th className="p-3">Colaborador</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Diagnóstico</th>
                  <th className="p-3">Clasificación</th>
                  <th className="p-3">Riesgo</th>
                  <th className="p-3">Alerta</th>
                </tr>
              </thead>

              <tbody>
                {recentAttentions.map((attention) => (
                  <tr key={attention.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3">{attention.attention_date}</td>
                    <td className="p-3">
                      {getCompanyName(companies, attention.company_id)}
                    </td>
                    <td className="p-3">
                      {getPlantName(plants, attention.plant_id)}
                    </td>
                    <td className="p-3 font-bold">{attention.patient_name}</td>
                    <td className="p-3">{attention.area || "-"}</td>
                    <td className="p-3">{attention.diagnosis || "-"}</td>
                    <td className="p-3">
                      {attention.condition_classification || "Sin clasificar"}
                    </td>
                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRiskBadgeClass(
                          attention.risk_level
                        )}`}
                      >
                        {attention.risk_level}
                      </span>
                    </td>
                    <td className="p-3">
                      {hasVitalAlert(attention) ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          Sí
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Aún no hay atenciones registradas." />
        )}
      </section>
    </div>
  );
}

function AttentionModule({
  session,
  userRole,
  attentions,
  medicines,
  companies,
  plants,
  onReload,
}) {
  const [form, setForm] = useState(createInitialAttentionForm());
  const [filters, setFilters] = useState({
    company_id: "Todos",
    plant_id: "Todos",
    risk_level: "Todos",
    date_from: "",
    date_to: "",
    searchText: "",
    vitalAlertsOnly: false,
  });

  const canRegister = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDelete = userRole === "admin";

  const activeCompanies = useMemo(
    () => companies.filter((company) => company.active),
    [companies]
  );

  const availablePlants = useMemo(
    () => getPlantsForCompany(plants, form.company_id),
    [plants, form.company_id]
  );

  const filterPlants = useMemo(() => {
    if (filters.company_id === "Todos") {
      return plants.filter((plant) => plant.active);
    }

    return getPlantsForCompany(plants, filters.company_id);
  }, [plants, filters.company_id]);

  const filteredAttentions = useMemo(() => {
    return attentions.filter((attention) => {
      if (
        filters.company_id !== "Todos" &&
        attention.company_id !== filters.company_id
      ) {
        return false;
      }

      if (
        filters.plant_id !== "Todos" &&
        attention.plant_id !== filters.plant_id
      ) {
        return false;
      }

      if (
        filters.risk_level !== "Todos" &&
        attention.risk_level !== filters.risk_level
      ) {
        return false;
      }

      if (filters.date_from && attention.attention_date < filters.date_from) {
        return false;
      }

      if (filters.date_to && attention.attention_date > filters.date_to) {
        return false;
      }

      if (filters.vitalAlertsOnly && !hasVitalAlert(attention)) {
        return false;
      }

      if (filters.searchText.trim()) {
        const searchBase = [
          attention.patient_name,
          attention.employee_number,
          attention.area,
          attention.diagnosis,
          attention.condition_classification,
          attention.notes,
          attention.created_by_email,
          getCompanyName(companies, attention.company_id),
          getPlantName(plants, attention.plant_id),
          attention.medicines?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchBase.includes(filters.searchText.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [attentions, filters, companies, plants]);

  function updateFormField(field, value) {
    setForm((current) => {
      if (field === "company_id") {
        return {
          ...current,
          company_id: value,
          plant_id: "",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function updateFilter(field, value) {
    setFilters((current) => {
      if (field === "company_id") {
        return {
          ...current,
          company_id: value,
          plant_id: "Todos",
        };
      }

      return {
        ...current,
        [field]: value,
      };
    });
  }

  function resetFilters() {
    setFilters({
      company_id: "Todos",
      plant_id: "Todos",
      risk_level: "Todos",
      date_from: "",
      date_to: "",
      searchText: "",
      vitalAlertsOnly: false,
    });
  }

  async function saveAttention(event) {
    event.preventDefault();

    if (!canRegister) {
      alert("Tu rol no permite registrar atenciones.");
      return;
    }

    if (!form.company_id) {
      alert("Selecciona la empresa.");
      return;
    }

    if (!form.plant_id) {
      alert("Selecciona la planta.");
      return;
    }

    if (!form.patient_name.trim()) {
      alert("Captura el nombre del colaborador.");
      return;
    }

    if (!form.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const medicineQuantity = toIntegerOrZero(form.medicine_quantity);
    const medicineId = form.medicine_id || null;

    const payload = {
      company_id: form.company_id,
      plant_id: form.plant_id,
      patient_name: form.patient_name.trim(),
      employee_number: form.employee_number.trim(),
      attention_date: form.attention_date,
      area: form.area.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      condition_classification:
        form.condition_classification.trim() ||
        classifyCondition(form.diagnosis),
      risk_level: form.risk_level,
      attention_minutes: toIntegerOrZero(form.attention_minutes),
      medicine_id: medicineId,
      medicine_quantity: medicineQuantity,
      heart_rate: toNumberOrNull(form.heart_rate),
      respiratory_rate: toNumberOrNull(form.respiratory_rate),
      systolic_bp: toNumberOrNull(form.systolic_bp),
      diastolic_bp: toNumberOrNull(form.diastolic_bp),
      temperature: toNumberOrNull(form.temperature),
      notes: form.notes.trim() || null,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    };

    const { error } = await supabase.from("attentions").insert(payload);

    if (error) {
      alert("No se pudo registrar la atención: " + error.message);
      return;
    }

    if (medicineId && medicineQuantity > 0) {
      const medicine = medicines.find((item) => item.id === medicineId);

      if (medicine) {
        const nextStock = Math.max(Number(medicine.stock) - medicineQuantity, 0);

        await supabase
          .from("medicines")
          .update({ stock: nextStock })
          .eq("id", medicine.id);
      }
    }

    setForm(createInitialAttentionForm());
    await onReload();

    alert("Atención registrada.");
  }

  async function deleteAttention(id) {
    if (!canDelete) {
      alert("Solo admin puede eliminar atenciones.");
      return;
    }

    if (!confirm("¿Eliminar esta atención médica?")) return;

    const { error } = await supabase.from("attentions").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar la atención: " + error.message);
      return;
    }

    await onReload();
  }

  function exportCsv() {
    const headers = [
      "Fecha",
      "Empresa",
      "Planta",
      "Colaborador",
      "Numero empleado",
      "Area",
      "Diagnostico",
      "Clasificacion padecimiento",
      "Riesgo",
      "Tiempo minutos",
      "Medicamento",
      "Cantidad",
      "FC",
      "FR",
      "TA sistolica",
      "TA diastolica",
      "Temperatura",
      "Alerta vital",
      "Capturo",
      "Notas",
    ];

    const rows = filteredAttentions.map((attention) => [
      attention.attention_date,
      getCompanyName(companies, attention.company_id),
      getPlantName(plants, attention.plant_id),
      attention.patient_name,
      attention.employee_number,
      attention.area || "",
      attention.diagnosis || "",
      attention.condition_classification || "Sin clasificar",
      attention.risk_level,
      attention.attention_minutes || 0,
      attention.medicines?.name || getMedicineName(medicines, attention.medicine_id),
      attention.medicine_quantity || 0,
      attention.heart_rate || "",
      attention.respiratory_rate || "",
      attention.systolic_bp || "",
      attention.diastolic_bp || "",
      attention.temperature || "",
      hasVitalAlert(attention) ? "Sí" : "No",
      attention.created_by_email || "",
      attention.notes || "",
    ]);

    downloadCsv(`atenciones-medicas-${getToday()}.csv`, headers, rows);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Captura clínica in-plant
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Nueva atención médica
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Registro ligado a empresa, planta, área, diagnóstico y clasificación.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canRegister ? (
          <form onSubmit={saveAttention} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.company_id}
              onChange={(event) => updateFormField("company_id", event.target.value)}
            >
              <option value="">Seleccionar empresa</option>
              {activeCompanies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.plant_id}
              onChange={(event) => updateFormField("plant_id", event.target.value)}
              disabled={!form.company_id}
            >
              <option value="">Seleccionar planta</option>
              {availablePlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre del colaborador"
              value={form.patient_name}
              onChange={(event) => updateFormField("patient_name", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Número de empleado"
              value={form.employee_number}
              onChange={(event) =>
                updateFormField("employee_number", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={form.attention_date}
              onChange={(event) => updateFormField("attention_date", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Área / categoría"
              value={form.area}
              onChange={(event) => updateFormField("area", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Diagnóstico / descripción"
              value={form.diagnosis}
              onChange={(event) => updateFormField("diagnosis", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Clasificación del padecimiento"
              value={form.condition_classification}
              onChange={(event) =>
                updateFormField("condition_classification", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.risk_level}
              onChange={(event) => updateFormField("risk_level", event.target.value)}
            >
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>
                  Riesgo {risk}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Tiempo atención min"
              type="number"
              value={form.attention_minutes}
              onChange={(event) =>
                updateFormField("attention_minutes", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.medicine_id}
              onChange={(event) => updateFormField("medicine_id", event.target.value)}
            >
              <option value="">Sin medicamento</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} · stock {medicine.stock}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Cantidad medicamento"
              type="number"
              value={form.medicine_quantity}
              onChange={(event) =>
                updateFormField("medicine_quantity", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="FC"
              type="number"
              value={form.heart_rate}
              onChange={(event) => updateFormField("heart_rate", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="FR"
              type="number"
              value={form.respiratory_rate}
              onChange={(event) =>
                updateFormField("respiratory_rate", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA sistólica"
              type="number"
              value={form.systolic_bp}
              onChange={(event) => updateFormField("systolic_bp", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA diastólica"
              type="number"
              value={form.diastolic_bp}
              onChange={(event) =>
                updateFormField("diastolic_bp", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Temperatura"
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(event) => updateFormField("temperature", event.target.value)}
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-4"
              placeholder="Notas"
              value={form.notes}
              onChange={(event) => updateFormField("notes", event.target.value)}
            />

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-4">
              Registrar atención
            </button>
          </form>
        ) : (
          <EmptyState text="Tu rol actual no permite registrar atenciones." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Historial clínico
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Atenciones registradas
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Registros filtrados: {filteredAttentions.length}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Limpiar filtros
            </button>

            <button
              type="button"
              onClick={exportCsv}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.company_id}
            onChange={(event) => updateFilter("company_id", event.target.value)}
          >
            <option value="Todos">Todas las empresas</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.plant_id}
            onChange={(event) => updateFilter("plant_id", event.target.value)}
          >
            <option value="Todos">Todas las plantas</option>
            {filterPlants.map((plant) => (
              <option key={plant.id} value={plant.id}>
                {plant.name}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.risk_level}
            onChange={(event) => updateFilter("risk_level", event.target.value)}
          >
            <option value="Todos">Todos los riesgos</option>
            {riskOptions.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            type="date"
            value={filters.date_from}
            onChange={(event) => updateFilter("date_from", event.target.value)}
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            type="date"
            value={filters.date_to}
            onChange={(event) => updateFilter("date_to", event.target.value)}
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="Buscar"
            value={filters.searchText}
            onChange={(event) => updateFilter("searchText", event.target.value)}
          />

          <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700">
            <input
              type="checkbox"
              checked={filters.vitalAlertsOnly}
              onChange={(event) =>
                updateFilter("vitalAlertsOnly", event.target.checked)
              }
            />
            Solo alertas
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1750px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Fecha</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Planta</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Área</th>
                <th className="p-3">Diagnóstico</th>
                <th className="p-3">Clasificación</th>
                <th className="p-3">Riesgo</th>
                <th className="p-3">Signos</th>
                <th className="p-3">Medicamento</th>
                <th className="p-3">Capturó</th>
                {canDelete && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredAttentions.map((attention) => (
                <tr key={attention.id} className="border-b align-top hover:bg-zinc-50">
                  <td className="p-3">{attention.attention_date}</td>
                  <td className="p-3">
                    {getCompanyName(companies, attention.company_id)}
                  </td>
                  <td className="p-3">
                    {getPlantName(plants, attention.plant_id)}
                  </td>
                  <td className="p-3 font-bold">{attention.patient_name}</td>
                  <td className="p-3">{attention.employee_number}</td>
                  <td className="p-3">{attention.area || "-"}</td>
                  <td className="p-3">{attention.diagnosis || "-"}</td>
                  <td className="p-3">
                    {attention.condition_classification || "Sin clasificar"}
                  </td>

                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRiskBadgeClass(
                        attention.risk_level
                      )}`}
                    >
                      {attention.risk_level}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="text-xs leading-5">
                      <div>FC: {attention.heart_rate || "-"}</div>
                      <div>FR: {attention.respiratory_rate || "-"}</div>
                      <div>
                        TA: {attention.systolic_bp || "-"} /{" "}
                        {attention.diastolic_bp || "-"}
                      </div>
                      <div>Temp: {attention.temperature || "-"}</div>
                      {hasVitalAlert(attention) && (
                        <div className="mt-1 font-black text-red-700">
                          Alerta vital
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="p-3">
                    {attention.medicines?.name ||
                      getMedicineName(medicines, attention.medicine_id) ||
                      "-"}
                    {Number(attention.medicine_quantity) > 0 && (
                      <span className="block text-xs text-zinc-500">
                        Cantidad: {attention.medicine_quantity}
                      </span>
                    )}
                  </td>

                  <td className="p-3">{attention.created_by_email || "-"}</td>

                  {canDelete && (
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteAttention(attention.id)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Eliminar
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAttentions.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay atenciones registradas o no coinciden con los filtros." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InventoryModule({ medicines, userRole, onReload }) {
  const [form, setForm] = useState(createInitialMedicineForm());
  const [editingId, setEditingId] = useState(null);

  const canManage = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDelete = userRole === "admin";

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function startEdit(medicine) {
    setEditingId(medicine.id);
    setForm({
      name: medicine.name || "",
      stock: String(medicine.stock ?? ""),
      minimum_stock: String(medicine.minimum_stock ?? ""),
      unit: medicine.unit || "piezas",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(createInitialMedicineForm());
  }

  async function saveMedicine(event) {
    event.preventDefault();

    if (!canManage) {
      alert("Tu rol no permite modificar inventario.");
      return;
    }

    if (!form.name.trim()) {
      alert("Captura el nombre del medicamento.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      stock: toIntegerOrZero(form.stock),
      minimum_stock: toIntegerOrZero(form.minimum_stock),
      unit: form.unit.trim() || "piezas",
    };

    if (editingId) {
      const { error } = await supabase
        .from("medicines")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        alert("No se pudo actualizar medicamento: " + error.message);
        return;
      }

      cancelEdit();
      await onReload();
      return;
    }

    const { error } = await supabase.from("medicines").insert(payload);

    if (error) {
      alert("No se pudo registrar medicamento: " + error.message);
      return;
    }

    setForm(createInitialMedicineForm());
    await onReload();
  }

  async function deleteMedicine(id) {
    if (!canDelete) {
      alert("Solo admin puede eliminar medicamentos.");
      return;
    }

    if (!confirm("¿Eliminar este medicamento?")) return;

    const { error } = await supabase.from("medicines").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar medicamento: " + error.message);
      return;
    }

    await onReload();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Inventario médico
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {editingId ? "Editar medicamento" : "Registrar medicamento"}
          </h2>
        </div>

        {canManage ? (
          <form onSubmit={saveMedicine} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Medicamento"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Stock"
              type="number"
              value={form.stock}
              onChange={(event) => updateField("stock", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Mínimo"
              type="number"
              value={form.minimum_stock}
              onChange={(event) => updateField("minimum_stock", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Unidad"
              value={form.unit}
              onChange={(event) => updateField("unit", event.target.value)}
            />

            <div className="flex flex-col gap-2 md:col-span-4 md:flex-row">
              <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800">
                {editingId ? "Guardar medicamento" : "Registrar medicamento"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-2xl border border-zinc-300 px-5 py-4 font-black text-zinc-700 hover:bg-zinc-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        ) : (
          <EmptyState text="Tu rol actual solo permite consulta de inventario." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Stock disponible
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Medicamentos e insumos
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Medicamento</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Mínimo</th>
                <th className="p-3">Unidad</th>
                <th className="p-3">Estado</th>
                {canManage && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {medicines.map((medicine) => {
                const lowStock =
                  Number(medicine.stock) <= Number(medicine.minimum_stock);

                return (
                  <tr key={medicine.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3 font-bold">{medicine.name}</td>
                    <td className="p-3">{medicine.stock}</td>
                    <td className="p-3">{medicine.minimum_stock}</td>
                    <td className="p-3">{medicine.unit}</td>
                    <td className="p-3">
                      {lowStock ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          Bajo stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          Suficiente
                        </span>
                      )}
                    </td>

                    {canManage && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => startEdit(medicine)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Editar
                        </button>

                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => deleteMedicine(medicine.id)}
                            className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                          >
                            Eliminar
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {medicines.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay medicamentos registrados." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ReportList({ title, items, empty = "Sin información." }) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-black tracking-tight">{title}</h3>

      <div className="mt-4 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3"
            >
              <span className="text-sm font-bold text-zinc-700">{item.label}</span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                {item.value}
              </span>
            </div>
          ))
        ) : (
          <EmptyState text={empty} />
        )}
      </div>
    </section>
  );
}

function ReportsModule({ attentions, medicines, companies, plants }) {
  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());
  const [companyFilter, setCompanyFilter] = useState("Todos");
  const [plantFilter, setPlantFilter] = useState("Todos");

  const availablePlants = useMemo(() => {
    if (companyFilter === "Todos") return plants.filter((plant) => plant.active);
    return getPlantsForCompany(plants, companyFilter);
  }, [plants, companyFilter]);

  const monthOptions = useMemo(() => {
    const months = attentions
      .map((attention) => getMonthKey(attention.attention_date))
      .filter(Boolean);

    return Array.from(new Set([getCurrentMonthKey(), ...months])).sort().reverse();
  }, [attentions]);

  const reportAttentions = useMemo(() => {
    return attentions.filter((attention) => {
      if (getMonthKey(attention.attention_date) !== reportMonth) return false;

      if (companyFilter !== "Todos" && attention.company_id !== companyFilter) {
        return false;
      }

      if (plantFilter !== "Todos" && attention.plant_id !== plantFilter) {
        return false;
      }

      return true;
    });
  }, [attentions, reportMonth, companyFilter, plantFilter]);

  function normalizeForGrouping(value, fallback = "Sin dato") {
    const raw = String(value || "").trim();

    if (!raw) return fallback;

    return raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function cleanLabel(value, fallback = "Sin dato") {
    const raw = String(value || "").trim();
    return raw || fallback;
  }

  function getTopFromMap(mapObject, fallback = "Sin dato") {
    const entries = Array.from(mapObject.entries());

    if (entries.length === 0) {
      return {
        label: fallback,
        value: 0,
      };
    }

    const [label, value] = entries.sort((a, b) => b[1] - a[1])[0];

    return {
      label,
      value,
    };
  }

  const report = useMemo(() => {
    const byRisk = riskOptions.map((risk) => ({
      label: risk,
      value: reportAttentions.filter((attention) => attention.risk_level === risk)
        .length,
    }));

    const highRisk = reportAttentions.filter((attention) =>
      ["Alto", "Crítico"].includes(attention.risk_level)
    ).length;

    const vitalAlerts = reportAttentions.filter(hasVitalAlert).length;

    const averageMinutes =
      reportAttentions.length > 0
        ? Math.round(
            reportAttentions.reduce(
              (sum, attention) => sum + Number(attention.attention_minutes || 0),
              0
            ) / reportAttentions.length
          )
        : 0;

    const byCompany = companies
      .map((company) => ({
        label: company.name,
        value: reportAttentions.filter(
          (attention) => attention.company_id === company.id
        ).length,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const byPlant = plants
      .map((plant) => ({
        label: `${getCompanyName(companies, plant.company_id)} · ${plant.name}`,
        value: reportAttentions.filter((attention) => attention.plant_id === plant.id)
          .length,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const byAreaMap = new Map();

    reportAttentions.forEach((attention) => {
      const area = cleanLabel(attention.area, "Sin área");
      byAreaMap.set(area, (byAreaMap.get(area) || 0) + 1);
    });

    const byArea = Array.from(byAreaMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const byClassificationMap = new Map();

    reportAttentions.forEach((attention) => {
      const classification = cleanLabel(
        attention.condition_classification,
        "Sin clasificar"
      );

      byClassificationMap.set(
        classification,
        (byClassificationMap.get(classification) || 0) + 1
      );
    });

    const byClassification = Array.from(byClassificationMap.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const frequentUsersMap = new Map();

    reportAttentions.forEach((attention) => {
      const patientName = cleanLabel(attention.patient_name, "Sin nombre");
      const employeeNumber = cleanLabel(attention.employee_number, "Sin número");

      const isGeneratedEmployeeNumber = String(employeeNumber).startsWith(
        "SIN-NUMERO-FILA"
      );

      const key = isGeneratedEmployeeNumber
        ? `sin-numero|${normalizeForGrouping(patientName)}`
        : `${normalizeForGrouping(employeeNumber)}|${normalizeForGrouping(
            patientName
          )}`;

      if (!frequentUsersMap.has(key)) {
        frequentUsersMap.set(key, {
          patient_name: patientName,
          employee_number: isGeneratedEmployeeNumber
            ? "Sin número real"
            : employeeNumber,
          count: 0,
          high_risk_count: 0,
          vital_alert_count: 0,
          areas: new Map(),
          diagnoses: new Map(),
          classifications: new Map(),
          last_attention_date: "",
        });
      }

      const current = frequentUsersMap.get(key);

      current.count += 1;

      if (["Alto", "Crítico"].includes(attention.risk_level)) {
        current.high_risk_count += 1;
      }

      if (hasVitalAlert(attention)) {
        current.vital_alert_count += 1;
      }

      const area = cleanLabel(attention.area, "Sin área");
      current.areas.set(area, (current.areas.get(area) || 0) + 1);

      const diagnosis = cleanLabel(attention.diagnosis, "Sin diagnóstico");
      current.diagnoses.set(diagnosis, (current.diagnoses.get(diagnosis) || 0) + 1);

      const classification = cleanLabel(
        attention.condition_classification,
        "Sin clasificar"
      );
      current.classifications.set(
        classification,
        (current.classifications.get(classification) || 0) + 1
      );

      if (
        !current.last_attention_date ||
        attention.attention_date > current.last_attention_date
      ) {
        current.last_attention_date = attention.attention_date;
      }
    });

    const frequentUsers = Array.from(frequentUsersMap.values())
      .map((item) => {
        const topArea = getTopFromMap(item.areas, "Sin área");
        const topDiagnosis = getTopFromMap(item.diagnoses, "Sin diagnóstico");
        const topClassification = getTopFromMap(
          item.classifications,
          "Sin clasificar"
        );

        return {
          ...item,
          top_area: topArea.label,
          top_diagnosis: topDiagnosis.label,
          top_classification: topClassification.label,
        };
      })
      .filter((item) => item.count >= 2)
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return String(b.last_attention_date).localeCompare(
          String(a.last_attention_date)
        );
      });

    const diagnosisMap = new Map();

    reportAttentions.forEach((attention) => {
      const diagnosis = cleanLabel(attention.diagnosis, "Sin diagnóstico");
      const key = normalizeForGrouping(diagnosis);

      if (!diagnosisMap.has(key)) {
        diagnosisMap.set(key, {
          diagnosis,
          count: 0,
          high_risk_count: 0,
          areas: new Map(),
          classifications: new Map(),
        });
      }

      const current = diagnosisMap.get(key);

      current.count += 1;

      if (["Alto", "Crítico"].includes(attention.risk_level)) {
        current.high_risk_count += 1;
      }

      const area = cleanLabel(attention.area, "Sin área");
      current.areas.set(area, (current.areas.get(area) || 0) + 1);

      const classification = cleanLabel(
        attention.condition_classification,
        "Sin clasificar"
      );
      current.classifications.set(
        classification,
        (current.classifications.get(classification) || 0) + 1
      );
    });

    const frequentDiagnoses = Array.from(diagnosisMap.values())
      .map((item) => {
        const topArea = getTopFromMap(item.areas, "Sin área");
        const topClassification = getTopFromMap(
          item.classifications,
          "Sin clasificar"
        );

        return {
          ...item,
          top_area: topArea.label,
          top_classification: topClassification.label,
          percentage:
            reportAttentions.length > 0
              ? Math.round((item.count / reportAttentions.length) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 25);

    const classificationByAreaMap = new Map();

    reportAttentions.forEach((attention) => {
      const area = cleanLabel(attention.area, "Sin área");
      const classification = cleanLabel(
        attention.condition_classification,
        "Sin clasificar"
      );

      if (!classificationByAreaMap.has(area)) {
        classificationByAreaMap.set(area, {
          area,
          total: 0,
          classifications: new Map(),
        });
      }

      const current = classificationByAreaMap.get(area);

      current.total += 1;
      current.classifications.set(
        classification,
        (current.classifications.get(classification) || 0) + 1
      );
    });

    const classificationByArea = Array.from(classificationByAreaMap.values())
      .map((item) => {
        const topClassification = getTopFromMap(
          item.classifications,
          "Sin clasificar"
        );

        return {
          area: item.area,
          total: item.total,
          top_classification: topClassification.label,
          top_classification_count: topClassification.value,
          percentage:
            item.total > 0
              ? Math.round((topClassification.value / item.total) * 100)
              : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    return {
      total: reportAttentions.length,
      highRisk,
      vitalAlerts,
      averageMinutes,
      byRisk,
      byCompany,
      byPlant,
      byArea,
      byClassification,
      frequentUsers,
      frequentDiagnoses,
      classificationByArea,
      recurrentUsersCount: frequentUsers.length,
    };
  }, [reportAttentions, companies, plants]);

  function exportMonthlyReportCsv() {
    const headers = [
      "Fecha",
      "Empresa",
      "Planta",
      "Colaborador",
      "Empleado",
      "Area",
      "Diagnostico",
      "Clasificacion padecimiento",
      "Riesgo",
      "Alerta vital",
      "Medicamento",
      "Capturo",
    ];

    const rows = reportAttentions.map((attention) => [
      attention.attention_date,
      getCompanyName(companies, attention.company_id),
      getPlantName(plants, attention.plant_id),
      attention.patient_name,
      attention.employee_number,
      attention.area || "",
      attention.diagnosis || "",
      attention.condition_classification || "Sin clasificar",
      attention.risk_level,
      hasVitalAlert(attention) ? "Sí" : "No",
      attention.medicines?.name || getMedicineName(medicines, attention.medicine_id),
      attention.created_by_email || "",
    ]);

    downloadCsv(`reporte-medico-${reportMonth}.csv`, headers, rows);
  }

  function exportDetailedClinicalReportCsv() {
    const headers = [
      "Seccion",
      "Campo principal",
      "Campo secundario",
      "Conteo",
      "Porcentaje / detalle",
      "Ultima atencion",
    ];

    const rows = [];

    report.frequentUsers.forEach((item) => {
      rows.push([
        "Colaboradores frecuentes",
        `${item.patient_name} (${item.employee_number})`,
        `Área frecuente: ${item.top_area} | Clasificación frecuente: ${item.top_classification}`,
        item.count,
        `Diagnóstico frecuente: ${item.top_diagnosis} | Alto/Crítico: ${item.high_risk_count} | Alertas vitales: ${item.vital_alert_count}`,
        item.last_attention_date,
      ]);
    });

    report.frequentDiagnoses.forEach((item) => {
      rows.push([
        "Diagnósticos frecuentes",
        item.diagnosis,
        `Área más asociada: ${item.top_area} | Clasificación: ${item.top_classification}`,
        item.count,
        `${item.percentage}% del periodo | Alto/Crítico: ${item.high_risk_count}`,
        "",
      ]);
    });

    report.classificationByArea.forEach((item) => {
      rows.push([
        "Clasificación más frecuente por área",
        item.area,
        item.top_classification,
        item.top_classification_count,
        `${item.percentage}% del área | Total área: ${item.total}`,
        "",
      ]);
    });

    downloadCsv(`reporte-clinico-detallado-${reportMonth}.csv`, headers, rows);
  }

  function resetPlantWhenCompanyChanges(value) {
    setCompanyFilter(value);
    setPlantFilter("Todos");
  }

  function DetailedTable({ title, subtitle, columns, rows, renderRow, empty }) {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h3 className="text-xl font-black tracking-tight">{title}</h3>
          {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
        </div>

        {rows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  {columns.map((column) => (
                    <th key={column} className="p-3">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>{rows.map(renderRow)}</tbody>
            </table>
          </div>
        ) : (
          <EmptyState text={empty || "Sin información para mostrar."} />
        )}
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Inteligencia operativa
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Reporte mensual médico
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              {getMonthLabel(reportMonth)} · {report.total} atenciones
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
              value={reportMonth}
              onChange={(event) => setReportMonth(event.target.value)}
            >
              {monthOptions.map((month) => (
                <option key={month} value={month}>
                  {getMonthLabel(month)}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
              value={companyFilter}
              onChange={(event) => resetPlantWhenCompanyChanges(event.target.value)}
            >
              <option value="Todos">Todas las empresas</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
              value={plantFilter}
              onChange={(event) => setPlantFilter(event.target.value)}
            >
              <option value="Todos">Todas las plantas</option>
              {availablePlants.map((plant) => (
                <option key={plant.id} value={plant.id}>
                  {plant.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={exportMonthlyReportCsv}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar atenciones
            </button>

            <button
              type="button"
              onClick={exportDetailedClinicalReportCsv}
              className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-bold text-white hover:bg-red-800"
            >
              Exportar detallado
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <KpiCard
            label="Atenciones"
            value={report.total}
            helper="En el periodo"
            tone="dark"
          />
          <KpiCard
            label="Alto / crítico"
            value={report.highRisk}
            helper="Eventos prioritarios"
            tone={report.highRisk > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Alertas vitales"
            value={report.vitalAlerts}
            helper="Signos fuera de rango"
            tone={report.vitalAlerts > 0 ? "amber" : "neutral"}
          />
          <KpiCard
            label="Recurrentes"
            value={report.recurrentUsersCount}
            helper="2 o más atenciones"
            tone={report.recurrentUsersCount > 0 ? "blue" : "neutral"}
          />
          <KpiCard
            label="Tiempo promedio"
            value={`${report.averageMinutes} min`}
            helper="Por atención"
          />
        </div>
      </section>

      <DetailedTable
        title="Colaboradores frecuentes"
        subtitle="Colaboradores con 2 o más atenciones durante el periodo filtrado."
        columns={[
          "Colaborador",
          "Empleado",
          "Atenciones",
          "Área frecuente",
          "Diagnóstico frecuente",
          "Clasificación frecuente",
          "Alto/Crítico",
          "Alertas vitales",
          "Última atención",
        ]}
        rows={report.frequentUsers}
        empty="No hay colaboradores recurrentes en el periodo."
        renderRow={(item) => (
          <tr
            key={`${item.employee_number}-${item.patient_name}`}
            className="border-b align-top hover:bg-zinc-50"
          >
            <td className="p-3 font-bold">{item.patient_name}</td>
            <td className="p-3">{item.employee_number}</td>
            <td className="p-3">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                {item.count}
              </span>
            </td>
            <td className="p-3">{item.top_area}</td>
            <td className="p-3">{item.top_diagnosis}</td>
            <td className="p-3">{item.top_classification}</td>
            <td className="p-3">
              {item.high_risk_count > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                  {item.high_risk_count}
                </span>
              ) : (
                "0"
              )}
            </td>
            <td className="p-3">
              {item.vital_alert_count > 0 ? (
                <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-800">
                  {item.vital_alert_count}
                </span>
              ) : (
                "0"
              )}
            </td>
            <td className="p-3">{item.last_attention_date || "-"}</td>
          </tr>
        )}
      />

      <DetailedTable
        title="Diagnósticos frecuentes"
        subtitle="Diagnósticos más repetidos en el periodo filtrado."
        columns={[
          "Diagnóstico",
          "Frecuencia",
          "% del periodo",
          "Área más asociada",
          "Clasificación",
          "Alto/Crítico",
        ]}
        rows={report.frequentDiagnoses}
        empty="No hay diagnósticos registrados en el periodo."
        renderRow={(item) => (
          <tr
            key={`${item.diagnosis}-${item.top_area}`}
            className="border-b align-top hover:bg-zinc-50"
          >
            <td className="p-3 font-bold">{item.diagnosis}</td>
            <td className="p-3">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                {item.count}
              </span>
            </td>
            <td className="p-3">{item.percentage}%</td>
            <td className="p-3">{item.top_area}</td>
            <td className="p-3">{item.top_classification}</td>
            <td className="p-3">
              {item.high_risk_count > 0 ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                  {item.high_risk_count}
                </span>
              ) : (
                "0"
              )}
            </td>
          </tr>
        )}
      />

      <DetailedTable
        title="Clasificación más frecuente por área"
        subtitle="Identifica el tipo de padecimiento predominante en cada área."
        columns={[
          "Área",
          "Clasificación predominante",
          "Eventos de esa clasificación",
          "Total del área",
          "% dentro del área",
        ]}
        rows={report.classificationByArea}
        empty="No hay áreas con clasificaciones registradas en el periodo."
        renderRow={(item) => (
          <tr key={item.area} className="border-b align-top hover:bg-zinc-50">
            <td className="p-3 font-bold">{item.area}</td>
            <td className="p-3">{item.top_classification}</td>
            <td className="p-3">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
                {item.top_classification_count}
              </span>
            </td>
            <td className="p-3">{item.total}</td>
            <td className="p-3">{item.percentage}%</td>
          </tr>
        )}
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ReportList title="Distribución por riesgo" items={report.byRisk} />

        <ReportList
          title="Padecimientos más frecuentes"
          items={report.byClassification}
          empty="Sin clasificaciones registradas en el periodo."
        />

        <ReportList
          title="Atenciones por empresa"
          items={report.byCompany}
          empty="Sin empresas con registros en el periodo."
        />

        <ReportList
          title="Atenciones por planta"
          items={report.byPlant}
          empty="Sin plantas con registros en el periodo."
        />

        <ReportList
          title="Atenciones por área"
          items={report.byArea}
          empty="Sin áreas con registros en el periodo."
        />
      </section>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState("");
  const [activeModule, setActiveModule] = useState("dashboard");

  const [attentions, setAttentions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);

  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function initSession() {
      const { data } = await supabase.auth.getSession();
      setSession(data.session || null);
      setLoadingSession(false);
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setUserRole("");
      return;
    }

    loadUserRole();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session || !userRole || userRole === "bloqueado") return;
    loadOperationalData();
  }, [session, userRole]);

  async function loadUserRole() {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      alert("No se pudo cargar el rol del usuario: " + error.message);
      setUserRole("");
      return;
    }

    setUserRole(data?.role || "lectura");
  }

  async function loadOperationalData() {
    setLoadingData(true);

    const [attentionsResponse, medicinesResponse, companiesResponse, plantsResponse] =
      await Promise.all([
        supabase
          .from("attentions")
          .select("*, medicines:medicine_id(name, unit)")
          .order("created_at", { ascending: false }),
        supabase.from("medicines").select("*").order("name", { ascending: true }),
        supabase.from("companies").select("*").order("name", { ascending: true }),
        supabase.from("company_plants").select("*").order("name", { ascending: true }),
      ]);

    if (attentionsResponse.error) {
      alert("Error cargando atenciones: " + attentionsResponse.error.message);
    } else {
      setAttentions(attentionsResponse.data || []);
    }

    if (medicinesResponse.error) {
      alert("Error cargando inventario: " + medicinesResponse.error.message);
    } else {
      setMedicines(medicinesResponse.data || []);
    }

    if (companiesResponse.error) {
      alert("Error cargando empresas: " + companiesResponse.error.message);
    } else {
      setCompanies(companiesResponse.data || []);
    }

    if (plantsResponse.error) {
      alert("Error cargando plantas: " + plantsResponse.error.message);
    } else {
      setPlants(plantsResponse.data || []);
    }

    setLoadingData(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole("");
    setAttentions([]);
    setMedicines([]);
    setCompanies([]);
    setPlants([]);
    setActiveModule("dashboard");
  }

  if (loadingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-400">
            SOS MedicalOps
          </p>
          <p className="mt-2 text-sm text-zinc-300">Cargando sesión...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (userRole === "bloqueado") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6">
        <section className="max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">
            Acceso bloqueado
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight">
            Tu usuario no tiene acceso operativo.
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Contacta al administrador de SOS MedicalOps para revisar tu acceso.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="mt-6 rounded-2xl bg-zinc-950 px-5 py-3 text-sm font-black text-white"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col border-r border-white/10 bg-zinc-950 p-5 text-white lg:flex">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-white">
            <img src="/logo.png" alt="SOS" className="h-11 w-11 object-contain" />
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-400">
              SOS
            </p>
            <h1 className="text-lg font-black leading-tight">MedicalOps</h1>
          </div>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveModule(item.id)}
              className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                activeModule === item.id
                  ? "bg-red-700 text-white"
                  : "text-zinc-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="font-black">{item.label}</div>
              <div className="text-xs opacity-70">{item.subtitle}</div>
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-2xl bg-white/10 p-4">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">
            Usuario
          </p>
          <p className="mt-2 truncate text-sm font-bold">{session.user.email}</p>
          <p className="mt-1 text-xs text-zinc-400">
            Rol: {userRole || "cargando"}
          </p>

          <button
            type="button"
            onClick={signOut}
            className="mt-4 w-full rounded-xl bg-white px-3 py-2 text-sm font-black text-zinc-950"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">
                SOS MedicalOps
              </p>
              <h2 className="text-2xl font-black tracking-tight">
                {navItems.find((item) => item.id === activeModule)?.label ||
                  "Dashboard"}
              </h2>
            </div>

            <div className="flex flex-wrap gap-2 lg:hidden">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`rounded-xl px-3 py-2 text-xs font-black ${
                    activeModule === item.id
                      ? "bg-red-700 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="hidden items-center gap-3 md:flex">
              {loadingData && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  Actualizando...
                </span>
              )}

              <button
                type="button"
                onClick={loadOperationalData}
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Actualizar datos
              </button>
            </div>
          </div>
        </header>

        <div className="p-5">
          {activeModule === "dashboard" && (
            <DashboardModule
              attentions={attentions}
              medicines={medicines}
              companies={companies}
              plants={plants}
            />
          )}

          {activeModule === "empresas" && (
            <CompaniesPlantsModule session={session} userRole={userRole} />
          )}

          {activeModule === "admin" && (
            <AdminAccessModule
              session={session}
              userRole={userRole}
              companies={companies}
              plants={plants}
            />
          )}

          {activeModule === "importar" && (
            <ExcelImportModule
              session={session}
              userRole={userRole}
              companies={companies}
              plants={plants}
              medicines={medicines}
              onReload={loadOperationalData}
            />
          )}

          {activeModule === "atenciones" && (
            <AttentionModule
              session={session}
              userRole={userRole}
              attentions={attentions}
              medicines={medicines}
              companies={companies}
              plants={plants}
              onReload={loadOperationalData}
            />
          )}

          {activeModule === "antidoping" && (
            <AntidopingModule session={session} userRole={userRole} />
          )}

          {activeModule === "cronicos" && (
            <ChronicDegenerativeModule session={session} userRole={userRole} />
          )}

          {activeModule === "inventario" && (
            <InventoryModule
              medicines={medicines}
              userRole={userRole}
              onReload={loadOperationalData}
            />
          )}

          {activeModule === "reportes" && (
            <ReportsModule
              attentions={attentions}
              medicines={medicines}
              companies={companies}
              plants={plants}
            />
          )}
        </div>
      </main>
    </div>
  );
}