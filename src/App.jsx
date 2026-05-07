import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const riskLevels = ["Bajo", "Medio", "Alto", "Crítico"];

const navItems = [
  { id: "dashboard", label: "Dashboard", subtitle: "Centro de control" },
  { id: "atenciones", label: "Atenciones", subtitle: "Registro clínico" },
  { id: "inventario", label: "Inventario", subtitle: "Insumos médicos" },
  { id: "reportes", label: "Reportes", subtitle: "Vista ejecutiva" },
];

function createInitialForm() {
  return {
    patient_name: "",
    employee_number: "",
    attention_date: new Date().toISOString().slice(0, 10),
    area: "",
    diagnosis: "",
    risk_level: "Bajo",
    attention_minutes: 15,
    medicine_id: "",
    medicine_quantity: 0,
    heart_rate: "",
    respiratory_rate: "",
    blood_pressure: "",
    temperature: "",
    notes: "",
  };
}

function evaluateVitalAlerts(vitals) {
  const alerts = [];

  const heartRate = Number(vitals.heart_rate);
  const respiratoryRate = Number(vitals.respiratory_rate);
  const systolicBp = Number(vitals.systolic_bp);
  const diastolicBp = Number(vitals.diastolic_bp);
  const temperature = Number(vitals.temperature);

  if (
    vitals.heart_rate !== null &&
    vitals.heart_rate !== "" &&
    !Number.isNaN(heartRate)
  ) {
    if (heartRate < 60) alerts.push("FC baja");
    if (heartRate > 100) alerts.push("FC elevada");
  }

  if (
    vitals.respiratory_rate !== null &&
    vitals.respiratory_rate !== "" &&
    !Number.isNaN(respiratoryRate)
  ) {
    if (respiratoryRate < 8) alerts.push("FR baja");
    if (respiratoryRate > 20) alerts.push("FR elevada");
  }

  if (
    vitals.systolic_bp !== null &&
    vitals.diastolic_bp !== null &&
    !Number.isNaN(systolicBp) &&
    !Number.isNaN(diastolicBp)
  ) {
    if (systolicBp > 159) alerts.push("TA sistólica elevada");
    if (systolicBp < 100) alerts.push("TA sistólica baja");
    if (diastolicBp > 90) alerts.push("TA diastólica elevada");
    if (diastolicBp < 60) alerts.push("TA diastólica baja");
  }

  if (
    vitals.temperature !== null &&
    vitals.temperature !== "" &&
    !Number.isNaN(temperature)
  ) {
    if (temperature >= 38) alerts.push("Fiebre");
    if (temperature < 35) alerts.push("Temperatura baja");
  }

  return alerts;
}

function formatBloodPressureInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 6);

  if (digits.length <= 3) return digits;

  if (digits.length === 4) {
    const firstThree = Number(digits.slice(0, 3));

    if (firstThree >= 100) {
      return `${digits.slice(0, 3)}/${digits.slice(3)}`;
    }

    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  if (digits.length === 5) {
    return `${digits.slice(0, 3)}/${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}/${digits.slice(3, 6)}`;
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const stringValue = String(value).replace(/"/g, '""');
  return `"${stringValue}"`;
}

function getTodayForFileName() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey(dateString) {
  if (!dateString) return "";
  return dateString.slice(0, 7);
}

function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
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

function buildCountList(items, getValue, limit = 5) {
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

function getRiskBadgeClass(risk) {
  if (risk === "Crítico") return "bg-red-100 text-red-800 ring-red-200";
  if (risk === "Alto") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (risk === "Medio") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function getRoleBadgeClass(role) {
  if (role === "admin") return "bg-red-600 text-white";
  if (role === "medico") return "bg-blue-100 text-blue-800";
  if (role === "enfermeria") return "bg-emerald-100 text-emerald-800";
  if (role === "lectura") return "bg-zinc-100 text-zinc-700";
  if (role === "bloqueado") return "bg-red-100 text-red-800";
  return "bg-zinc-200 text-zinc-700";
}

function KpiCard({ label, value, helper, tone = "neutral" }) {
  const toneClass =
    tone === "red"
      ? "border-red-200 bg-red-50 text-red-900"
      : tone === "dark"
      ? "border-zinc-800 bg-zinc-950 text-white"
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

function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-sm text-zinc-500">
      {text}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [recoveryMode, setRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [recoveryEmailSent, setRecoveryEmailSent] = useState(false);

  const [userRole, setUserRole] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [attentions, setAttentions] = useState([]);
  const [form, setForm] = useState(createInitialForm());

  const [activeModule, setActiveModule] = useState("atenciones");
  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());
  const [logoFailed, setLogoFailed] = useState(false);

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    riskLevel: "Todos",
    area: "Todas",
    employeeNumber: "",
    capturedBy: "",
    searchText: "",
    onlyVitalAlerts: false,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCheckingSession(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);

        if (event === "PASSWORD_RECOVERY") {
          setRecoveryMode(true);
          setCheckingSession(false);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session) {
      loadSessionData();
    }
  }, [session]);

  const canRegisterAttention = ["admin", "medico", "enfermeria"].includes(
    userRole
  );

  const canEditInventory = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDelete = userRole === "admin";
  const isBlocked = userRole === "bloqueado";

  const currentModule = navItems.find((item) => item.id === activeModule);

  const uniqueAreas = useMemo(() => {
    const areas = attentions
      .map((item) => item.area)
      .filter(Boolean)
      .map((area) => area.trim())
      .filter(Boolean);

    return ["Todas", ...Array.from(new Set(areas)).sort()];
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

      if (
        filters.riskLevel !== "Todos" &&
        attention.risk_level !== filters.riskLevel
      ) {
        return false;
      }

      if (filters.area !== "Todas" && attention.area !== filters.area) {
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

      if (
        filters.capturedBy.trim() &&
        !String(attention.created_by_email || "")
          .toLowerCase()
          .includes(filters.capturedBy.trim().toLowerCase())
      ) {
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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchBase.includes(filters.searchText.trim().toLowerCase())) {
          return false;
        }
      }

      if (filters.onlyVitalAlerts) {
        const vitalAlerts = evaluateVitalAlerts({
          heart_rate: attention.heart_rate,
          respiratory_rate: attention.respiratory_rate,
          systolic_bp: attention.systolic_bp,
          diastolic_bp: attention.diastolic_bp,
          temperature: attention.temperature,
        });

        if (vitalAlerts.length === 0) return false;
      }

      return true;
    });
  }, [attentions, filters]);

  const monthlyAttentions = useMemo(() => {
    return attentions.filter(
      (attention) => getMonthKey(attention.attention_date) === reportMonth
    );
  }, [attentions, reportMonth]);

  const kpis = useMemo(() => {
    const total = filteredAttentions.length;

    const highRisk = filteredAttentions.filter((item) =>
      ["Alto", "Crítico"].includes(item.risk_level)
    ).length;

    const totalMinutes = filteredAttentions.reduce(
      (sum, item) => sum + Number(item.attention_minutes || 0),
      0
    );

    const averageMinutes = total ? totalMinutes / total : 0;

    const vitalAlertsCount = filteredAttentions.filter((attention) => {
      return (
        evaluateVitalAlerts({
          heart_rate: attention.heart_rate,
          respiratory_rate: attention.respiratory_rate,
          systolic_bp: attention.systolic_bp,
          diastolic_bp: attention.diastolic_bp,
          temperature: attention.temperature,
        }).length > 0
      );
    }).length;

    const lowStock = medicines.filter(
      (medicine) =>
        Number(medicine.stock || 0) <= Number(medicine.minimum_stock || 0)
    ).length;

    return {
      total,
      highRisk,
      averageMinutes,
      medicinesCount: medicines.length,
      vitalAlertsCount,
      lowStock,
    };
  }, [filteredAttentions, medicines]);

  const monthlyReport = useMemo(() => {
    const total = monthlyAttentions.length;

    const totalMinutes = monthlyAttentions.reduce(
      (sum, item) => sum + Number(item.attention_minutes || 0),
      0
    );

    const averageMinutes = total ? totalMinutes / total : 0;

    const riskDistribution = riskLevels.map((risk) => ({
      label: risk,
      count: monthlyAttentions.filter((item) => item.risk_level === risk).length,
    }));

    const highRisk = monthlyAttentions.filter((item) =>
      ["Alto", "Crítico"].includes(item.risk_level)
    ).length;

    const vitalAlertsCount = monthlyAttentions.filter((attention) => {
      return (
        evaluateVitalAlerts({
          heart_rate: attention.heart_rate,
          respiratory_rate: attention.respiratory_rate,
          systolic_bp: attention.systolic_bp,
          diastolic_bp: attention.diastolic_bp,
          temperature: attention.temperature,
        }).length > 0
      );
    }).length;

    const medicineUsage = {};

    monthlyAttentions.forEach((attention) => {
      if (!attention.medicine_id) return;

      const medicine = medicines.find((item) => item.id === attention.medicine_id);
      const medicineName = medicine?.name || "Medicamento no identificado";
      const quantity = Number(attention.medicine_quantity || 0);

      medicineUsage[medicineName] = (medicineUsage[medicineName] || 0) + quantity;
    });

    const topMedicines = Object.entries(medicineUsage)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);

    const topDiagnoses = buildCountList(
      monthlyAttentions,
      (item) => item.diagnosis,
      5
    );

    const topAreas = buildCountList(monthlyAttentions, (item) => item.area, 5);

    const topCapturers = buildCountList(
      monthlyAttentions,
      (item) => item.created_by_email,
      5
    );

    const alertsBreakdown = {};

    monthlyAttentions.forEach((attention) => {
      const alerts = evaluateVitalAlerts({
        heart_rate: attention.heart_rate,
        respiratory_rate: attention.respiratory_rate,
        systolic_bp: attention.systolic_bp,
        diastolic_bp: attention.diastolic_bp,
        temperature: attention.temperature,
      });

      alerts.forEach((alert) => {
        alertsBreakdown[alert] = (alertsBreakdown[alert] || 0) + 1;
      });
    });

    const topVitalAlerts = Object.entries(alertsBreakdown)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);

    return {
      total,
      averageMinutes,
      highRisk,
      vitalAlertsCount,
      riskDistribution,
      topMedicines,
      topDiagnoses,
      topAreas,
      topCapturers,
      topVitalAlerts,
    };
  }, [monthlyAttentions, medicines]);

  const recentVitalAlerts = useMemo(() => {
    return attentions
      .map((attention) => ({
        ...attention,
        vitalAlerts: evaluateVitalAlerts({
          heart_rate: attention.heart_rate,
          respiratory_rate: attention.respiratory_rate,
          systolic_bp: attention.systolic_bp,
          diastolic_bp: attention.diastolic_bp,
          temperature: attention.temperature,
        }),
      }))
      .filter((attention) => attention.vitalAlerts.length > 0)
      .slice(0, 5);
  }, [attentions]);

  const lowStockMedicines = useMemo(() => {
    return medicines.filter(
      (medicine) =>
        Number(medicine.stock || 0) <= Number(medicine.minimum_stock || 0)
    );
  }, [medicines]);

  async function loadSessionData() {
    const role = await loadUserRole();

    if (role === "bloqueado") return;

    await loadData();
  }

  async function loadUserRole() {
    if (!session?.user?.id) return null;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      alert("No se pudo cargar el rol del usuario: " + error.message);
      setUserRole("sin_rol");
      return "sin_rol";
    }

    if (!data) {
      alert("Este usuario no tiene rol asignado en Supabase.");
      setUserRole("sin_rol");
      return "sin_rol";
    }

    setUserRole(data.role);
    return data.role;
  }

  async function loadData() {
    setLoadingData(true);

    const medicinesResult = await supabase
      .from("medicines")
      .select("*")
      .order("name", { ascending: true });

    const attentionsResult = await supabase
      .from("attentions")
      .select("*")
      .order("attention_date", { ascending: false });

    if (medicinesResult.error) {
      alert("Error cargando medicamentos: " + medicinesResult.error.message);
    } else {
      setMedicines(medicinesResult.data || []);
    }

    if (attentionsResult.error) {
      alert("Error cargando atenciones: " + attentionsResult.error.message);
    } else {
      setAttentions(attentionsResult.data || []);
    }

    setLoadingData(false);
  }

  async function login(event) {
    event.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert("No se pudo iniciar sesión. Revisa correo y contraseña.");
    }
  }

  async function sendRecoveryEmail() {
    if (!email.trim()) {
      alert("Primero escribe tu correo electrónico.");
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

    if (error) {
      alert("No se pudo enviar el correo de recuperación: " + error.message);
      return;
    }

    setRecoveryEmailSent(true);
    alert("Correo de recuperación enviado. Revisa tu bandeja de entrada.");
  }

  async function updatePassword(event) {
    event.preventDefault();

    if (newPassword.length < 8) {
      alert("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert("No se pudo actualizar la contraseña: " + error.message);
      return;
    }

    alert("Contraseña actualizada correctamente. Inicia sesión de nuevo.");

    setNewPassword("");
    setConfirmPassword("");
    setRecoveryMode(false);

    await supabase.auth.signOut();
    setSession(null);
  }

  async function logout() {
    await supabase.auth.signOut();

    setSession(null);
    setUserRole(null);
    setMedicines([]);
    setAttentions([]);
  }

  function updateField(field, value) {
    setForm((current) => ({
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
      riskLevel: "Todos",
      area: "Todas",
      employeeNumber: "",
      capturedBy: "",
      searchText: "",
      onlyVitalAlerts: false,
    });
  }

  function exportFilteredToCsv() {
    if (filteredAttentions.length === 0) {
      alert("No hay registros filtrados para exportar.");
      return;
    }

    const headers = [
      "Fecha",
      "Paciente",
      "Numero de empleado",
      "Area",
      "Diagnostico/Motivo",
      "Riesgo",
      "Tiempo de atencion min",
      "Capturo",
      "Medicamento",
      "Cantidad medicamento",
      "FC lpm",
      "FR rpm",
      "TA mmHg",
      "Temperatura C",
      "Alertas vitales",
      "Notas",
    ];

    const rows = filteredAttentions.map((attention) => {
      const medicine = medicines.find((item) => item.id === attention.medicine_id);

      const vitalAlerts = evaluateVitalAlerts({
        heart_rate: attention.heart_rate,
        respiratory_rate: attention.respiratory_rate,
        systolic_bp: attention.systolic_bp,
        diastolic_bp: attention.diastolic_bp,
        temperature: attention.temperature,
      });

      const bloodPressure =
        attention.systolic_bp && attention.diastolic_bp
          ? `${attention.systolic_bp}/${attention.diastolic_bp}`
          : "";

      return [
        attention.attention_date,
        attention.patient_name,
        attention.employee_number,
        attention.area,
        attention.diagnosis,
        attention.risk_level,
        attention.attention_minutes,
        attention.created_by_email || "Sin registro",
        medicine?.name || "",
        attention.medicine_quantity || "",
        attention.heart_rate || "",
        attention.respiratory_rate || "",
        bloodPressure,
        attention.temperature || "",
        vitalAlerts.join(" | "),
        attention.notes || "",
      ];
    });

    downloadCsv(
      `reporte-atenciones-sos-${getTodayForFileName()}.csv`,
      headers,
      rows
    );
  }

  function exportMonthlyReportToCsv() {
    if (monthlyAttentions.length === 0) {
      alert("No hay registros en el mes seleccionado para exportar.");
      return;
    }

    const summaryHeaders = ["Indicador", "Valor"];

    const summaryRows = [
      ["Mes", getMonthLabel(reportMonth)],
      ["Total de atenciones", monthlyReport.total],
      ["Tiempo promedio de atencion min", monthlyReport.averageMinutes.toFixed(1)],
      ["Atenciones riesgo alto/critico", monthlyReport.highRisk],
      ["Atenciones con alertas vitales", monthlyReport.vitalAlertsCount],
    ];

    const riskRows = monthlyReport.riskDistribution.map((item) => [
      `Riesgo ${item.label}`,
      item.count,
    ]);

    const diagnosisRows = monthlyReport.topDiagnoses.map((item) => [
      `Diagnostico: ${item.label}`,
      item.count,
    ]);

    const areaRows = monthlyReport.topAreas.map((item) => [
      `Area: ${item.label}`,
      item.count,
    ]);

    const capturerRows = monthlyReport.topCapturers.map((item) => [
      `Capturista: ${item.label}`,
      item.count,
    ]);

    const medicineRows = monthlyReport.topMedicines.map((item) => [
      `Medicamento: ${item.label}`,
      item.count,
    ]);

    const alertRows = monthlyReport.topVitalAlerts.map((item) => [
      `Alerta vital: ${item.label}`,
      item.count,
    ]);

    const detailHeaders = [
      "Fecha",
      "Paciente",
      "Numero de empleado",
      "Area",
      "Diagnostico/Motivo",
      "Riesgo",
      "Tiempo min",
      "Capturo",
      "FC",
      "FR",
      "TA",
      "Temperatura",
      "Alertas",
      "Notas",
    ];

    const detailRows = monthlyAttentions.map((attention) => {
      const vitalAlerts = evaluateVitalAlerts({
        heart_rate: attention.heart_rate,
        respiratory_rate: attention.respiratory_rate,
        systolic_bp: attention.systolic_bp,
        diastolic_bp: attention.diastolic_bp,
        temperature: attention.temperature,
      });

      return [
        attention.attention_date,
        attention.patient_name,
        attention.employee_number,
        attention.area || "",
        attention.diagnosis || "",
        attention.risk_level || "",
        attention.attention_minutes || "",
        attention.created_by_email || "Sin registro",
        attention.heart_rate || "",
        attention.respiratory_rate || "",
        attention.systolic_bp && attention.diastolic_bp
          ? `${attention.systolic_bp}/${attention.diastolic_bp}`
          : "",
        attention.temperature || "",
        vitalAlerts.join(" | "),
        attention.notes || "",
      ];
    });

    const rows = [
      ...summaryRows,
      [""],
      ...riskRows,
      [""],
      ...diagnosisRows,
      [""],
      ...areaRows,
      [""],
      ...capturerRows,
      [""],
      ...medicineRows,
      [""],
      ...alertRows,
      [""],
      detailHeaders,
      ...detailRows,
    ];

    downloadCsv(
      `reporte-mensual-sos-${reportMonth}.csv`,
      summaryHeaders,
      rows
    );
  }

  function printMonthlyReport() {
    window.print();
  }

  async function saveAttention(event) {
    event.preventDefault();

    if (!canRegisterAttention) {
      alert("Tu rol no permite registrar atenciones.");
      return;
    }

    if (!form.patient_name.trim()) {
      alert("Captura el nombre del paciente.");
      return;
    }

    if (!form.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    let systolicBp = null;
    let diastolicBp = null;

    if (form.blood_pressure.trim()) {
      const bpParts = form.blood_pressure.trim().split("/");

      if (bpParts.length !== 2) {
        alert("Captura la tensión arterial en formato 120/80.");
        return;
      }

      systolicBp = Number(bpParts[0]);
      diastolicBp = Number(bpParts[1]);

      if (
        Number.isNaN(systolicBp) ||
        Number.isNaN(diastolicBp) ||
        systolicBp < 50 ||
        systolicBp > 300 ||
        diastolicBp < 20 ||
        diastolicBp > 200
      ) {
        alert(
          "La tensión arterial debe tener un formato válido, ejemplo: 120/80."
        );
        return;
      }
    }

    const vitalAlerts = evaluateVitalAlerts({
      heart_rate: form.heart_rate === "" ? null : Number(form.heart_rate),
      respiratory_rate:
        form.respiratory_rate === "" ? null : Number(form.respiratory_rate),
      systolic_bp: systolicBp,
      diastolic_bp: diastolicBp,
      temperature: form.temperature === "" ? null : Number(form.temperature),
    });

    if (vitalAlerts.length > 0) {
      const proceed = confirm(
        "Se detectaron signos vitales fuera de rango:\n\n" +
          vitalAlerts.map((alert) => `• ${alert}`).join("\n") +
          "\n\n¿Deseas guardar la atención de todos modos?"
      );

      if (!proceed) return;
    }

    const payload = {
      patient_name: form.patient_name.trim(),
      employee_number: form.employee_number.trim(),
      attention_date: form.attention_date,
      area: form.area.trim() || null,
      diagnosis: form.diagnosis.trim() || null,
      risk_level: form.risk_level,
      attention_minutes: Number(form.attention_minutes || 0),
      medicine_id: form.medicine_id || null,
      medicine_quantity: Number(form.medicine_quantity || 0),
      heart_rate: form.heart_rate === "" ? null : Number(form.heart_rate),
      respiratory_rate:
        form.respiratory_rate === "" ? null : Number(form.respiratory_rate),
      systolic_bp: systolicBp,
      diastolic_bp: diastolicBp,
      temperature: form.temperature === "" ? null : Number(form.temperature),
      notes: form.notes.trim() || null,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    };

    const { data, error } = await supabase
      .from("attentions")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert("No se pudo guardar la atención: " + error.message);
      return;
    }

    if (payload.medicine_id && payload.medicine_quantity > 0) {
      const medicine = medicines.find((item) => item.id === payload.medicine_id);

      const newStock = Math.max(
        Number(medicine?.stock || 0) - payload.medicine_quantity,
        0
      );

      const stockResult = await supabase
        .from("medicines")
        .update({ stock: newStock })
        .eq("id", payload.medicine_id);

      if (stockResult.error) {
        alert(
          "La atención se guardó, pero no se pudo descontar inventario: " +
            stockResult.error.message
        );
      }
    }

    setAttentions((current) => [data, ...current]);
    setForm(createInitialForm());

    await loadData();
  }

  async function deleteAttention(id) {
    if (!canDelete) {
      alert("Solo el rol admin puede eliminar registros.");
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

  async function updateStock(medicineId, newValue) {
    if (!canEditInventory) {
      alert("Tu rol no permite modificar inventario.");
      return;
    }

    const stock = Number(newValue || 0);

    const { error } = await supabase
      .from("medicines")
      .update({ stock })
      .eq("id", medicineId);

    if (error) {
      alert("No se pudo actualizar el stock: " + error.message);
      return;
    }

    setMedicines((current) =>
      current.map((item) =>
        item.id === medicineId ? { ...item, stock } : item
      )
    );
  }

  function BrandBlock({ compact = false }) {
    return (
      <div className={`flex items-center gap-3 ${compact ? "" : "mb-8"}`}>
        {!logoFailed ? (
          <img
            src="/logo.png"
            alt="SOS"
            onError={() => setLogoFailed(true)}
            className="h-12 w-12 rounded-2xl object-contain ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-700 text-lg font-black text-white">
            SOS
          </div>
        )}

        <div>
          <p className="text-lg font-black tracking-tight text-white">
            SOS MedicalOps
          </p>
          <p className="text-xs font-medium text-zinc-400">
            Centro médico-operativo
          </p>
        </div>
      </div>
    );
  }

  function renderDashboard() {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Atenciones filtradas"
            value={kpis.total}
            helper="Registros visibles"
            tone="dark"
          />
          <KpiCard
            label="Alertas vitales"
            value={kpis.vitalAlertsCount}
            helper="Fuera de rango"
            tone={kpis.vitalAlertsCount > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Riesgo alto/crítico"
            value={kpis.highRisk}
            helper="Casos prioritarios"
            tone={kpis.highRisk > 0 ? "amber" : "neutral"}
          />
          <KpiCard
            label="Tiempo promedio"
            value={`${kpis.averageMinutes.toFixed(1)} min`}
            helper="Atención clínica"
          />
          <KpiCard
            label="Inventario bajo"
            value={kpis.lowStock}
            helper="Insumos en mínimo"
            tone={kpis.lowStock > 0 ? "red" : "neutral"}
          />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
                  Acción rápida
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">
                  Registrar nueva atención
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Acceso prioritario para operación de enfermería.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveModule("atenciones")}
                className="rounded-2xl bg-red-700 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800"
              >
                + Nueva atención
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-zinc-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Operación
                </p>
                <p className="mt-2 text-lg font-bold">Captura rápida</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Registro clínico estructurado con signos vitales.
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-100 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                  Control
                </p>
                <p className="mt-2 text-lg font-bold">Trazabilidad</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Historial, capturista, filtros y exportación.
                </p>
              </div>

              <div className="rounded-2xl bg-red-50 p-5 text-red-950">
                <p className="text-xs uppercase tracking-[0.2em] text-red-700">
                  Riesgo
                </p>
                <p className="mt-2 text-lg font-bold">Alertas clínicas</p>
                <p className="mt-2 text-sm text-red-800">
                  Semáforo operativo para signos fuera de rango.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-bold">Alertas recientes</h3>

            <div className="mt-4 space-y-3">
              {recentVitalAlerts.length > 0 ? (
                recentVitalAlerts.map((attention) => (
                  <div
                    key={attention.id}
                    className="rounded-2xl border border-red-100 bg-red-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-red-950">
                          {attention.patient_name}
                        </p>
                        <p className="text-xs text-red-800">
                          {attention.attention_date} · {attention.area || "Sin área"}
                        </p>
                        <p className="mt-1 text-xs text-red-700">
                          Capturó: {attention.created_by_email || "Sin registro"}
                        </p>
                      </div>
                      <span className="rounded-full bg-red-700 px-2 py-1 text-xs font-bold text-white">
                        alerta
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {attention.vitalAlerts.map((alert) => (
                        <span
                          key={alert}
                          className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-red-800"
                        >
                          {alert}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState text="Sin alertas vitales recientes." />
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderAttentionForm() {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Registro operativo
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Nueva atención médica
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Captura rápida para enfermería y operación clínica in-plant.
            </p>
          </div>

          <span
            className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${getRoleBadgeClass(
              userRole
            )}`}
          >
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canRegisterAttention ? (
          <form
            onSubmit={saveAttention}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre del paciente"
              value={form.patient_name}
              onChange={(event) =>
                updateField("patient_name", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Número de empleado"
              value={form.employee_number}
              onChange={(event) =>
                updateField("employee_number", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={form.attention_date}
              onChange={(event) =>
                updateField("attention_date", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Área"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Diagnóstico / motivo"
              value={form.diagnosis}
              onChange={(event) =>
                updateField("diagnosis", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.risk_level}
              onChange={(event) =>
                updateField("risk_level", event.target.value)
              }
            >
              {riskLevels.map((risk) => (
                <option key={risk} value={risk}>
                  Riesgo {risk}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="number"
              min="0"
              placeholder="Tiempo en minutos"
              value={form.attention_minutes}
              onChange={(event) =>
                updateField("attention_minutes", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.medicine_id}
              onChange={(event) =>
                updateField("medicine_id", event.target.value)
              }
            >
              <option value="">Sin medicamento</option>
              {medicines.map((medicine) => (
                <option key={medicine.id} value={medicine.id}>
                  {medicine.name} | stock: {medicine.stock}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="number"
              min="0"
              placeholder="Cantidad medicamento"
              value={form.medicine_quantity}
              onChange={(event) =>
                updateField("medicine_quantity", event.target.value)
              }
            />

            <div className="rounded-3xl border border-zinc-200 bg-zinc-50 p-5 md:col-span-3">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                    Vigilancia clínica
                  </p>
                  <h3 className="mt-1 font-bold">Signos vitales</h3>
                </div>
                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
                  Semáforo activo
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">
                    FC
                  </span>
                  <input
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
                    type="number"
                    min="20"
                    max="250"
                    placeholder="82"
                    value={form.heart_rate}
                    onChange={(event) =>
                      updateField("heart_rate", event.target.value)
                    }
                  />
                  <span className="mt-1 block text-xs text-zinc-500">lpm</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">
                    FR
                  </span>
                  <input
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
                    type="number"
                    min="5"
                    max="80"
                    placeholder="18"
                    value={form.respiratory_rate}
                    onChange={(event) =>
                      updateField("respiratory_rate", event.target.value)
                    }
                  />
                  <span className="mt-1 block text-xs text-zinc-500">rpm</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">
                    TA
                  </span>
                  <input
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
                    type="text"
                    inputMode="numeric"
                    placeholder="120/80"
                    value={form.blood_pressure}
                    onChange={(event) =>
                      updateField(
                        "blood_pressure",
                        formatBloodPressureInput(event.target.value)
                      )
                    }
                  />
                  <span className="mt-1 block text-xs text-zinc-500">mmHg</span>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-bold text-zinc-700">
                    Temp
                  </span>
                  <input
                    className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
                    type="number"
                    min="30"
                    max="45"
                    step="0.1"
                    placeholder="36.7"
                    value={form.temperature}
                    onChange={(event) =>
                      updateField("temperature", event.target.value)
                    }
                  />
                  <span className="mt-1 block text-xs text-zinc-500">°C</span>
                </label>
              </div>
            </div>

            <textarea
              className="min-h-28 rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-3"
              placeholder="Notas clínicas u observaciones operativas"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 md:col-span-3">
              Esta atención se guardará como capturada por:{" "}
              <strong>{session?.user?.email || "usuario actual"}</strong>
            </div>

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-3">
              Guardar atención médica
            </button>
          </form>
        ) : (
          <EmptyState text="Tu rol actual no permite registrar atenciones." />
        )}
      </section>
    );
  }

  function renderFiltersAndHistory() {
    return (
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Trazabilidad
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Historial y filtros
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
              onClick={exportFilteredToCsv}
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
            onChange={(event) => updateFilter("startDate", event.target.value)}
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            type="date"
            value={filters.endDate}
            onChange={(event) => updateFilter("endDate", event.target.value)}
          />

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.riskLevel}
            onChange={(event) => updateFilter("riskLevel", event.target.value)}
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
            onChange={(event) => updateFilter("area", event.target.value)}
          >
            {uniqueAreas.map((area) => (
              <option key={area} value={area}>
                {area === "Todas" ? "Todas las áreas" : area}
              </option>
            ))}
          </select>

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="No. empleado"
            value={filters.employeeNumber}
            onChange={(event) =>
              updateFilter("employeeNumber", event.target.value)
            }
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="Capturó"
            value={filters.capturedBy}
            onChange={(event) => updateFilter("capturedBy", event.target.value)}
          />

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="Buscar"
            value={filters.searchText}
            onChange={(event) => updateFilter("searchText", event.target.value)}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm font-bold text-zinc-700">
          <input
            type="checkbox"
            checked={filters.onlyVitalAlerts}
            onChange={(event) =>
              updateFilter("onlyVitalAlerts", event.target.checked)
            }
          />
          Mostrar solo atenciones con alertas vitales
        </label>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1350px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Fecha</th>
                <th className="p-3">Paciente</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Área</th>
                <th className="p-3">Diagnóstico</th>
                <th className="p-3">Riesgo</th>
                <th className="p-3">Tiempo</th>
                <th className="p-3">Capturó</th>
                <th className="p-3">Signos vitales</th>
                <th className="p-3">Alerta</th>
                <th className="p-3">Notas</th>
                {canDelete && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredAttentions.map((attention) => {
                const vitalAlerts = evaluateVitalAlerts({
                  heart_rate: attention.heart_rate,
                  respiratory_rate: attention.respiratory_rate,
                  systolic_bp: attention.systolic_bp,
                  diastolic_bp: attention.diastolic_bp,
                  temperature: attention.temperature,
                });

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

                    <td className="p-3">{attention.attention_minutes} min</td>

                    <td className="p-3">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                        {attention.created_by_email || "Sin registro"}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="space-y-1 text-xs text-zinc-700">
                        <div>
                          <strong>FC:</strong>{" "}
                          {attention.heart_rate
                            ? `${attention.heart_rate} lpm`
                            : "-"}
                        </div>

                        <div>
                          <strong>FR:</strong>{" "}
                          {attention.respiratory_rate
                            ? `${attention.respiratory_rate} rpm`
                            : "-"}
                        </div>

                        <div>
                          <strong>TA:</strong>{" "}
                          {attention.systolic_bp && attention.diastolic_bp
                            ? `${attention.systolic_bp}/${attention.diastolic_bp} mmHg`
                            : "-"}
                        </div>

                        <div>
                          <strong>Temp:</strong>{" "}
                          {attention.temperature
                            ? `${attention.temperature} °C`
                            : "-"}
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      {vitalAlerts.length > 0 ? (
                        <div className="space-y-1">
                          {vitalAlerts.map((alert) => (
                            <span
                              key={alert}
                              className="block rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-800"
                            >
                              {alert}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                          Normal
                        </span>
                      )}
                    </td>

                    <td className="p-3">{attention.notes || "-"}</td>

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
                );
              })}
            </tbody>
          </table>

          {filteredAttentions.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay registros con los filtros actuales." />
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderAtenciones() {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard
            label="Registros"
            value={filteredAttentions.length}
            tone="dark"
          />
          <KpiCard
            label="Alertas"
            value={kpis.vitalAlertsCount}
            tone={kpis.vitalAlertsCount > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Alto / crítico"
            value={kpis.highRisk}
            tone={kpis.highRisk > 0 ? "amber" : "neutral"}
          />
          <KpiCard
            label="Promedio"
            value={`${kpis.averageMinutes.toFixed(1)} min`}
          />
        </section>

        {renderAttentionForm()}
        {renderFiltersAndHistory()}
      </div>
    );
  }

  function renderInventory() {
    return (
      <div className="space-y-6">
        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiCard
            label="Medicamentos"
            value={medicines.length}
            helper="Catálogo activo"
            tone="dark"
          />
          <KpiCard
            label="Stock bajo"
            value={lowStockMedicines.length}
            helper="Requiere revisión"
            tone={lowStockMedicines.length > 0 ? "red" : "neutral"}
          />
          <KpiCard
            label="Control"
            value={canEditInventory ? "Editable" : "Lectura"}
            helper="Según rol activo"
          />
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Insumos
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Inventario médico
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Control visual de stock y mínimos operativos.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Medicamento</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Mínimo</th>
                  <th className="p-3">Unidad</th>
                  <th className="p-3">Estado</th>
                </tr>
              </thead>

              <tbody>
                {medicines.map((medicine) => {
                  const isLow =
                    Number(medicine.stock || 0) <=
                    Number(medicine.minimum_stock || 0);

                  return (
                    <tr key={medicine.id} className="border-b hover:bg-zinc-50">
                      <td className="p-3 font-bold">{medicine.name}</td>

                      <td className="p-3">
                        {canEditInventory ? (
                          <input
                            className="w-28 rounded-xl border border-zinc-300 px-3 py-2"
                            type="number"
                            min="0"
                            value={medicine.stock}
                            onChange={(event) =>
                              updateStock(medicine.id, event.target.value)
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
                            Bajo
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">
                            Suficiente
                          </span>
                        )}
                      </td>
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

  function ReportList({ title, items, danger = false, wide = false }) {
    return (
      <div
        className={`rounded-3xl border border-zinc-200 p-5 ${
          wide ? "lg:col-span-2" : ""
        }`}
      >
        <h3 className="mb-4 text-lg font-black tracking-tight">{title}</h3>

        <div className="space-y-2">
          {items.length > 0 ? (
            items.map((item) => (
              <div
                key={item.label}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm ${
                  danger ? "bg-red-50 text-red-900" : "bg-zinc-50 text-zinc-900"
                }`}
              >
                <span>{item.label}</span>
                <strong>{item.count}</strong>
              </div>
            ))
          ) : (
            <EmptyState text="Sin registros en el periodo." />
          )}
        </div>
      </div>
    );
  }

  function renderReports() {
    return (
      <section
        id="reporte-mensual"
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Vista ejecutiva
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Reporte mensual ejecutivo
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {getMonthLabel(reportMonth)} · {monthlyReport.total} atenciones
              registradas
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
              onClick={exportMonthlyReportToCsv}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={printMonthlyReport}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Total" value={monthlyReport.total} tone="dark" />
          <KpiCard
            label="Promedio"
            value={`${monthlyReport.averageMinutes.toFixed(1)} min`}
          />
          <KpiCard
            label="Alto / crítico"
            value={monthlyReport.highRisk}
            tone={monthlyReport.highRisk > 0 ? "amber" : "neutral"}
          />
          <KpiCard
            label="Alertas vitales"
            value={monthlyReport.vitalAlertsCount}
            tone={monthlyReport.vitalAlertsCount > 0 ? "red" : "neutral"}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ReportList
            title="Distribución por riesgo"
            items={monthlyReport.riskDistribution}
          />
          <ReportList
            title="Principales diagnósticos / motivos"
            items={monthlyReport.topDiagnoses}
          />
          <ReportList
            title="Áreas con mayor demanda"
            items={monthlyReport.topAreas}
          />
          <ReportList
            title="Capturistas con mayor actividad"
            items={monthlyReport.topCapturers}
          />
          <ReportList
            title="Medicamentos más utilizados"
            items={monthlyReport.topMedicines}
          />
          <ReportList
            title="Alertas vitales detectadas"
            items={monthlyReport.topVitalAlerts}
            danger
          />
        </div>
      </section>
    );
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Validando sesión...
      </main>
    );
  }

  if (recoveryMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#3f0d12,#09090b_45%)] px-5">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl">
          <h1 className="text-2xl font-black text-zinc-950">
            Cambiar contraseña
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Ingresa tu nueva contraseña.
          </p>

          <form onSubmit={updatePassword} className="mt-6 space-y-4">
            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
              type="password"
              placeholder="Nueva contraseña"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />

            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3"
              type="password"
              placeholder="Confirmar contraseña"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />

            <button className="w-full rounded-2xl bg-red-700 px-4 py-3 font-black text-white hover:bg-red-800">
              Actualizar contraseña
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#3f0d12,#09090b_45%)] px-5">
        <section className="w-full max-w-md rounded-3xl border border-white/10 bg-white p-7 shadow-2xl">
          <div className="mb-8 flex items-center gap-3">
            {!logoFailed ? (
              <img
                src="/logo.png"
                alt="SOS"
                onError={() => setLogoFailed(true)}
                className="h-14 w-14 rounded-2xl object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-700 text-xl font-black text-white">
                SOS
              </div>
            )}

            <div>
              <h1 className="text-2xl font-black tracking-tight text-zinc-950">
                SOS MedicalOps
              </h1>
              <p className="text-sm font-medium text-zinc-500">
                Centro médico-operativo
              </p>
            </div>
          </div>

          <form onSubmit={login} className="space-y-4">
            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <input
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <button className="w-full rounded-2xl bg-red-700 px-4 py-3 font-black text-white shadow-sm hover:bg-red-800">
              Ingresar
            </button>

            <button
              type="button"
              onClick={sendRecoveryEmail}
              className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Olvidé mi contraseña
            </button>

            {recoveryEmailSent && (
              <p className="text-sm font-bold text-emerald-700">
                Correo de recuperación enviado.
              </p>
            )}
          </form>
        </section>
      </main>
    );
  }

  if (isBlocked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5">
        <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl">
          <h1 className="text-2xl font-black text-red-700">Acceso bloqueado</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Tu usuario no tiene acceso operativo al dashboard. Contacta al
            administrador.
          </p>
          <button
            onClick={logout}
            className="mt-6 w-full rounded-2xl bg-zinc-950 px-4 py-3 font-black text-white hover:bg-zinc-800"
          >
            Cerrar sesión
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/10 bg-zinc-950 p-5 text-white lg:block">
        <BrandBlock />

        <nav className="space-y-2">
          {navItems.map((item) => {
            const active = activeModule === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`w-full rounded-2xl px-4 py-3 text-left transition ${
                  active
                    ? "bg-red-700 text-white shadow-sm"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="block font-black">{item.label}</span>
                <span className="block text-xs opacity-70">{item.subtitle}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Usuario activo
          </p>
          <p className="mt-2 truncate text-sm font-bold text-white">
            {session?.user?.email}
          </p>
          <span
            className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${getRoleBadgeClass(
              userRole
            )}`}
          >
            {userRole || "cargando"}
          </span>

          <button
            onClick={logout}
            className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/10 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      <section className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="lg:hidden">
                <BrandBlock compact />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
                  SOS MedicalOps
                </p>
                <h1 className="mt-1 text-2xl font-black tracking-tight">
                  {currentModule?.label || "Dashboard"}
                </h1>
                <p className="text-sm text-zinc-500">
                  {currentModule?.subtitle ||
                    "Centro de control médico-operativo"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setActiveModule("atenciones")}
                className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
              >
                + Nueva atención
              </button>

              <button
                type="button"
                onClick={loadData}
                className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Actualizar
              </button>
            </div>
          </div>

          <div className="mx-auto mt-4 flex max-w-7xl gap-2 overflow-x-auto lg:hidden">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${
                  activeModule === item.id
                    ? "bg-zinc-950 text-white"
                    : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-5 py-6">
          {loadingData && (
            <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
              Cargando información desde Supabase...
            </div>
          )}

          {activeModule === "dashboard" && renderDashboard()}
          {activeModule === "atenciones" && renderAtenciones()}
          {activeModule === "inventario" && renderInventory()}
          {activeModule === "reportes" && renderReports()}
        </main>
      </section>

      <button
        type="button"
        onClick={() => setActiveModule("atenciones")}
        className="fixed bottom-5 right-5 rounded-full bg-red-700 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-red-900/30 hover:bg-red-800"
      >
        + Atención
      </button>
    </main>
  );
}