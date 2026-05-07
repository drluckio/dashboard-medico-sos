import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import AntidopingModule from "./AntidopingModule.jsx";
import ChronicDegenerativeModule from "./ChronicDegenerativeModule.jsx";
import CompaniesPlantsModule from "./CompaniesPlantsModule.jsx";

const riskLevels = ["Bajo", "Medio", "Alto", "Crítico"];

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    subtitle: "Centro de mando",
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
{
  id: "empresas",
  label: "Empresas",
  subtitle: "Clientes y plantas",
},
];

function createInitialAttentionForm() {
  return {
    patient_name: "",
    employee_number: "",
    attention_date: new Date().toISOString().slice(0, 10),
    area: "",
    diagnosis: "",
    risk_level: "Bajo",
    attention_minutes: "",
    medicine_id: "",
    medicine_quantity: "",
    notes: "",
    heart_rate: "",
    respiratory_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    temperature: "",
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
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

function downloadCsv(filename, headers, rows) {
  const csvContent =
    "\uFEFF" +
    [headers, ...rows]
      .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
      .join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function getTodayForFileName() {
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

function getRiskBadgeClass(risk) {
  if (risk === "Crítico") {
    return "bg-red-100 text-red-800 ring-red-200";
  }

  if (risk === "Alto") {
    return "bg-orange-100 text-orange-800 ring-orange-200";
  }

  if (risk === "Medio") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function buildVitalAlerts(attention) {
  const alerts = [];

  const heartRate = Number(attention.heart_rate);
  const respiratoryRate = Number(attention.respiratory_rate);
  const systolic = Number(attention.systolic_bp);
  const diastolic = Number(attention.diastolic_bp);
  const temperature = Number(attention.temperature);

  if (attention.heart_rate !== null && attention.heart_rate !== undefined) {
    if (heartRate < 50) alerts.push("FC baja");
    if (heartRate > 120) alerts.push("FC elevada");
  }

  if (
    attention.respiratory_rate !== null &&
    attention.respiratory_rate !== undefined
  ) {
    if (respiratoryRate < 10) alerts.push("FR baja");
    if (respiratoryRate > 24) alerts.push("FR elevada");
  }

  if (attention.systolic_bp !== null && attention.systolic_bp !== undefined) {
    if (systolic < 90) alerts.push("TA sistólica baja");
    if (systolic >= 180) alerts.push("TA sistólica crítica");
  }

  if (attention.diastolic_bp !== null && attention.diastolic_bp !== undefined) {
    if (diastolic < 50) alerts.push("TA diastólica baja");
    if (diastolic >= 120) alerts.push("TA diastólica crítica");
  }

  if (attention.temperature !== null && attention.temperature !== undefined) {
    if (temperature < 35.5) alerts.push("Temperatura baja");
    if (temperature >= 38) alerts.push("Fiebre");
  }

  return alerts;
}

function buildCountList(items, getValue, limit = 8) {
  const counts = {};

  items.forEach((item) => {
    const rawValue = getValue(item);
    const value =
      rawValue === null ||
      rawValue === undefined ||
      String(rawValue).trim() === ""
        ? "Sin especificar"
        : String(rawValue).trim();

    counts[value] = (counts[value] || 0) + 1;
  });

  return Object.entries(counts)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
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

function ReportList({ title, items }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
      <h3 className="mb-4 text-lg font-black tracking-tight">{title}</h3>

      <div className="space-y-2">
        {items.length > 0 ? (
          items.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-900"
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </div>
          ))
        ) : (
          <EmptyState text="Sin registros." />
        )}
      </div>
    </div>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    if (!email.trim()) {
      alert("Captura tu correo.");
      return;
    }

    if (mode !== "recover" && !password.trim()) {
      alert("Captura tu contraseña.");
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        alert("No se pudo iniciar sesión: " + error.message);
      }

      return;
    }

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        alert("No se pudo crear la cuenta: " + error.message);
      } else {
        alert(
          "Cuenta creada. Si Supabase requiere confirmación, revisa el correo."
        );
      }

      return;
    }

    if (mode === "recover") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        alert("No se pudo enviar recuperación: " + error.message);
      } else {
        alert("Revisa tu correo para recuperar la contraseña.");
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="SOS"
            className="mx-auto mb-5 h-20 w-auto object-contain"
          />

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
            SOS MedicalOps
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Centro médico-operativo
          </h1>

          <p className="mt-3 text-sm text-zinc-400">
            Plataforma de control clínico industrial, trazabilidad y reportes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-red-700/30 placeholder:text-zinc-500 focus:ring-4"
            placeholder="Correo"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {mode !== "recover" && (
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white outline-none ring-red-700/30 placeholder:text-zinc-500 focus:ring-4"
              placeholder="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          )}

          <button className="w-full rounded-2xl bg-red-700 px-5 py-4 font-black text-white hover:bg-red-800">
            {mode === "login"
              ? "Iniciar sesión"
              : mode === "register"
              ? "Crear cuenta"
              : "Enviar recuperación"}
          </button>
        </form>

        <div className="mt-5 grid grid-cols-1 gap-2 text-sm">
          <button
            type="button"
            onClick={() => setMode("login")}
            className="rounded-xl px-3 py-2 text-zinc-300 hover:bg-white/10"
          >
            Iniciar sesión
          </button>

          <button
            type="button"
            onClick={() => setMode("register")}
            className="rounded-xl px-3 py-2 text-zinc-300 hover:bg-white/10"
          >
            Crear usuario
          </button>

          <button
            type="button"
            onClick={() => setMode("recover")}
            className="rounded-xl px-3 py-2 text-zinc-300 hover:bg-white/10"
          >
            Recuperar contraseña
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [activeModule, setActiveModule] = useState("dashboard");

  const [attentions, setAttentions] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [attentionForm, setAttentionForm] = useState(createInitialAttentionForm());
  const [medicineForm, setMedicineForm] = useState(createInitialMedicineForm());
  const [loadingData, setLoadingData] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    risk: "Todos",
    area: "Todas",
    employeeNumber: "",
    capturer: "Todos",
    searchText: "",
    vitalAlertsOnly: false,
  });

  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());

  const canCreateAttention = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDeleteAttention = userRole === "admin";

  const canCreateMedicine = ["admin", "enfermeria"].includes(userRole);
  const canEditMedicine = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDeleteMedicine = userRole === "admin";

  useEffect(() => {
    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);

      if (nextSession?.user) {
        loadUserRole(nextSession.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user && userRole) {
      loadMainData();
    }
  }, [session, userRole]);

  async function initializeAuth() {
    const { data } = await supabase.auth.getSession();

    setSession(data.session);
    setAuthLoading(false);

    if (data.session?.user) {
      await loadUserRole(data.session.user.id);
    }
  }

  async function loadUserRole(userId) {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      alert("No se pudo cargar el rol del usuario: " + error.message);
      setUserRole(null);
      return;
    }

    setUserRole(data?.role || "lectura");
  }

  async function loadMainData() {
    setLoadingData(true);

    const [attentionsResponse, medicinesResponse] = await Promise.all([
      supabase
        .from("attentions")
        .select(
          `
          *,
          medicines (
            id,
            name,
            unit
          )
        `
        )
        .order("attention_date", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("medicines")
        .select("*")
        .order("name", { ascending: true }),
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

    setLoadingData(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUserRole(null);
    setAttentions([]);
    setMedicines([]);
  }

  function updateAttentionField(field, value) {
    setAttentionForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateMedicineField(field, value) {
    setMedicineForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetFilters() {
    setFilters({
      startDate: "",
      endDate: "",
      risk: "Todos",
      area: "Todas",
      employeeNumber: "",
      capturer: "Todos",
      searchText: "",
      vitalAlertsOnly: false,
    });
  }

  const uniqueAreas = useMemo(() => {
    const areas = attentions
      .map((item) => item.area)
      .filter(Boolean)
      .map((area) => area.trim())
      .filter(Boolean);

    return ["Todas", ...Array.from(new Set(areas)).sort()];
  }, [attentions]);

  const uniqueCapturers = useMemo(() => {
    const capturers = attentions
      .map((item) => item.created_by_email)
      .filter(Boolean)
      .map((email) => email.trim())
      .filter(Boolean);

    return ["Todos", ...Array.from(new Set(capturers)).sort()];
  }, [attentions]);

  const monthOptions = useMemo(() => {
    const months = attentions
      .map((item) => getMonthKey(item.attention_date))
      .filter(Boolean);

    return Array.from(new Set([getCurrentMonthKey(), ...months]))
      .filter(Boolean)
      .sort()
      .reverse();
  }, [attentions]);

  const filteredAttentions = useMemo(() => {
    return attentions.filter((attention) => {
      const attentionDate = attention.attention_date || "";

      if (filters.startDate && attentionDate < filters.startDate) return false;
      if (filters.endDate && attentionDate > filters.endDate) return false;

      if (filters.risk !== "Todos" && attention.risk_level !== filters.risk) {
        return false;
      }

      if (filters.area !== "Todas" && attention.area !== filters.area) {
        return false;
      }

      if (
        filters.capturer !== "Todos" &&
        attention.created_by_email !== filters.capturer
      ) {
        return false;
      }

      if (
        filters.employeeNumber.trim() &&
        !String(attention.employee_number || "")
          .toLowerCase()
          .includes(filters.employeeNumber.trim().toLowerCase())
      ) {
        return false;
      }

      if (filters.vitalAlertsOnly && buildVitalAlerts(attention).length === 0) {
        return false;
      }

      if (filters.searchText.trim()) {
        const searchBase = [
          attention.patient_name,
          attention.employee_number,
          attention.area,
          attention.diagnosis,
          attention.risk_level,
          attention.notes,
          attention.created_by_email,
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
  }, [attentions, filters]);

  const monthlyAttentions = useMemo(() => {
    return attentions.filter(
      (attention) => getMonthKey(attention.attention_date) === reportMonth
    );
  }, [attentions, reportMonth]);

  const dashboardKpis = useMemo(() => {
    const highRisk = filteredAttentions.filter((item) =>
      ["Alto", "Crítico"].includes(item.risk_level)
    );

    const alertCount = filteredAttentions.filter(
      (item) => buildVitalAlerts(item).length > 0
    );

    const averageMinutes =
      filteredAttentions.length > 0
        ? Math.round(
            filteredAttentions.reduce(
              (sum, item) => sum + Number(item.attention_minutes || 0),
              0
            ) / filteredAttentions.length
          )
        : 0;

    const lowStock = medicines.filter(
      (medicine) => Number(medicine.stock) <= Number(medicine.minimum_stock)
    );

    return {
      total: filteredAttentions.length,
      highRisk: highRisk.length,
      alerts: alertCount.length,
      averageMinutes,
      lowStock: lowStock.length,
    };
  }, [filteredAttentions, medicines]);

  const monthlyReport = useMemo(() => {
    const vitalAlerts = monthlyAttentions.filter(
      (item) => buildVitalAlerts(item).length > 0
    );

    return {
      total: monthlyAttentions.length,
      highRisk: monthlyAttentions.filter((item) =>
        ["Alto", "Crítico"].includes(item.risk_level)
      ).length,
      vitalAlerts: vitalAlerts.length,
      averageMinutes:
        monthlyAttentions.length > 0
          ? Math.round(
              monthlyAttentions.reduce(
                (sum, item) => sum + Number(item.attention_minutes || 0),
                0
              ) / monthlyAttentions.length
            )
          : 0,
      byRisk: buildCountList(monthlyAttentions, (item) => item.risk_level),
      byDiagnosis: buildCountList(monthlyAttentions, (item) => item.diagnosis),
      byArea: buildCountList(monthlyAttentions, (item) => item.area),
      byCapturer: buildCountList(
        monthlyAttentions,
        (item) => item.created_by_email
      ),
      byMedicine: buildCountList(
        monthlyAttentions,
        (item) => item.medicines?.name
      ),
    };
  }, [monthlyAttentions]);

  async function saveAttention(event) {
    event.preventDefault();

    if (!canCreateAttention) {
      alert("Tu rol no permite registrar atenciones.");
      return;
    }

    if (!attentionForm.patient_name.trim()) {
      alert("Captura el nombre del paciente.");
      return;
    }

    if (!attentionForm.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const medicineQuantity = toIntegerOrZero(attentionForm.medicine_quantity);
    const medicineId = attentionForm.medicine_id || null;

    if (medicineId && medicineQuantity <= 0) {
      alert("Captura una cantidad válida del medicamento.");
      return;
    }

    const selectedMedicine = medicines.find((item) => item.id === medicineId);

    if (selectedMedicine && medicineQuantity > Number(selectedMedicine.stock)) {
      alert("La cantidad indicada supera el stock disponible.");
      return;
    }

    const payload = {
      patient_name: attentionForm.patient_name.trim(),
      employee_number: attentionForm.employee_number.trim(),
      attention_date: attentionForm.attention_date,
      area: attentionForm.area.trim() || null,
      diagnosis: attentionForm.diagnosis.trim() || null,
      risk_level: attentionForm.risk_level,
      attention_minutes: toIntegerOrZero(attentionForm.attention_minutes),
      medicine_id: medicineId,
      medicine_quantity: medicineQuantity,
      notes: attentionForm.notes.trim() || null,
      heart_rate: toNumberOrNull(attentionForm.heart_rate),
      respiratory_rate: toNumberOrNull(attentionForm.respiratory_rate),
      systolic_bp: toNumberOrNull(attentionForm.systolic_bp),
      diastolic_bp: toNumberOrNull(attentionForm.diastolic_bp),
      temperature: toNumberOrNull(attentionForm.temperature),
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    };

    const { data, error } = await supabase
      .from("attentions")
      .insert(payload)
      .select(
        `
        *,
        medicines (
          id,
          name,
          unit
        )
      `
      )
      .single();

    if (error) {
      alert("No se pudo guardar la atención: " + error.message);
      return;
    }

    if (selectedMedicine && medicineQuantity > 0) {
      const newStock = Number(selectedMedicine.stock) - medicineQuantity;

      const { error: stockError } = await supabase
        .from("medicines")
        .update({ stock: newStock })
        .eq("id", selectedMedicine.id);

      if (stockError) {
        alert(
          "La atención se guardó, pero no se pudo actualizar inventario: " +
            stockError.message
        );
      } else {
        setMedicines((current) =>
          current.map((item) =>
            item.id === selectedMedicine.id ? { ...item, stock: newStock } : item
          )
        );
      }
    }

    setAttentions((current) => [data, ...current]);
    setAttentionForm(createInitialAttentionForm());
  }

  async function deleteAttention(id) {
    if (!canDeleteAttention) {
      alert("Solo admin puede eliminar atenciones.");
      return;
    }

    if (!confirm("¿Eliminar esta atención?")) return;

    const { error } = await supabase.from("attentions").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar la atención: " + error.message);
      return;
    }

    setAttentions((current) => current.filter((item) => item.id !== id));
  }

  async function saveMedicine(event) {
    event.preventDefault();

    if (!canCreateMedicine) {
      alert("Tu rol no permite registrar medicamentos.");
      return;
    }

    if (!medicineForm.name.trim()) {
      alert("Captura el nombre del medicamento.");
      return;
    }

    const payload = {
      name: medicineForm.name.trim(),
      stock: toIntegerOrZero(medicineForm.stock),
      minimum_stock: toIntegerOrZero(medicineForm.minimum_stock),
      unit: medicineForm.unit.trim() || "piezas",
    };

    const { data, error } = await supabase
      .from("medicines")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert("No se pudo guardar medicamento: " + error.message);
      return;
    }

    setMedicines((current) =>
      [...current, data].sort((a, b) => a.name.localeCompare(b.name))
    );

    setMedicineForm(createInitialMedicineForm());
  }

  async function updateMedicineStock(medicine, nextStock) {
    if (!canEditMedicine) {
      alert("Tu rol no permite modificar inventario.");
      return;
    }

    const stock = toIntegerOrZero(nextStock);

    const { data, error } = await supabase
      .from("medicines")
      .update({ stock })
      .eq("id", medicine.id)
      .select()
      .single();

    if (error) {
      alert("No se pudo actualizar stock: " + error.message);
      return;
    }

    setMedicines((current) =>
      current.map((item) => (item.id === medicine.id ? data : item))
    );
  }

  async function deleteMedicine(id) {
    if (!canDeleteMedicine) {
      alert("Solo admin puede eliminar medicamentos.");
      return;
    }

    if (!confirm("¿Eliminar este medicamento?")) return;

    const { error } = await supabase.from("medicines").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar medicamento: " + error.message);
      return;
    }

    setMedicines((current) => current.filter((item) => item.id !== id));
  }

  function exportAttentionsCsv() {
    if (filteredAttentions.length === 0) {
      alert("No hay atenciones filtradas para exportar.");
      return;
    }

    const headers = [
      "Fecha",
      "Paciente",
      "Numero de empleado",
      "Area",
      "Diagnostico / motivo",
      "Riesgo",
      "Minutos",
      "Medicamento",
      "Cantidad",
      "FC",
      "FR",
      "TA sistolica",
      "TA diastolica",
      "Temperatura",
      "Alertas vitales",
      "Capturo",
      "Notas",
    ];

    const rows = filteredAttentions.map((attention) => [
      attention.attention_date,
      attention.patient_name,
      attention.employee_number,
      attention.area || "",
      attention.diagnosis || "",
      attention.risk_level,
      attention.attention_minutes || 0,
      attention.medicines?.name || "",
      attention.medicine_quantity || "",
      attention.heart_rate || "",
      attention.respiratory_rate || "",
      attention.systolic_bp || "",
      attention.diastolic_bp || "",
      attention.temperature || "",
      buildVitalAlerts(attention).join(" | "),
      attention.created_by_email || "",
      attention.notes || "",
    ]);

    downloadCsv(`atenciones-sos-${getTodayForFileName()}.csv`, headers, rows);
  }

  function exportMonthlyReportCsv() {
    if (monthlyAttentions.length === 0) {
      alert("No hay atenciones en el mes seleccionado.");
      return;
    }

    const headers = ["Indicador", "Valor"];

    const rows = [
      ["Mes", getMonthLabel(reportMonth)],
      ["Total de atenciones", monthlyReport.total],
      ["Alto / crítico", monthlyReport.highRisk],
      ["Alertas vitales", monthlyReport.vitalAlerts],
      ["Tiempo promedio", monthlyReport.averageMinutes],
      [""],
      ...monthlyReport.byRisk.map((item) => [
        `Riesgo: ${item.label}`,
        item.count,
      ]),
      [""],
      ...monthlyReport.byDiagnosis.map((item) => [
        `Diagnóstico: ${item.label}`,
        item.count,
      ]),
      [""],
      ...monthlyReport.byArea.map((item) => [`Área: ${item.label}`, item.count]),
      [""],
      ...monthlyReport.byCapturer.map((item) => [
        `Capturista: ${item.label}`,
        item.count,
      ]),
      [""],
      ...monthlyReport.byMedicine.map((item) => [
        `Medicamento: ${item.label}`,
        item.count,
      ]),
    ];

    downloadCsv(`reporte-mensual-sos-${reportMonth}.csv`, headers, rows);
  }

  function printReport() {
    window.print();
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-red-400">
            SOS MedicalOps
          </p>
          <p className="mt-3 text-zinc-400">Cargando sesión...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed left-0 top-0 hidden h-screen w-72 flex-col border-r border-zinc-800 bg-zinc-950 text-white lg:flex">
        <div className="border-b border-white/10 p-6">
          <img
            src="/logo.png"
            alt="SOS"
            className="mb-4 h-14 w-auto object-contain"
          />

          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
            SOS MedicalOps
          </p>

          <h1 className="mt-2 text-xl font-black leading-tight">
            Centro de control médico-operativo
          </h1>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
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

        <div className="border-t border-white/10 p-4">
          <div className="rounded-2xl bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Sesión
            </p>
            <p className="mt-1 truncate text-sm font-bold">
              {session.user.email}
            </p>
            <p className="mt-1 text-xs text-red-300">
              Rol: {userRole || "sin rol"}
            </p>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300 hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 px-4 py-4 shadow-sm backdrop-blur md:px-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
                SOS — Soluciones Operativas Sierra Madre
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">
                {navItems.find((item) => item.id === activeModule)?.label ||
                  "Dashboard"}
              </h2>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm font-bold lg:hidden"
                value={activeModule}
                onChange={(event) => setActiveModule(event.target.value)}
              >
                {navItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={loadMainData}
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Actualizar
              </button>

              <span className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white">
                {userRole || "sin rol"}
              </span>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {loadingData && (
            <div className="mb-6 rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
              Cargando información...
            </div>
          )}

          {activeModule === "dashboard" && (
            <DashboardModule
              kpis={dashboardKpis}
              attentions={attentions}
              medicines={medicines}
            />
          )}
{activeModule === "empresas" && (
  <CompaniesPlantsModule session={session} userRole={userRole} />
)}
          {activeModule === "atenciones" && (
            <AttentionsModule
              session={session}
              userRole={userRole}
              form={attentionForm}
              medicines={medicines}
              attentions={filteredAttentions}
              filters={filters}
              uniqueAreas={uniqueAreas}
              uniqueCapturers={uniqueCapturers}
              canCreate={canCreateAttention}
              canDelete={canDeleteAttention}
              onChangeForm={updateAttentionField}
              onSubmit={saveAttention}
              onDelete={deleteAttention}
              onFilter={updateFilter}
              onResetFilters={resetFilters}
              onExport={exportAttentionsCsv}
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
              form={medicineForm}
              medicines={medicines}
              canCreate={canCreateMedicine}
              canEdit={canEditMedicine}
              canDelete={canDeleteMedicine}
              onChangeForm={updateMedicineField}
              onSubmit={saveMedicine}
              onUpdateStock={updateMedicineStock}
              onDelete={deleteMedicine}
            />
          )}

          {activeModule === "reportes" && (
            <ReportsModule
              reportMonth={reportMonth}
              setReportMonth={setReportMonth}
              monthOptions={monthOptions}
              monthlyReport={monthlyReport}
              monthlyAttentions={monthlyAttentions}
              onExport={exportMonthlyReportCsv}
              onPrint={printReport}
            />
          )}
        </div>
      </main>

      <button
        type="button"
        onClick={() => setActiveModule("atenciones")}
        className="fixed bottom-5 right-5 rounded-full bg-red-700 px-5 py-4 text-sm font-black text-white shadow-2xl hover:bg-red-800"
      >
        + Atención
      </button>
    </div>
  );
}

function DashboardModule({ kpis, attentions, medicines }) {
  const recentAttentions = attentions.slice(0, 6);
  const lowStock = medicines.filter(
    (medicine) => Number(medicine.stock) <= Number(medicine.minimum_stock)
  );

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard
          label="Atenciones"
          value={kpis.total}
          helper="Registros filtrados"
          tone="dark"
        />
        <KpiCard
          label="Alto / crítico"
          value={kpis.highRisk}
          helper="Riesgo operativo"
          tone={kpis.highRisk > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Alertas vitales"
          value={kpis.alerts}
          helper="Signos fuera de rango"
          tone={kpis.alerts > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Tiempo promedio"
          value={`${kpis.averageMinutes} min`}
          helper="Atención clínica"
        />
        <KpiCard
          label="Stock bajo"
          value={kpis.lowStock}
          helper="Medicamentos"
          tone={kpis.lowStock > 0 ? "red" : "neutral"}
        />
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black tracking-tight">
            Atenciones recientes
          </h3>

          <div className="mt-5 space-y-3">
            {recentAttentions.length > 0 ? (
              recentAttentions.map((attention) => (
                <div
                  key={attention.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-black">{attention.patient_name}</p>
                      <p className="text-sm text-zinc-500">
                        {attention.employee_number} ·{" "}
                        {attention.area || "Sin área"}
                      </p>
                    </div>

                    <span
                      className={`w-fit rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRiskBadgeClass(
                        attention.risk_level
                      )}`}
                    >
                      {attention.risk_level}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-zinc-600">
                    {attention.diagnosis || "Sin diagnóstico/motivo registrado"}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text="Sin atenciones registradas." />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black tracking-tight">
            Inventario en vigilancia
          </h3>

          <div className="mt-5 space-y-3">
            {lowStock.length > 0 ? (
              lowStock.map((medicine) => (
                <div
                  key={medicine.id}
                  className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900"
                >
                  <p className="font-black">{medicine.name}</p>
                  <p className="text-sm">
                    Stock: {medicine.stock} {medicine.unit} · Mínimo:{" "}
                    {medicine.minimum_stock}
                  </p>
                </div>
              ))
            ) : (
              <EmptyState text="No hay medicamentos debajo del mínimo." />
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function AttentionsModule({
  session,
  userRole,
  form,
  medicines,
  attentions,
  filters,
  uniqueAreas,
  uniqueCapturers,
  canCreate,
  canDelete,
  onChangeForm,
  onSubmit,
  onDelete,
  onFilter,
  onResetFilters,
  onExport,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Atención clínica in-plant
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Registrar atención médica
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Captura clínica, signos vitales, riesgo y trazabilidad del
              capturista.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canCreate ? (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre del paciente"
              value={form.patient_name}
              onChange={(event) =>
                onChangeForm("patient_name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Número de empleado"
              value={form.employee_number}
              onChange={(event) =>
                onChangeForm("employee_number", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={form.attention_date}
              onChange={(event) =>
                onChangeForm("attention_date", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Área"
              value={form.area}
              onChange={(event) => onChangeForm("area", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Diagnóstico / motivo"
              value={form.diagnosis}
              onChange={(event) =>
                onChangeForm("diagnosis", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.risk_level}
              onChange={(event) =>
                onChangeForm("risk_level", event.target.value)
              }
            >
              {riskLevels.map((risk) => (
                <option key={risk} value={risk}>
                  Riesgo {risk}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Minutos de atención"
              type="number"
              value={form.attention_minutes}
              onChange={(event) =>
                onChangeForm("attention_minutes", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              value={form.medicine_id}
              onChange={(event) =>
                onChangeForm("medicine_id", event.target.value)
              }
            >
              <option value="">Sin medicamento</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} · stock {medicine.stock} {medicine.unit}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Cantidad medicamento"
              type="number"
              value={form.medicine_quantity}
              onChange={(event) =>
                onChangeForm("medicine_quantity", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="FC"
              type="number"
              value={form.heart_rate}
              onChange={(event) =>
                onChangeForm("heart_rate", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="FR"
              type="number"
              value={form.respiratory_rate}
              onChange={(event) =>
                onChangeForm("respiratory_rate", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA sistólica"
              type="number"
              value={form.systolic_bp}
              onChange={(event) =>
                onChangeForm("systolic_bp", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA diastólica"
              type="number"
              value={form.diastolic_bp}
              onChange={(event) =>
                onChangeForm("diastolic_bp", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Temperatura"
              type="number"
              step="0.1"
              value={form.temperature}
              onChange={(event) =>
                onChangeForm("temperature", event.target.value)
              }
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-3"
              placeholder="Notas"
              value={form.notes}
              onChange={(event) => onChangeForm("notes", event.target.value)}
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 md:col-span-4">
              Captura por:{" "}
              <strong>{session?.user?.email || "usuario actual"}</strong>
            </div>

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-4">
              Guardar atención
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
              Registros filtrados: {attentions.length}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onResetFilters}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Limpiar filtros
            </button>

            <button
              type="button"
              onClick={onExport}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-7">
          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            type="date"
            value={filters.startDate}
            onChange={(event) => onFilter("startDate", event.target.value)}
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            type="date"
            value={filters.endDate}
            onChange={(event) => onFilter("endDate", event.target.value)}
          />

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.risk}
            onChange={(event) => onFilter("risk", event.target.value)}
          >
            <option value="Todos">Todos los riesgos</option>
            {riskLevels.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.area}
            onChange={(event) => onFilter("area", event.target.value)}
          >
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area === "Todas" ? "Todas las áreas" : area}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.capturer}
            onChange={(event) => onFilter("capturer", event.target.value)}
          >
            {uniqueCapturers.map((capturer) => (
              <option key={capturer} value={capturer}>
                {capturer === "Todos" ? "Todos los capturistas" : capturer}
              </option>
            ))}
          </select>

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="No. empleado"
            value={filters.employeeNumber}
            onChange={(event) =>
              onFilter("employeeNumber", event.target.value)
            }
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="Buscar"
            value={filters.searchText}
            onChange={(event) => onFilter("searchText", event.target.value)}
          />

          <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 xl:col-span-7">
            <input
              type="checkbox"
              checked={filters.vitalAlertsOnly}
              onChange={(event) =>
                onFilter("vitalAlertsOnly", event.target.checked)
              }
            />
            Mostrar solo atenciones con alertas de signos vitales
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1500px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Fecha</th>
                <th className="p-3">Paciente</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Área</th>
                <th className="p-3">Diagnóstico</th>
                <th className="p-3">Riesgo</th>
                <th className="p-3">Signos vitales</th>
                <th className="p-3">Alertas</th>
                <th className="p-3">Medicamento</th>
                <th className="p-3">Capturó</th>
                <th className="p-3">Notas</th>
                {canDelete && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {attentions.map((attention) => {
                const alerts = buildVitalAlerts(attention);

                return (
                  <tr
                    key={attention.id}
                    className="border-b align-top hover:bg-zinc-50"
                  >
                    <td className="p-3">{attention.attention_date}</td>
                    <td className="p-3 font-bold">{attention.patient_name}</td>
                    <td className="p-3">{attention.employee_number}</td>
                    <td className="p-3">{attention.area || "-"}</td>
                    <td className="p-3">{attention.diagnosis || "-"}</td>

                    <td className="p-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRiskBadgeClass(
                          attention.risk_level
                        )}`}
                      >
                        {attention.risk_level}
                      </span>
                    </td>

                    <td className="p-3 text-xs">
                      FC {attention.heart_rate || "-"} · FR{" "}
                      {attention.respiratory_rate || "-"} · TA{" "}
                      {attention.systolic_bp || "-"}/
                      {attention.diastolic_bp || "-"} · Temp{" "}
                      {attention.temperature || "-"}
                    </td>

                    <td className="p-3">
                      {alerts.length > 0 ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          {alerts.join(" | ")}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td className="p-3">
                      {attention.medicines?.name || "-"}{" "}
                      {attention.medicine_quantity
                        ? `(${attention.medicine_quantity})`
                        : ""}
                    </td>

                    <td className="p-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                        {attention.created_by_email || "Sin registro"}
                      </span>
                    </td>

                    <td className="p-3">{attention.notes || "-"}</td>

                    {canDelete && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => onDelete(attention.id)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {attentions.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay atenciones con los filtros actuales." />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function InventoryModule({
  form,
  medicines,
  canCreate,
  canEdit,
  canDelete,
  onChangeForm,
  onSubmit,
  onUpdateStock,
  onDelete,
}) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
            Control de insumos
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            Inventario de medicamentos
          </h2>
        </div>

        {canCreate ? (
          <form
            onSubmit={onSubmit}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Medicamento"
              value={form.name}
              onChange={(event) => onChangeForm("name", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Stock"
              type="number"
              value={form.stock}
              onChange={(event) => onChangeForm("stock", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Mínimo"
              type="number"
              value={form.minimum_stock}
              onChange={(event) =>
                onChangeForm("minimum_stock", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Unidad"
              value={form.unit}
              onChange={(event) => onChangeForm("unit", event.target.value)}
            />

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-2">
              Agregar medicamento
            </button>
          </form>
        ) : (
          <EmptyState text="Tu rol actual no permite agregar medicamentos." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Medicamento</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Mínimo</th>
                <th className="p-3">Unidad</th>
                <th className="p-3">Estado</th>
                {(canEdit || canDelete) && (
                  <th className="p-3 text-right">Acciones</th>
                )}
              </tr>
            </thead>

            <tbody>
              {medicines.map((medicine) => {
                const isLow =
                  Number(medicine.stock) <= Number(medicine.minimum_stock);

                return (
                  <tr
                    key={medicine.id}
                    className="border-b align-top hover:bg-zinc-50"
                  >
                    <td className="p-3 font-bold">{medicine.name}</td>

                    <td className="p-3">
                      {canEdit ? (
                        <input
                          className="w-24 rounded-xl border border-zinc-300 px-3 py-2"
                          type="number"
                          value={medicine.stock}
                          onChange={(event) =>
                            onUpdateStock(medicine, event.target.value)
                          }
                        />
                      ) : (
                        medicine.stock
                      )}
                    </td>

                    <td className="p-3">{medicine.minimum_stock}</td>
                    <td className="p-3">{medicine.unit}</td>

                    <td className="p-3">
                      {isLow ? (
                        <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800">
                          Stock bajo
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          Suficiente
                        </span>
                      )}
                    </td>

                    {(canEdit || canDelete) && (
                      <td className="p-3 text-right">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(medicine.id)}
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

function ReportsModule({
  reportMonth,
  setReportMonth,
  monthOptions,
  monthlyReport,
  monthlyAttentions,
  onExport,
  onPrint,
}) {
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
              {getMonthLabel(reportMonth)} · {monthlyAttentions.length}{" "}
              atenciones registradas
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

            <button
              type="button"
              onClick={onExport}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar reporte
            </button>

            <button
              type="button"
              onClick={onPrint}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Total" value={monthlyReport.total} tone="dark" />
          <KpiCard
            label="Alto / crítico"
            value={monthlyReport.highRisk}
            tone={monthlyReport.highRisk > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Alertas vitales"
            value={monthlyReport.vitalAlerts}
            tone={monthlyReport.vitalAlerts > 0 ? "amber" : "neutral"}
          />
          <KpiCard
            label="Tiempo promedio"
            value={`${monthlyReport.averageMinutes} min`}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ReportList
            title="Distribución por riesgo"
            items={monthlyReport.byRisk}
          />
          <ReportList
            title="Diagnósticos / motivos"
            items={monthlyReport.byDiagnosis}
          />
          <ReportList title="Áreas" items={monthlyReport.byArea} />
          <ReportList title="Capturistas" items={monthlyReport.byCapturer} />
          <ReportList title="Medicamentos" items={monthlyReport.byMedicine} />
        </div>
      </section>
    </div>
  );
}