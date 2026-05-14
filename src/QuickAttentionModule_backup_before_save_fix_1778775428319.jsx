import React, { useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const initialForm = {
  attention_date: todayIso(),
  company_id: "",
  plant_id: "",

  patient_name: "",
  employee_number: "",
  area: "",

  reason: "",
  condition_classification: "Enfermedad general",
  risk_level: "Bajo",

  systolic_bp: "",
  diastolic_bp: "",
  heart_rate: "",
  respiratory_rate: "",
  temperature: "",
  glucose: "",
  spo2: "",

  management: "",
  requires_followup: "No",
  followup_reason: "",

  medicine_id: "",
  medicine_quantity: "0",

  attention_minutes: "10",
  notes: "",
};

const conditionOptions = [
  "Enfermedad general",
  "Lesión musculoesquelética",
  "Trauma / golpe",
  "Herida / curación",
  "Gastrointestinal",
  "Respiratorio",
  "Cefalea / neurológico",
  "Presión arterial",
  "Glucosa / metabólico",
  "Dermatológico",
  "Oftalmológico",
  "Valoración por alcoholimetría",
  "Valoración por antidoping",
  "Ansiedad / emocional",
  "Seguimiento",
  "Otro",
];

const riskOptions = ["Bajo", "Medio", "Alto", "Crítico"];

function normalizeNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4"
      />
    </label>
  );
}

