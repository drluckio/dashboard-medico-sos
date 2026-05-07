import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const riskLevels = ["Bajo", "Medio", "Alto", "Crítico"];

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
      rawValue === null || rawValue === undefined || String(rawValue).trim() === ""
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

  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    riskLevel: "Todos",
    area: "Todas",
    employeeNumber: "",
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
      loadUserRole();
      loadData();
    }
  }, [session]);

  const canRegisterAttention = ["admin", "medico", "enfermeria"].includes(
    userRole
  );

  const canEditInventory = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDelete = userRole === "admin";

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

    const uniqueMonths = Array.from(new Set([getCurrentMonthKey(), ...months]))
      .filter(Boolean)
      .sort()
      .reverse();

    return uniqueMonths;
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

      if (filters.searchText.trim()) {
        const searchBase = [
          attention.patient_name,
          attention.employee_number,
          attention.area,
          attention.diagnosis,
          attention.risk_level,
          attention.notes,
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

    return {
      total,
      highRisk,
      averageMinutes,
      medicinesCount: medicines.length,
      vitalAlertsCount,
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
      topVitalAlerts,
    };
  }, [monthlyAttentions, medicines]);

  async function loadUserRole() {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .maybeSingle();

    if (error) {
      alert("No se pudo cargar el rol del usuario: " + error.message);
      setUserRole("sin_rol");
      return;
    }

    if (!data) {
      alert("Este usuario no tiene rol asignado en Supabase.");
      setUserRole("sin_rol");
      return;
    }

    setUserRole(data.role);
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

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Validando sesión...
      </main>
    );
  }

  if (recoveryMode) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-zinc-950">
            Cambiar contraseña
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Ingresa tu nueva contraseña.
          </p>

          <form onSubmit={updatePassword} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Nueva contraseña
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Confirmar contraseña
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            <button className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800">
              Actualizar contraseña
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-zinc-950">
            Dashboard Médico SOS
          </h1>

          <p className="mt-2 text-sm text-zinc-600">
            Inicia sesión con tu usuario autorizado.
          </p>

          <form onSubmit={login} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Correo electrónico
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Contraseña
              </span>
              <input
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <button className="w-full rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800">
              Ingresar
            </button>

            <button
              type="button"
              onClick={sendRecoveryEmail}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Olvidé mi contraseña
            </button>

            {recoveryEmailSent && (
              <p className="text-sm font-medium text-emerald-700">
                Correo de recuperación enviado.
              </p>
            )}
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="bg-zinc-950 px-6 py-6 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">
              SOS · Salud ocupacional
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Dashboard de Atenciones Médicas
            </h1>

            <p className="mt-1 text-sm text-zinc-300">
              Conectado a Supabase.
            </p>

            <p className="mt-1 text-sm text-zinc-400">
              Rol activo: {userRole || "cargando..."}
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {loadingData && (
          <div className="rounded-xl bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900">
            Cargando información desde Supabase...
          </div>
        )}

        <section
          id="reporte-mensual"
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
                Vista ejecutiva
              </p>
              <h2 className="mt-1 text-2xl font-bold text-zinc-950">
                Reporte mensual ejecutivo
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {getMonthLabel(reportMonth)} · {monthlyReport.total} atenciones registradas
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <select
                className="rounded-xl border border-zinc-300 px-3 py-2 text-sm"
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
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Exportar reporte CSV
              </button>

              <button
                type="button"
                onClick={printMonthlyReport}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Total de atenciones</p>
              <p className="mt-2 text-3xl font-bold">{monthlyReport.total}</p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Tiempo promedio</p>
              <p className="mt-2 text-3xl font-bold">
                {monthlyReport.averageMinutes.toFixed(1)} min
              </p>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <p className="text-sm text-zinc-500">Riesgo alto/crítico</p>
              <p className="mt-2 text-3xl font-bold">{monthlyReport.highRisk}</p>
            </div>

            <div className="rounded-2xl bg-red-50 p-4">
              <p className="text-sm text-red-700">Alertas vitales</p>
              <p className="mt-2 text-3xl font-bold text-red-800">
                {monthlyReport.vitalAlertsCount}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 p-4">
              <h3 className="mb-3 font-semibold">Distribución por riesgo</h3>
              <div className="space-y-2">
                {monthlyReport.riskDistribution.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                  >
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <h3 className="mb-3 font-semibold">Principales diagnósticos / motivos</h3>
              <div className="space-y-2">
                {monthlyReport.topDiagnoses.length > 0 ? (
                  monthlyReport.topDiagnoses.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Sin registros.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <h3 className="mb-3 font-semibold">Áreas con mayor demanda</h3>
              <div className="space-y-2">
                {monthlyReport.topAreas.length > 0 ? (
                  monthlyReport.topAreas.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Sin registros.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4">
              <h3 className="mb-3 font-semibold">Medicamentos más utilizados</h3>
              <div className="space-y-2">
                {monthlyReport.topMedicines.length > 0 ? (
                  monthlyReport.topMedicines.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-zinc-50 px-3 py-2 text-sm"
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Sin consumo registrado.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 p-4 lg:col-span-2">
              <h3 className="mb-3 font-semibold">Alertas vitales detectadas</h3>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {monthlyReport.topVitalAlerts.length > 0 ? (
                  monthlyReport.topVitalAlerts.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm text-red-900"
                    >
                      <span>{item.label}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-500">Sin alertas vitales en el periodo.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Filtros y exportación</h2>
              <p className="text-sm text-zinc-500">
                Registros filtrados: {filteredAttentions.length}
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                Limpiar filtros
              </button>

              <button
                type="button"
                onClick={exportFilteredToCsv}
                className="rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
              >
                Exportar Excel CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha inicial
              </span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="date"
                value={filters.startDate}
                onChange={(event) =>
                  updateFilter("startDate", event.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Fecha final
              </span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                type="date"
                value={filters.endDate}
                onChange={(event) =>
                  updateFilter("endDate", event.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Riesgo
              </span>
              <select
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={filters.riskLevel}
                onChange={(event) =>
                  updateFilter("riskLevel", event.target.value)
                }
              >
                <option value="Todos">Todos</option>
                {riskLevels.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Área
              </span>
              <select
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                value={filters.area}
                onChange={(event) => updateFilter("area", event.target.value)}
              >
                {uniqueAreas.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                No. empleado
              </span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Buscar empleado"
                value={filters.employeeNumber}
                onChange={(event) =>
                  updateFilter("employeeNumber", event.target.value)
                }
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-zinc-700">
                Búsqueda general
              </span>
              <input
                className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Paciente, diagnóstico, notas..."
                value={filters.searchText}
                onChange={(event) =>
                  updateFilter("searchText", event.target.value)
                }
              />
            </label>
          </div>

          <label className="mt-4 flex items-center gap-2 text-sm font-medium text-zinc-700">
            <input
              type="checkbox"
              checked={filters.onlyVitalAlerts}
              onChange={(event) =>
                updateFilter("onlyVitalAlerts", event.target.checked)
              }
            />
            Mostrar solo atenciones con alertas vitales
          </label>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Atenciones</p>
            <p className="mt-2 text-3xl font-bold">{kpis.total}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Medicamentos</p>
            <p className="mt-2 text-3xl font-bold">{kpis.medicinesCount}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Riesgo alto/crítico</p>
            <p className="mt-2 text-3xl font-bold">{kpis.highRisk}</p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Tiempo promedio</p>
            <p className="mt-2 text-3xl font-bold">
              {kpis.averageMinutes.toFixed(1)} min
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-500">Alertas vitales</p>
            <p className="mt-2 text-3xl font-bold text-red-700">
              {kpis.vitalAlertsCount}
            </p>
          </div>
        </div>

        {canRegisterAttention ? (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Registrar atención médica
            </h2>

            <form
              onSubmit={saveAttention}
              className="grid grid-cols-1 gap-4 md:grid-cols-3"
            >
              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Nombre del paciente"
                value={form.patient_name}
                onChange={(event) =>
                  updateField("patient_name", event.target.value)
                }
              />

              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Número de empleado"
                value={form.employee_number}
                onChange={(event) =>
                  updateField("employee_number", event.target.value)
                }
              />

              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                type="date"
                value={form.attention_date}
                onChange={(event) =>
                  updateField("attention_date", event.target.value)
                }
              />

              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Área"
                value={form.area}
                onChange={(event) => updateField("area", event.target.value)}
              />

              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                placeholder="Diagnóstico / motivo"
                value={form.diagnosis}
                onChange={(event) =>
                  updateField("diagnosis", event.target.value)
                }
              />

              <select
                className="rounded-xl border border-zinc-300 px-3 py-2"
                value={form.risk_level}
                onChange={(event) =>
                  updateField("risk_level", event.target.value)
                }
              >
                {riskLevels.map((risk) => (
                  <option key={risk} value={risk}>
                    {risk}
                  </option>
                ))}
              </select>

              <input
                className="rounded-xl border border-zinc-300 px-3 py-2"
                type="number"
                min="0"
                placeholder="Tiempo en minutos"
                value={form.attention_minutes}
                onChange={(event) =>
                  updateField("attention_minutes", event.target.value)
                }
              />

              <select
                className="rounded-xl border border-zinc-300 px-3 py-2"
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
                className="rounded-xl border border-zinc-300 px-3 py-2"
                type="number"
                min="0"
                placeholder="Cantidad medicamento"
                value={form.medicine_quantity}
                onChange={(event) =>
                  updateField("medicine_quantity", event.target.value)
                }
              />

              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-3">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-600">
                  Signos vitales
                </h3>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">
                      Frecuencia cardiaca
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                      type="number"
                      min="20"
                      max="250"
                      placeholder="Ej. 82"
                      value={form.heart_rate}
                      onChange={(event) =>
                        updateField("heart_rate", event.target.value)
                      }
                    />
                    <span className="mt-1 block text-xs text-zinc-500">
                      Latidos por minuto
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">
                      Frecuencia respiratoria
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                      type="number"
                      min="5"
                      max="80"
                      placeholder="Ej. 18"
                      value={form.respiratory_rate}
                      onChange={(event) =>
                        updateField("respiratory_rate", event.target.value)
                      }
                    />
                    <span className="mt-1 block text-xs text-zinc-500">
                      Respiraciones por minuto
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">
                      Tensión arterial
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                      type="text"
                      inputMode="numeric"
                      placeholder="Ej. 120/80"
                      value={form.blood_pressure}
                      onChange={(event) =>
                        updateField(
                          "blood_pressure",
                          formatBloodPressureInput(event.target.value)
                        )
                      }
                    />
                    <span className="mt-1 block text-xs text-zinc-500">
                      Formato automático: sistólica/diastólica mmHg
                    </span>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-zinc-700">
                      Temperatura
                    </span>
                    <input
                      className="w-full rounded-xl border border-zinc-300 px-3 py-2"
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      placeholder="Ej. 36.7"
                      value={form.temperature}
                      onChange={(event) =>
                        updateField("temperature", event.target.value)
                      }
                    />
                    <span className="mt-1 block text-xs text-zinc-500">
                      Grados Celsius
                    </span>
                  </label>
                </div>
              </div>

              <textarea
                className="rounded-xl border border-zinc-300 px-3 py-2 md:col-span-3"
                placeholder="Notas"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
              />

              <button className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800 md:col-span-3">
                Guardar atención
              </button>
            </form>
          </section>
        ) : (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-zinc-600">
              Tu rol actual no permite registrar atenciones.
            </p>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Inventario</h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                  <th className="p-3">Medicamento</th>
                  <th className="p-3">Stock</th>
                  <th className="p-3">Mínimo</th>
                  <th className="p-3">Unidad</th>
                </tr>
              </thead>

              <tbody>
                {medicines.map((medicine) => (
                  <tr key={medicine.id} className="border-b">
                    <td className="p-3 font-medium">{medicine.name}</td>

                    <td className="p-3">
                      {canEditInventory ? (
                        <input
                          className="w-24 rounded-lg border border-zinc-300 px-2 py-1"
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Historial de atenciones
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-left text-xs uppercase text-zinc-500">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Paciente</th>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Área</th>
                  <th className="p-3">Diagnóstico</th>
                  <th className="p-3">Riesgo</th>
                  <th className="p-3">Tiempo</th>
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
                    <tr key={attention.id} className="border-b align-top">
                      <td className="p-3">{attention.attention_date}</td>

                      <td className="p-3 font-medium">
                        {attention.patient_name}
                      </td>

                      <td className="p-3">{attention.employee_number}</td>
                      <td className="p-3">{attention.area || "-"}</td>
                      <td className="p-3">{attention.diagnosis || "-"}</td>
                      <td className="p-3">{attention.risk_level}</td>
                      <td className="p-3">{attention.attention_minutes} min</td>

                      <td className="p-3">
                        <div className="space-y-1 text-xs text-zinc-700">
                          <div>
                            <span className="font-semibold">FC:</span>{" "}
                            {attention.heart_rate
                              ? `${attention.heart_rate} lpm`
                              : "-"}
                          </div>

                          <div>
                            <span className="font-semibold">FR:</span>{" "}
                            {attention.respiratory_rate
                              ? `${attention.respiratory_rate} rpm`
                              : "-"}
                          </div>

                          <div>
                            <span className="font-semibold">TA:</span>{" "}
                            {attention.systolic_bp && attention.diastolic_bp
                              ? `${attention.systolic_bp}/${attention.diastolic_bp} mmHg`
                              : "-"}
                          </div>

                          <div>
                            <span className="font-semibold">Temp:</span>{" "}
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
                                className="block rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800"
                              >
                                {alert}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                            Sin alerta
                          </span>
                        )}
                      </td>

                      <td className="p-3">{attention.notes || "-"}</td>

                      {canDelete && (
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteAttention(attention.id)}
                            className="rounded-lg px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
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
          </div>
        </section>
      </section>
    </main>
  );
}