import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const riskOptions = ["Bajo", "Medio", "Alto", "Crítico"];
const statusOptions = ["Activo", "Controlado", "En vigilancia", "Referido", "Baja"];
const sexOptions = ["No especificado", "Masculino", "Femenino"];
const glucoseTypeOptions = ["No aplica", "Ayuno", "Capilar aleatoria", "Postprandial"];
const adherenceOptions = ["No aplica", "Buena", "Regular", "Mala"];

function initialPatientForm() {
  return {
    employee_name: "",
    employee_number: "",
    area: "",
    position_name: "",
    birth_date: "",
    sex: "No especificado",
    has_hta: false,
    has_dm2: false,
    has_dyslipidemia: false,
    has_obesity: false,
    other_diagnosis: "",
    risk_level: "Medio",
    program_status: "Activo",
    next_followup_date: "",
    notes: "",
  };
}

function initialFollowupForm() {
  return {
    followup_date: new Date().toISOString().slice(0, 10),
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    glucose_mg_dl: "",
    glucose_type: "No aplica",
    weight_kg: "",
    height_m: "",
    waist_cm: "",
    medication_adherence: "No aplica",
    symptoms: "",
    intervention: "",
    referred: false,
    referral_reason: "",
    next_followup_date: "",
  };
}

function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function calculateBmi(weightKg, heightM) {
  const weight = Number(weightKg);
  const height = Number(heightM);

  if (!weight || !height) return null;

  const result = weight / (height * height);
  return Number.isFinite(result) ? Number(result.toFixed(2)) : null;
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

function formatDateTime(value) {
  if (!value) return "-";

  return new Date(value).toLocaleString("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
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

function buildDiagnoses(patient) {
  const diagnoses = [];

  if (patient.has_hta) diagnoses.push("HTA");
  if (patient.has_dm2) diagnoses.push("DM2");
  if (patient.has_dyslipidemia) diagnoses.push("Dislipidemia");
  if (patient.has_obesity) diagnoses.push("Obesidad");
  if (patient.other_diagnosis) diagnoses.push(patient.other_diagnosis);

  return diagnoses.length ? diagnoses.join(", ") : "Sin diagnóstico";
}

function getRiskBadgeClass(risk) {
  if (risk === "Crítico") return "bg-red-100 text-red-800 ring-red-200";
  if (risk === "Alto") return "bg-orange-100 text-orange-800 ring-orange-200";
  if (risk === "Medio") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
}

function getStatusBadgeClass(status) {
  if (status === "Baja") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  if (status === "Referido") return "bg-blue-100 text-blue-800 ring-blue-200";
  if (status === "En vigilancia") return "bg-amber-100 text-amber-800 ring-amber-200";
  if (status === "Controlado") return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  return "bg-red-100 text-red-800 ring-red-200";
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

export default function ChronicDegenerativeModule({ session, userRole }) {
  const [patients, setPatients] = useState([]);
  const [followups, setFollowups] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [auditError, setAuditError] = useState("");

  const [patientForm, setPatientForm] = useState(initialPatientForm());
  const [followupForm, setFollowupForm] = useState(initialFollowupForm());

  const [editingPatientId, setEditingPatientId] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const [filters, setFilters] = useState({
    status: "Todos",
    risk: "Todos",
    diagnosis: "Todos",
    searchText: "",
    dueOnly: false,
  });

  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());

  const canRegister = ["admin", "medico", "enfermeria"].includes(userRole);
  const canEdit = ["admin", "medico"].includes(userRole);
  const canDelete = userRole === "admin";

  useEffect(() => {
    loadData();
  }, []);

  const selectedPatient = useMemo(() => {
    return patients.find((patient) => patient.id === selectedPatientId) || null;
  }, [patients, selectedPatientId]);

  const filteredPatients = useMemo(() => {
    const today = getToday();

    return patients.filter((patient) => {
      if (filters.status !== "Todos" && patient.program_status !== filters.status) {
        return false;
      }

      if (filters.risk !== "Todos" && patient.risk_level !== filters.risk) {
        return false;
      }

      if (filters.diagnosis !== "Todos") {
        if (filters.diagnosis === "HTA" && !patient.has_hta) return false;
        if (filters.diagnosis === "DM2" && !patient.has_dm2) return false;
        if (filters.diagnosis === "Dislipidemia" && !patient.has_dyslipidemia) return false;
        if (filters.diagnosis === "Obesidad" && !patient.has_obesity) return false;
        if (filters.diagnosis === "Otro" && !patient.other_diagnosis) return false;
      }

      if (filters.dueOnly) {
        if (!patient.next_followup_date || patient.next_followup_date > today) {
          return false;
        }
      }

      if (filters.searchText.trim()) {
        const searchBase = [
          patient.folio,
          patient.employee_name,
          patient.employee_number,
          patient.area,
          patient.position_name,
          patient.other_diagnosis,
          patient.risk_level,
          patient.program_status,
          patient.created_by_email,
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
  }, [patients, filters]);

  const selectedPatientFollowups = useMemo(() => {
    if (!selectedPatientId) return [];

    return followups
      .filter((followup) => followup.patient_id === selectedPatientId)
      .sort((a, b) => String(b.followup_date).localeCompare(String(a.followup_date)));
  }, [followups, selectedPatientId]);

  const monthOptions = useMemo(() => {
    const months = followups
      .map((followup) => getMonthKey(followup.followup_date))
      .filter(Boolean);

    return Array.from(new Set([getCurrentMonthKey(), ...months]))
      .sort()
      .reverse();
  }, [followups]);

  const monthlyFollowups = useMemo(() => {
    return followups.filter((followup) => getMonthKey(followup.followup_date) === reportMonth);
  }, [followups, reportMonth]);

  const kpis = useMemo(() => {
    const today = getToday();

    return {
      total: filteredPatients.length,
      active: filteredPatients.filter((patient) => patient.program_status !== "Baja").length,
      highRisk: filteredPatients.filter((patient) =>
        ["Alto", "Crítico"].includes(patient.risk_level)
      ).length,
      due: filteredPatients.filter(
        (patient) => patient.next_followup_date && patient.next_followup_date <= today
      ).length,
      referred: filteredPatients.filter((patient) => patient.program_status === "Referido").length,
    };
  }, [filteredPatients]);

  const monthlyReport = useMemo(() => {
    const patientsSeen = new Set(monthlyFollowups.map((followup) => followup.patient_id));

    return {
      totalFollowups: monthlyFollowups.length,
      patientsSeen: patientsSeen.size,
      controlled: patients.filter((patient) => patient.program_status === "Controlado").length,
      surveillance: patients.filter((patient) => patient.program_status === "En vigilancia").length,
    };
  }, [monthlyFollowups, patients]);

  async function loadData() {
    setLoading(true);
    setAuditError("");

    const [patientsResponse, followupsResponse, auditResponse] = await Promise.all([
      supabase
        .from("chronic_patients")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("chronic_followups")
        .select("*")
        .order("followup_date", { ascending: false }),
      supabase
        .from("chronic_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    if (patientsResponse.error) {
      alert("Error cargando pacientes crónico-degenerativos: " + patientsResponse.error.message);
    } else {
      setPatients(patientsResponse.data || []);
    }

    if (followupsResponse.error) {
      alert("Error cargando seguimientos crónico-degenerativos: " + followupsResponse.error.message);
    } else {
      setFollowups(followupsResponse.data || []);
    }

    if (auditResponse.error) {
      setAuditError(auditResponse.error.message);
      setAuditLogs([]);
    } else {
      setAuditLogs(auditResponse.data || []);
    }

    setLoading(false);
  }

  function updatePatientField(field, value) {
    setPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateFollowupField(field, value) {
    setFollowupForm((current) => ({
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
      status: "Todos",
      risk: "Todos",
      diagnosis: "Todos",
      searchText: "",
      dueOnly: false,
    });
  }

  function startEditPatient(patient) {
    if (!canEdit) {
      alert("Tu rol no permite editar pacientes.");
      return;
    }

    setEditingPatientId(patient.id);
    setPatientForm({
      employee_name: patient.employee_name || "",
      employee_number: patient.employee_number || "",
      area: patient.area || "",
      position_name: patient.position_name || "",
      birth_date: patient.birth_date || "",
      sex: patient.sex || "No especificado",
      has_hta: Boolean(patient.has_hta),
      has_dm2: Boolean(patient.has_dm2),
      has_dyslipidemia: Boolean(patient.has_dyslipidemia),
      has_obesity: Boolean(patient.has_obesity),
      other_diagnosis: patient.other_diagnosis || "",
      risk_level: patient.risk_level || "Medio",
      program_status: patient.program_status || "Activo",
      next_followup_date: patient.next_followup_date || "",
      notes: patient.notes || "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingPatientId(null);
    setPatientForm(initialPatientForm());
  }

  function selectPatientForFollowup(patient) {
    setSelectedPatientId(patient.id);
    setFollowupForm({
      ...initialFollowupForm(),
      next_followup_date: patient.next_followup_date || "",
    });

    setTimeout(() => {
      document
        .getElementById("chronic-followup-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  async function savePatient(event) {
    event.preventDefault();

    if (!canRegister && !editingPatientId) {
      alert("Tu rol no permite registrar pacientes.");
      return;
    }

    if (!canEdit && editingPatientId) {
      alert("Tu rol no permite editar pacientes.");
      return;
    }

    if (!patientForm.employee_name.trim()) {
      alert("Captura el nombre del colaborador.");
      return;
    }

    if (!patientForm.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const payload = {
      employee_name: patientForm.employee_name.trim(),
      employee_number: patientForm.employee_number.trim(),
      area: patientForm.area.trim() || null,
      position_name: patientForm.position_name.trim() || null,
      birth_date: patientForm.birth_date || null,
      sex: patientForm.sex,
      has_hta: Boolean(patientForm.has_hta),
      has_dm2: Boolean(patientForm.has_dm2),
      has_dyslipidemia: Boolean(patientForm.has_dyslipidemia),
      has_obesity: Boolean(patientForm.has_obesity),
      other_diagnosis: patientForm.other_diagnosis.trim() || null,
      risk_level: patientForm.risk_level,
      program_status: patientForm.program_status,
      next_followup_date: patientForm.next_followup_date || null,
      notes: patientForm.notes.trim() || null,
    };

    if (editingPatientId) {
      const { error } = await supabase
        .from("chronic_patients")
        .update({
          ...payload,
          updated_at: new Date().toISOString(),
          updated_by_user_id: session?.user?.id || null,
          updated_by_email: session?.user?.email || "Sin correo",
        })
        .eq("id", editingPatientId);

      if (error) {
        alert("No se pudo actualizar el paciente: " + error.message);
        return;
      }

      cancelEdit();
      await loadData();
      return;
    }

    const { error } = await supabase.from("chronic_patients").insert({
      ...payload,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    });

    if (error) {
      alert("No se pudo registrar el paciente: " + error.message);
      return;
    }

    setPatientForm(initialPatientForm());
    await loadData();
  }

  async function saveFollowup(event) {
    event.preventDefault();

    if (!canRegister) {
      alert("Tu rol no permite registrar seguimientos.");
      return;
    }

    if (!selectedPatientId) {
      alert("Selecciona un paciente.");
      return;
    }

    const bmi = calculateBmi(followupForm.weight_kg, followupForm.height_m);

    const payload = {
      patient_id: selectedPatientId,
      followup_date: followupForm.followup_date,
      systolic_bp: toNumberOrNull(followupForm.systolic_bp),
      diastolic_bp: toNumberOrNull(followupForm.diastolic_bp),
      heart_rate: toNumberOrNull(followupForm.heart_rate),
      glucose_mg_dl: toNumberOrNull(followupForm.glucose_mg_dl),
      glucose_type: followupForm.glucose_type,
      weight_kg: toNumberOrNull(followupForm.weight_kg),
      height_m: toNumberOrNull(followupForm.height_m),
      bmi,
      waist_cm: toNumberOrNull(followupForm.waist_cm),
      medication_adherence: followupForm.medication_adherence,
      symptoms: followupForm.symptoms.trim() || null,
      intervention: followupForm.intervention.trim() || null,
      referred: Boolean(followupForm.referred),
      referral_reason: followupForm.referral_reason.trim() || null,
      next_followup_date: followupForm.next_followup_date || null,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    };

    const { error } = await supabase.from("chronic_followups").insert(payload);

    if (error) {
      alert("No se pudo guardar el seguimiento: " + error.message);
      return;
    }

    const patientUpdate = {
      last_followup_date: followupForm.followup_date,
      next_followup_date: followupForm.next_followup_date || null,
      updated_at: new Date().toISOString(),
      updated_by_user_id: session?.user?.id || null,
      updated_by_email: session?.user?.email || "Sin correo",
    };

    if (followupForm.referred) {
      patientUpdate.program_status = "Referido";
      patientUpdate.risk_level = selectedPatient?.risk_level === "Crítico" ? "Crítico" : "Alto";
    }

    await supabase.from("chronic_patients").update(patientUpdate).eq("id", selectedPatientId);

    setFollowupForm(initialFollowupForm());
    await loadData();

    alert("Seguimiento guardado.");
  }

  async function deletePatient(id) {
    if (!canDelete) {
      alert("Solo admin puede eliminar pacientes.");
      return;
    }

    if (!confirm("¿Eliminar este paciente y sus seguimientos?")) return;

    const { error } = await supabase.from("chronic_patients").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar el paciente: " + error.message);
      return;
    }

    if (selectedPatientId === id) setSelectedPatientId("");
    await loadData();
  }

  async function deleteFollowup(id) {
    if (!canDelete) {
      alert("Solo admin puede eliminar seguimientos.");
      return;
    }

    if (!confirm("¿Eliminar este seguimiento?")) return;

    const { error } = await supabase.from("chronic_followups").delete().eq("id", id);

    if (error) {
      alert("No se pudo eliminar el seguimiento: " + error.message);
      return;
    }

    await loadData();
  }

  function exportPatientsCsv() {
    const headers = [
      "Folio",
      "Colaborador",
      "Numero empleado",
      "Area",
      "Puesto",
      "Sexo",
      "Diagnosticos",
      "Riesgo",
      "Estado",
      "Ultimo seguimiento",
      "Proximo seguimiento",
      "Capturo",
      "Notas",
    ];

    const rows = filteredPatients.map((patient) => [
      patient.folio || "",
      patient.employee_name,
      patient.employee_number,
      patient.area || "",
      patient.position_name || "",
      patient.sex || "",
      buildDiagnoses(patient),
      patient.risk_level,
      patient.program_status,
      patient.last_followup_date || "",
      patient.next_followup_date || "",
      patient.created_by_email || "",
      patient.notes || "",
    ]);

    downloadCsv(`programa-cronico-degenerativos-${getToday()}.csv`, headers, rows);
  }

  function exportFollowupsCsv() {
    const headers = [
      "Fecha",
      "Paciente",
      "Empleado",
      "TA sistolica",
      "TA diastolica",
      "FC",
      "Glucosa",
      "Tipo glucosa",
      "Peso",
      "Talla",
      "IMC",
      "Cintura",
      "Apego",
      "Referido",
      "Proximo seguimiento",
      "Capturo",
      "Intervencion",
    ];

    const rows = followups.map((followup) => {
      const patient = patients.find((item) => item.id === followup.patient_id);

      return [
        followup.followup_date,
        patient?.employee_name || "",
        patient?.employee_number || "",
        followup.systolic_bp || "",
        followup.diastolic_bp || "",
        followup.heart_rate || "",
        followup.glucose_mg_dl || "",
        followup.glucose_type || "",
        followup.weight_kg || "",
        followup.height_m || "",
        followup.bmi || "",
        followup.waist_cm || "",
        followup.medication_adherence || "",
        followup.referred ? "Sí" : "No",
        followup.next_followup_date || "",
        followup.created_by_email || "",
        followup.intervention || "",
      ];
    });

    downloadCsv(`seguimientos-cronico-degenerativos-${getToday()}.csv`, headers, rows);
  }

  const projectedBmi = calculateBmi(followupForm.weight_kg, followupForm.height_m);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
          Cargando programa crónico-degenerativo...
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard label="Pacientes" value={kpis.total} helper="Filtrados" tone="dark" />
        <KpiCard label="Activos" value={kpis.active} helper="Sin baja" />
        <KpiCard
          label="Alto / crítico"
          value={kpis.highRisk}
          helper="Prioridad clínica"
          tone={kpis.highRisk > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Por seguimiento"
          value={kpis.due}
          helper="Vencidos o al día de hoy"
          tone={kpis.due > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Referidos"
          value={kpis.referred}
          helper="Escalados"
          tone={kpis.referred > 0 ? "blue" : "neutral"}
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Vigilancia clínica preventiva
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              {editingPatientId ? "Editar paciente" : "Alta en programa crónico-degenerativo"}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              HTA, DM2, dislipidemia, obesidad y seguimiento preventivo.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canRegister || editingPatientId ? (
          <form onSubmit={savePatient} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre del colaborador"
              value={patientForm.employee_name}
              onChange={(event) => updatePatientField("employee_name", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Número de empleado"
              value={patientForm.employee_number}
              onChange={(event) => updatePatientField("employee_number", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Área"
              value={patientForm.area}
              onChange={(event) => updatePatientField("area", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Puesto"
              value={patientForm.position_name}
              onChange={(event) => updatePatientField("position_name", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={patientForm.birth_date}
              onChange={(event) => updatePatientField("birth_date", event.target.value)}
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={patientForm.sex}
              onChange={(event) => updatePatientField("sex", event.target.value)}
            >
              {sexOptions.map((sex) => (
                <option key={sex} value={sex}>
                  {sex}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={patientForm.risk_level}
              onChange={(event) => updatePatientField("risk_level", event.target.value)}
            >
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>
                  Riesgo {risk}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={patientForm.program_status}
              onChange={(event) => updatePatientField("program_status", event.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:col-span-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                Diagnósticos
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={patientForm.has_hta}
                    onChange={(event) => updatePatientField("has_hta", event.target.checked)}
                  />
                  HTA
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={patientForm.has_dm2}
                    onChange={(event) => updatePatientField("has_dm2", event.target.checked)}
                  />
                  DM2
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={patientForm.has_dyslipidemia}
                    onChange={(event) => updatePatientField("has_dyslipidemia", event.target.checked)}
                  />
                  Dislipidemia
                </label>

                <label className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold">
                  <input
                    type="checkbox"
                    checked={patientForm.has_obesity}
                    onChange={(event) => updatePatientField("has_obesity", event.target.checked)}
                  />
                  Obesidad
                </label>
              </div>
            </div>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Otro diagnóstico"
              value={patientForm.other_diagnosis}
              onChange={(event) => updatePatientField("other_diagnosis", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              type="date"
              value={patientForm.next_followup_date}
              onChange={(event) => updatePatientField("next_followup_date", event.target.value)}
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-4"
              placeholder="Notas clínicas / operativas"
              value={patientForm.notes}
              onChange={(event) => updatePatientField("notes", event.target.value)}
            />

            <div className="flex flex-col gap-2 md:col-span-4 md:flex-row">
              <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800">
                {editingPatientId ? "Guardar modificación" : "Registrar paciente"}
              </button>

              {editingPatientId && (
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
          <EmptyState text="Tu rol actual no permite registrar pacientes." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Padrón clínico-operativo
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Pacientes en programa
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Registros filtrados: {filteredPatients.length}
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
              onClick={exportPatientsCsv}
              className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white hover:bg-zinc-800"
            >
              Exportar padrón
            </button>

            <button
              type="button"
              onClick={exportFollowupsCsv}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Exportar seguimientos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
          >
            <option value="Todos">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.risk}
            onChange={(event) => updateFilter("risk", event.target.value)}
          >
            <option value="Todos">Todos los riesgos</option>
            {riskOptions.map((risk) => (
              <option key={risk} value={risk}>
                {risk}
              </option>
            ))}
          </select>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            value={filters.diagnosis}
            onChange={(event) => updateFilter("diagnosis", event.target.value)}
          >
            <option value="Todos">Todos los diagnósticos</option>
            <option value="HTA">HTA</option>
            <option value="DM2">DM2</option>
            <option value="Dislipidemia">Dislipidemia</option>
            <option value="Obesidad">Obesidad</option>
            <option value="Otro">Otro</option>
          </select>

          <input
            className="rounded-2xl border border-zinc-300 px-4 py-3"
            placeholder="Buscar"
            value={filters.searchText}
            onChange={(event) => updateFilter("searchText", event.target.value)}
          />

          <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700">
            <input
              type="checkbox"
              checked={filters.dueOnly}
              onChange={(event) => updateFilter("dueOnly", event.target.checked)}
            />
            Solo vencidos
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1450px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Folio</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Área</th>
                <th className="p-3">Diagnósticos</th>
                <th className="p-3">Riesgo</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Último seguimiento</th>
                <th className="p-3">Próximo seguimiento</th>
                <th className="p-3">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredPatients.map((patient) => (
                <tr key={patient.id} className="border-b align-top hover:bg-zinc-50">
                  <td className="p-3">
                    <span className="rounded-full bg-zinc-950 px-2 py-1 text-xs font-black text-white">
                      {patient.folio || "Sin folio"}
                    </span>
                  </td>

                  <td className="p-3 font-bold">{patient.employee_name}</td>
                  <td className="p-3">{patient.employee_number}</td>
                  <td className="p-3">{patient.area || "-"}</td>
                  <td className="p-3">{buildDiagnoses(patient)}</td>

                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getRiskBadgeClass(patient.risk_level)}`}>
                      {patient.risk_level}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getStatusBadgeClass(patient.program_status)}`}>
                      {patient.program_status}
                    </span>
                  </td>

                  <td className="p-3">{patient.last_followup_date || "-"}</td>
                  <td className="p-3">{patient.next_followup_date || "-"}</td>

                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => selectPatientForFollowup(patient)}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50"
                      >
                        Seguimiento
                      </button>

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEditPatient(patient)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                        >
                          Editar
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => deletePatient(patient.id)}
                          className="rounded-xl px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-100"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPatients.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay pacientes registrados o no coinciden con los filtros." />
            </div>
          )}
        </div>
      </section>

      <section
        id="chronic-followup-form"
        className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Seguimiento clínico
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Registro de control periódico
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {selectedPatient
                ? `${selectedPatient.folio || "Sin folio"} · ${selectedPatient.employee_name}`
                : "Selecciona un paciente desde el padrón."}
            </p>
          </div>

          <select
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold"
            value={selectedPatientId}
            onChange={(event) => setSelectedPatientId(event.target.value)}
          >
            <option value="">Seleccionar paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.folio || "Sin folio"} · {patient.employee_name} · {patient.employee_number}
              </option>
            ))}
          </select>
        </div>

        {selectedPatient && canRegister ? (
          <form onSubmit={saveFollowup} className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={followupForm.followup_date}
              onChange={(event) => updateFollowupField("followup_date", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA sistólica"
              type="number"
              value={followupForm.systolic_bp}
              onChange={(event) => updateFollowupField("systolic_bp", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="TA diastólica"
              type="number"
              value={followupForm.diastolic_bp}
              onChange={(event) => updateFollowupField("diastolic_bp", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="FC"
              type="number"
              value={followupForm.heart_rate}
              onChange={(event) => updateFollowupField("heart_rate", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Glucosa mg/dL"
              type="number"
              value={followupForm.glucose_mg_dl}
              onChange={(event) => updateFollowupField("glucose_mg_dl", event.target.value)}
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={followupForm.glucose_type}
              onChange={(event) => updateFollowupField("glucose_type", event.target.value)}
            >
              {glucoseTypeOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Peso kg"
              type="number"
              step="0.01"
              value={followupForm.weight_kg}
              onChange={(event) => updateFollowupField("weight_kg", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Talla m"
              type="number"
              step="0.01"
              value={followupForm.height_m}
              onChange={(event) => updateFollowupField("height_m", event.target.value)}
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                IMC calculado
              </span>
              <div className="mt-1 text-xl font-black">{projectedBmi || "-"}</div>
            </div>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Cintura cm"
              type="number"
              step="0.1"
              value={followupForm.waist_cm}
              onChange={(event) => updateFollowupField("waist_cm", event.target.value)}
            />

            <select
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={followupForm.medication_adherence}
              onChange={(event) => updateFollowupField("medication_adherence", event.target.value)}
            >
              {adherenceOptions.map((item) => (
                <option key={item} value={item}>
                  Apego: {item}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={followupForm.next_followup_date}
              onChange={(event) => updateFollowupField("next_followup_date", event.target.value)}
            />

            <label className="flex items-center gap-2 rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={followupForm.referred}
                onChange={(event) => updateFollowupField("referred", event.target.checked)}
              />
              Requiere referencia
            </label>

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Síntomas / hallazgos"
              value={followupForm.symptoms}
              onChange={(event) => updateFollowupField("symptoms", event.target.value)}
            />

            <textarea
              className="min-h-24 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Intervención / educación / indicaciones"
              value={followupForm.intervention}
              onChange={(event) => updateFollowupField("intervention", event.target.value)}
            />

            <textarea
              className="min-h-20 rounded-2xl border border-zinc-300 px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-4"
              placeholder="Motivo de referencia, si aplica"
              value={followupForm.referral_reason}
              onChange={(event) => updateFollowupField("referral_reason", event.target.value)}
            />

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-4">
              Guardar seguimiento
            </button>
          </form>
        ) : (
          <EmptyState
            text={
              selectedPatient
                ? "Tu rol actual no permite registrar seguimientos."
                : "Selecciona un paciente para registrar seguimiento."
            }
          />
        )}

        {selectedPatient && (
          <div className="mt-6 overflow-x-auto">
            <h3 className="mb-3 text-lg font-black tracking-tight">
              Historial de seguimientos del paciente
            </h3>

            <table className="w-full min-w-[1200px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">TA</th>
                  <th className="p-3">FC</th>
                  <th className="p-3">Glucosa</th>
                  <th className="p-3">Peso</th>
                  <th className="p-3">IMC</th>
                  <th className="p-3">Apego</th>
                  <th className="p-3">Referido</th>
                  <th className="p-3">Próximo</th>
                  <th className="p-3">Intervención</th>
                  {canDelete && <th className="p-3 text-right">Acciones</th>}
                </tr>
              </thead>

              <tbody>
                {selectedPatientFollowups.map((followup) => (
                  <tr key={followup.id} className="border-b align-top hover:bg-zinc-50">
                    <td className="p-3">{followup.followup_date}</td>
                    <td className="p-3">
                      {followup.systolic_bp || "-"} / {followup.diastolic_bp || "-"}
                    </td>
                    <td className="p-3">{followup.heart_rate || "-"}</td>
                    <td className="p-3">
                      {followup.glucose_mg_dl || "-"}{" "}
                      <span className="text-xs text-zinc-500">
                        {followup.glucose_type || ""}
                      </span>
                    </td>
                    <td className="p-3">{followup.weight_kg || "-"}</td>
                    <td className="p-3">{followup.bmi || "-"}</td>
                    <td className="p-3">{followup.medication_adherence || "-"}</td>
                    <td className="p-3">{followup.referred ? "Sí" : "No"}</td>
                    <td className="p-3">{followup.next_followup_date || "-"}</td>
                    <td className="p-3">{followup.intervention || "-"}</td>

                    {canDelete && (
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => deleteFollowup(followup.id)}
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

            {selectedPatientFollowups.length === 0 && (
              <div className="mt-4">
                <EmptyState text="Este paciente aún no tiene seguimientos registrados." />
              </div>
            )}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Reporte preventivo
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Reporte mensual crónico-degenerativo
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {getMonthLabel(reportMonth)} · {monthlyReport.totalFollowups} seguimientos
            </p>
          </div>

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
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <KpiCard label="Seguimientos" value={monthlyReport.totalFollowups} helper="En el mes" tone="dark" />
          <KpiCard label="Pacientes vistos" value={monthlyReport.patientsSeen} helper="Con control mensual" />
          <KpiCard label="Controlados" value={monthlyReport.controlled} helper="Estado actual" />
          <KpiCard label="En vigilancia" value={monthlyReport.surveillance} helper="Estado actual" tone="amber" />
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-700">
              Bitácora
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Movimientos del programa
            </h2>
          </div>

          <button
            type="button"
            onClick={loadData}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
          >
            Actualizar
          </button>
        </div>

        {auditError ? (
          <EmptyState text={`Bitácora no disponible: ${auditError}`} />
        ) : auditLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Tabla</th>
                  <th className="p-3">Acción</th>
                  <th className="p-3">Usuario</th>
                </tr>
              </thead>

              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-zinc-50">
                    <td className="p-3">{formatDateTime(log.created_at)}</td>
                    <td className="p-3">{log.table_name}</td>
                    <td className="p-3">{log.action}</td>
                    <td className="p-3">{log.changed_by_email || "Sin usuario"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState text="Aún no hay movimientos en bitácora." />
        )}
      </section>
    </div>
  );
}