function TextAreaInput({
  label,
  value,
  onChange,
  rows = 3,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full resize-none rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4"
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4"
      >
        {options.map((option) => {
          const optionValue = typeof option === "string" ? option : option.value;
          const optionLabel = typeof option === "string" ? option : option.label;

          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function getVitalRisk(form) {
  const systolic = normalizeNumber(form.systolic_bp);
  const diastolic = normalizeNumber(form.diastolic_bp);
  const heartRate = normalizeNumber(form.heart_rate);
  const temperature = normalizeNumber(form.temperature);
  const glucose = normalizeNumber(form.glucose);
  const spo2 = normalizeNumber(form.spo2);

  const redFlags = [];

  if (systolic !== null && systolic >= 180) {
    redFlags.push("TA sistólica crítica");
  }

  if (diastolic !== null && diastolic >= 120) {
    redFlags.push("TA diastólica crítica");
  }

  if (systolic !== null && systolic <= 80) {
    redFlags.push("TA sistólica baja");
  }

  if (heartRate !== null && (heartRate < 45 || heartRate > 130)) {
    redFlags.push("Frecuencia cardiaca fuera de rango");
  }

  if (temperature !== null && temperature >= 38.5) {
    redFlags.push("Fiebre");
  }

  if (glucose !== null && (glucose < 70 || glucose >= 300)) {
    redFlags.push("Glucosa fuera de rango");
  }

  if (spo2 !== null && spo2 < 92) {
    redFlags.push("SpO₂ baja");
  }

  return redFlags;
}

function buildDiagnosis(form) {
  const parts = [
    form.reason?.trim(),
    form.condition_classification?.trim(),
  ].filter(Boolean);

  return parts.join(" — ") || "Atención rápida";
}

function buildNotes(form, redFlags) {
  const sections = [];

  if (form.management?.trim()) {
    sections.push(`MANEJO OTORGADO:\n${form.management.trim()}`);
  }

  if (form.requires_followup === "Sí") {
    sections.push(
      `REQUIERE SEGUIMIENTO:\n${form.followup_reason?.trim() || "Sí, sin detalle adicional."}`
    );
  }

  if (redFlags.length > 0) {
    sections.push(`ALERTAS CLÍNICAS:\n${redFlags.join("\n")}`);
  }

  const vitalLines = [];

  if (form.systolic_bp || form.diastolic_bp) {
    vitalLines.push(`TA: ${form.systolic_bp || "-"} / ${form.diastolic_bp || "-"} mmHg`);
  }

  if (form.heart_rate) {
    vitalLines.push(`FC: ${form.heart_rate} lpm`);
  }

  if (form.respiratory_rate) {
    vitalLines.push(`FR: ${form.respiratory_rate} rpm`);
  }

  if (form.temperature) {
    vitalLines.push(`Temp: ${form.temperature} °C`);
  }

  if (form.glucose) {
    vitalLines.push(`Glucosa: ${form.glucose} mg/dL`);
  }

  if (form.spo2) {
    vitalLines.push(`SpO₂: ${form.spo2}%`);
  }

  if (vitalLines.length > 0) {
    sections.push(`SIGNOS VITALES:\n${vitalLines.join("\n")}`);
  }

  if (form.notes?.trim()) {
    sections.push(`OBSERVACIONES:\n${form.notes.trim()}`);
  }

  return sections.join("\n\n");
}

export default function QuickAttentionModule({
  session,
  companies = [],
  plants = [],
  medicines = [],
  onSaved,
}) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  const filteredPlants = useMemo(() => {
    if (!form.company_id) return plants;
    return plants.filter((plant) => plant.company_id === form.company_id);
  }, [plants, form.company_id]);

  const redFlags = useMemo(() => getVitalRisk(form), [form]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectCompany(companyId) {
    setForm((current) => ({
      ...current,
      company_id: companyId,
      plant_id: "",
    }));
  }

  function clearForm() {
    setForm({
      ...initialForm,
      attention_date: todayIso(),
    });
  }

  function validateForm() {
    const errors = [];

    if (!form.patient_name.trim()) {
      errors.push("Falta nombre del colaborador.");
    }

    if (!form.employee_number.trim()) {
      errors.push("Falta número de empleado o identificador.");
    }

    if (!form.reason.trim()) {
      errors.push("Falta motivo de atención.");
    }

    if (!form.management.trim()) {
      errors.push("Falta manejo otorgado.");
    }

    if (form.requires_followup === "Sí" && !form.followup_reason.trim()) {
      errors.push("Marcaste seguimiento, pero falta motivo o pendiente.");
    }

    if (form.medicine_id && Number(form.medicine_quantity || 0) <= 0) {
      errors.push("Seleccionaste medicamento, pero la cantidad debe ser mayor a 0.");
    }

    return errors;
  }

  async function saveQuickAttention(event) {
    event.preventDefault();

    const errors = validateForm();

    if (errors.length > 0) {
      alert(errors.join("\n"));
      return;
    }

    setSaving(true);

    const computedRiskLevel =
      redFlags.length > 0 && form.risk_level === "Bajo" ? "Medio" : form.risk_level;

    const payload = {
      attention_date: form.attention_date,
      company_id: form.company_id || null,
      plant_id: form.plant_id || null,

      patient_name: form.patient_name.trim(),
      employee_number: form.employee_number.trim(),
      area: form.area.trim() || null,

      diagnosis: buildDiagnosis(form),
      condition_classification: form.condition_classification || null,
      risk_level: computedRiskLevel,

      attention_minutes: Number(form.attention_minutes || 0),
      medicine_id: form.medicine_id || null,
      medicine_quantity: Number(form.medicine_quantity || 0),

      heart_rate: normalizeNumber(form.heart_rate),
      respiratory_rate: normalizeNumber(form.respiratory_rate),
      systolic_bp: normalizeNumber(form.systolic_bp),
      diastolic_bp: normalizeNumber(form.diastolic_bp),
      temperature: normalizeNumber(form.temperature),

      notes: buildNotes(form, redFlags),

      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || null,
    };

    const { data, error } = await supabase
      .from("attentions")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      alert("No se pudo guardar la atención rápida: " + error.message);
      setSaving(false);
      return;
    }

    setLastSaved(data);
    setSaving(false);
    clearForm();

    if (onSaved) {
      onSaved();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Captura rápida
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              Nueva atención rápida
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Registro operativo simplificado para consulta in-plant, eventos menores,
              valoración inicial y atenciones de enfermería.
            </p>
          </div>

          <button
            type="button"
            onClick={clearForm}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Limpiar
          </button>
        </div>

        {lastSaved && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Atención rápida guardada correctamente: {lastSaved.patient_name}
          </div>
        )}

        {redFlags.length > 0 && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="font-black">Alertas clínicas detectadas:</p>
            <ul className="mt-2 list-disc pl-5">
              {redFlags.map((flag) => (
                <li key={flag}>{flag}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <form onSubmit={saveQuickAttention} className="space-y-6">
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-zinc-950">
            Datos generales
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextInput
              label="Fecha"
              type="date"
              value={form.attention_date}
              onChange={(value) => updateField("attention_date", value)}
            />

            <SelectInput
              label="Empresa"
              value={form.company_id}
              onChange={selectCompany}
              options={[
                { value: "", label: "Sin empresa asignada" },
                ...companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
            />

            <SelectInput
              label="Planta"
              value={form.plant_id}
              onChange={(value) => updateField("plant_id", value)}
              options={[
                { value: "", label: "Sin planta asignada" },
                ...filteredPlants.map((plant) => ({
                  value: plant.id,
                  label: plant.name,
                })),
              ]}
            />

            <TextInput
              label="Nombre del colaborador"
              value={form.patient_name}
              onChange={(value) => updateField("patient_name", value)}
              placeholder="Nombre completo"
            />

            <TextInput
              label="Número de empleado / identificador"
              value={form.employee_number}
              onChange={(value) => updateField("employee_number", value)}
            />

            <TextInput
              label="Área"
              value={form.area}
              onChange={(value) => updateField("area", value)}
              placeholder="Producción, almacén, mantenimiento..."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-zinc-950">
            Motivo y clasificación
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <TextInput
              label="Motivo de atención"
              value={form.reason}
              onChange={(value) => updateField("reason", value)}
              placeholder="Cefalea, dolor lumbar, mareo, herida..."
            />

            <SelectInput
              label="Clasificación"
              value={form.condition_classification}
              onChange={(value) => updateField("condition_classification", value)}
              options={conditionOptions}
            />

            <SelectInput
              label="Nivel de riesgo"
              value={form.risk_level}
              onChange={(value) => updateField("risk_level", value)}
              options={riskOptions}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-zinc-950">
            Signos vitales
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <TextInput
              label="TA sistólica"
              type="number"
              value={form.systolic_bp}
              onChange={(value) => updateField("systolic_bp", value)}
              placeholder="120"
            />

            <TextInput
              label="TA diastólica"
              type="number"
              value={form.diastolic_bp}
              onChange={(value) => updateField("diastolic_bp", value)}
              placeholder="80"
            />

            <TextInput
              label="FC"
              type="number"
              value={form.heart_rate}
              onChange={(value) => updateField("heart_rate", value)}
              placeholder="80"
            />

            <TextInput
              label="FR"
              type="number"
              value={form.respiratory_rate}
              onChange={(value) => updateField("respiratory_rate", value)}
              placeholder="18"
            />

            <TextInput
              label="Temperatura"
              type="number"
              value={form.temperature}
              onChange={(value) => updateField("temperature", value)}
              placeholder="36.5"
            />

            <TextInput
              label="Glucosa"
              type="number"
              value={form.glucose}
              onChange={(value) => updateField("glucose", value)}
              placeholder="mg/dL"
            />

            <TextInput
              label="SpO₂"
              type="number"
              value={form.spo2}
              onChange={(value) => updateField("spo2", value)}
              placeholder="%"
            />

            <TextInput
              label="Tiempo de atención"
              type="number"
              value={form.attention_minutes}
              onChange={(value) => updateField("attention_minutes", value)}
              placeholder="minutos"
            />
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-500">
            Nota: glucosa y SpO₂ quedan integradas en observaciones clínicas porque la
            tabla actual de atenciones no tiene columnas separadas para esos campos.
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-zinc-950">
            Manejo y seguimiento
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextAreaInput
              label="Manejo otorgado"
              value={form.management}
              onChange={(value) => updateField("management", value)}
              rows={4}
              placeholder="Orientación, curación, reposo breve, hidratación, medicamento, referencia..."
            />

            <TextAreaInput
              label="Observaciones"
              value={form.notes}
              onChange={(value) => updateField("notes", value)}
              rows={4}
            />

            <SelectInput
              label="¿Requiere seguimiento?"
              value={form.requires_followup}
              onChange={(value) => updateField("requires_followup", value)}
              options={["No", "Sí"]}
            />

            <TextAreaInput
              label="Motivo / pendiente de seguimiento"
              value={form.followup_reason}
              onChange={(value) => updateField("followup_reason", value)}
              rows={3}
              placeholder="Ej. acudir a UMF, revisar TA mañana, confirmar evolución..."
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h3 className="text-xl font-black text-zinc-950">
            Medicamento utilizado
          </h3>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SelectInput
              label="Medicamento"
              value={form.medicine_id}
              onChange={(value) => updateField("medicine_id", value)}
              options={[
                { value: "", label: "Sin medicamento" },
                ...medicines.map((medicine) => ({
                  value: medicine.id,
                  label: `${medicine.name} — Stock: ${medicine.stock}`,
                })),
              ]}
            />

            <TextInput
              label="Cantidad"
              type="number"
              value={form.medicine_quantity}
              onChange={(value) => updateField("medicine_quantity", value)}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-red-700 px-5 py-4 text-sm font-black text-white hover:bg-red-800 disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar atención rápida"}
          </button>
        </section>
      </form>
    </div>
  );
}