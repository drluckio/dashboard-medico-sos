import React, { useEffect, useMemo, useState } from "react";

/**
 * Dashboard Médico Operativo SOS
 * ------------------------------------------------------------
 * Aplicación React de una sola página para registrar atenciones médicas,
 * controlar inventario de medicamentos y visualizar KPIs mensuales.
 *
 * Características principales:
 * - Registro de atenciones médicas.
 * - Captura de paciente, número de empleado, fecha, riesgo, tiempo de atención.
 * - Consumo automático de medicamento desde inventario.
 * - Historial mensual filtrable.
 * - KPIs operativos: total de atenciones, tiempo promedio, riesgo alto, uso de medicamentos.
 * - Gráficas simples con SVG para evitar dependencias externas.
 * - Persistencia en localStorage.
 *
 * Escalabilidad futura:
 * - Sustituir localStorage por API REST/Firebase/Supabase.
 * - Agregar módulo de retroalimentación del paciente.
 * - Agregar agenda/citas.
 * - Agregar autenticación por rol: enfermería, médico, EHS, administración.
 * - Exportación a Excel/PDF.
 */

const STORAGE_KEYS = {
  attentions: "sos_medical_attentions_v1",
  medicines: "sos_medicine_inventory_v1",
};

const RISK_LEVELS = ["Bajo", "Medio", "Alto", "Crítico"];

const DEFAULT_MEDICINES = [
  { id: crypto.randomUUID(), name: "Paracetamol 500 mg", stock: 120, minimumStock: 30, unit: "tabletas" },
  { id: crypto.randomUUID(), name: "Ibuprofeno 400 mg", stock: 80, minimumStock: 20, unit: "tabletas" },
  { id: crypto.randomUUID(), name: "Loratadina 10 mg", stock: 60, minimumStock: 15, unit: "tabletas" },
  { id: crypto.randomUUID(), name: "Vida Suero Oral", stock: 40, minimumStock: 10, unit: "sobres" },
];

const EMPTY_ATTENTION = {
  patientName: "",
  employeeNumber: "",
  date: new Date().toISOString().slice(0, 10),
  area: "",
  diagnosis: "",
  riskLevel: "Bajo",
  attentionMinutes: 15,
  medicineId: "",
  medicineQuantity: 0,
  notes: "",
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error(`Error leyendo localStorage: ${key}`, error);
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error guardando localStorage: ${key}`, error);
  }
}

function formatCurrencyLikeNumber(value) {
  return new Intl.NumberFormat("es-MX").format(value || 0);
}

function getMonthKey(dateString) {
  if (!dateString) return "Sin fecha";
  return dateString.slice(0, 7);
}

function getMonthLabel(monthKey) {
  if (!monthKey || monthKey === "Sin fecha") return monthKey;
  const [year, month] = monthKey.split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function groupByMonth(attentions) {
  return attentions.reduce((acc, item) => {
    const key = getMonthKey(item.date);
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});
}

function calculateKpis(attentions, medicines) {
  const total = attentions.length;
  const totalMinutes = attentions.reduce((sum, item) => sum + Number(item.attentionMinutes || 0), 0);
  const averageMinutes = total ? totalMinutes / total : 0;
  const highRisk = attentions.filter((item) => ["Alto", "Crítico"].includes(item.riskLevel)).length;
  const criticalRisk = attentions.filter((item) => item.riskLevel === "Crítico").length;
  const medicineUsage = attentions.reduce((sum, item) => sum + Number(item.medicineQuantity || 0), 0);
  const lowStock = medicines.filter((item) => Number(item.stock) <= Number(item.minimumStock)).length;

  return {
    total,
    averageMinutes,
    highRisk,
    criticalRisk,
    medicineUsage,
    lowStock,
  };
}

function buildRiskChart(attentions) {
  return RISK_LEVELS.map((level) => ({
    label: level,
    value: attentions.filter((item) => item.riskLevel === level).length,
  }));
}

function buildMedicineUsageChart(attentions, medicines) {
  return medicines.map((medicine) => ({
    label: medicine.name.replace(/\s\d+.*/, ""),
    value: attentions
      .filter((item) => item.medicineId === medicine.id)
      .reduce((sum, item) => sum + Number(item.medicineQuantity || 0), 0),
  }));
}

function buildMonthlyTrend(attentions) {
  const grouped = groupByMonth(attentions);
  return Object.keys(grouped)
    .sort()
    .map((monthKey) => ({
      label: getMonthLabel(monthKey),
      value: grouped[monthKey].length,
    }));
}

function Card({ title, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm ${className}`}>
      {title && <h2 className="mb-4 text-lg font-semibold text-zinc-900">{title}</h2>}
      {children}
    </section>
  );
}

function KpiCard({ label, value, helper }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-zinc-950">{value}</p>
      {helper && <p className="mt-2 text-xs text-zinc-500">{helper}</p>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}

function inputClass() {
  return "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-red-600 focus:ring-2 focus:ring-red-100";
}

function Badge({ children, tone = "neutral" }) {
  const tones = {
    neutral: "bg-zinc-100 text-zinc-700",
    low: "bg-emerald-100 text-emerald-800",
    medium: "bg-amber-100 text-amber-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function getRiskTone(riskLevel) {
  if (riskLevel === "Bajo") return "low";
  if (riskLevel === "Medio") return "medium";
  if (riskLevel === "Alto") return "high";
  if (riskLevel === "Crítico") return "critical";
  return "neutral";
}

function BarChart({ data, title, suffix = "" }) {
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">{title}</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const width = `${Math.max((Number(item.value || 0) / max) * 100, item.value ? 8 : 0)}%`;
          return (
            <div key={item.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-zinc-600">
                <span className="truncate">{item.label}</span>
                <span className="font-semibold text-zinc-900">{formatCurrencyLikeNumber(item.value)}{suffix}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full rounded-full bg-zinc-900" style={{ width }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LineChartSvg({ data, title }) {
  const width = 720;
  const height = 220;
  const padding = 36;
  const max = Math.max(...data.map((item) => item.value), 1);
  const points = data.map((item, index) => {
    const x = padding + (index * (width - padding * 2)) / Math.max(data.length - 1, 1);
    const y = height - padding - (item.value / max) * (height - padding * 2);
    return { ...item, x, y };
  });

  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-zinc-700">{title}</h3>
      <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-zinc-50 p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#d4d4d8" />
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#d4d4d8" />
          <path d={path} fill="none" stroke="#18181b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.label}>
              <circle cx={point.x} cy={point.y} r="5" fill="#18181b" />
              <text x={point.x} y={point.y - 10} textAnchor="middle" fontSize="12" fill="#18181b">
                {point.value}
              </text>
              <text x={point.x} y={height - 10} textAnchor="middle" fontSize="10" fill="#71717a">
                {point.label.slice(0, 3)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

function AttentionForm({ medicines, onSubmit }) {
  const [form, setForm] = useState(EMPTY_ATTENTION);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.patientName.trim()) {
      alert("Captura el nombre del paciente.");
      return;
    }

    if (!form.employeeNumber.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const selectedMedicine = medicines.find((item) => item.id === form.medicineId);
    const quantity = Number(form.medicineQuantity || 0);

    if (selectedMedicine && quantity > Number(selectedMedicine.stock)) {
      alert("La cantidad indicada supera el inventario disponible.");
      return;
    }

    onSubmit({
      ...form,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      attentionMinutes: Number(form.attentionMinutes || 0),
      medicineQuantity: quantity,
    });

    setForm({ ...EMPTY_ATTENTION, date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <Card title="Registrar atención médica">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Field label="Nombre del paciente">
          <input className={inputClass()} value={form.patientName} onChange={(e) => updateField("patientName", e.target.value)} placeholder="Ej. Juan Pérez" />
        </Field>

        <Field label="Número de empleado">
          <input className={inputClass()} value={form.employeeNumber} onChange={(e) => updateField("employeeNumber", e.target.value)} placeholder="Ej. 004512" />
        </Field>

        <Field label="Fecha de atención">
          <input className={inputClass()} type="date" value={form.date} onChange={(e) => updateField("date", e.target.value)} />
        </Field>

        <Field label="Área / departamento">
          <input className={inputClass()} value={form.area} onChange={(e) => updateField("area", e.target.value)} placeholder="Ej. Producción, almacén, calidad" />
        </Field>

        <Field label="Diagnóstico / motivo de atención">
          <input className={inputClass()} value={form.diagnosis} onChange={(e) => updateField("diagnosis", e.target.value)} placeholder="Ej. Cefalea, contusión, revisión" />
        </Field>

        <Field label="Nivel de riesgo">
          <select className={inputClass()} value={form.riskLevel} onChange={(e) => updateField("riskLevel", e.target.value)}>
            {RISK_LEVELS.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </Field>

        <Field label="Tiempo de atención, minutos">
          <input className={inputClass()} type="number" min="0" value={form.attentionMinutes} onChange={(e) => updateField("attentionMinutes", e.target.value)} />
        </Field>

        <Field label="Medicamento otorgado">
          <select className={inputClass()} value={form.medicineId} onChange={(e) => updateField("medicineId", e.target.value)}>
            <option value="">Sin medicamento</option>
            {medicines.map((medicine) => (
              <option key={medicine.id} value={medicine.id}>
                {medicine.name} — stock: {medicine.stock} {medicine.unit}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Cantidad otorgada">
          <input className={inputClass()} type="number" min="0" value={form.medicineQuantity} onChange={(e) => updateField("medicineQuantity", e.target.value)} />
        </Field>

        <div className="md:col-span-2 xl:col-span-3">
          <Field label="Notas clínicas / seguimiento">
            <textarea className={`${inputClass()} min-h-24`} value={form.notes} onChange={(e) => updateField("notes", e.target.value)} placeholder="Observaciones, indicaciones, referencia, reposo, seguimiento, ST7, etc." />
          </Field>
        </div>

        <div className="md:col-span-2 xl:col-span-3">
          <button className="rounded-xl bg-red-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-800" type="submit">
            Guardar atención
          </button>
        </div>
      </form>
    </Card>
  );
}

function InventoryManager({ medicines, setMedicines }) {
  const [medicineForm, setMedicineForm] = useState({ name: "", stock: 0, minimumStock: 0, unit: "piezas" });

  function addMedicine(event) {
    event.preventDefault();
    if (!medicineForm.name.trim()) {
      alert("Captura el nombre del medicamento.");
      return;
    }

    setMedicines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name: medicineForm.name.trim(),
        stock: Number(medicineForm.stock || 0),
        minimumStock: Number(medicineForm.minimumStock || 0),
        unit: medicineForm.unit.trim() || "piezas",
      },
    ]);

    setMedicineForm({ name: "", stock: 0, minimumStock: 0, unit: "piezas" });
  }

  function updateStock(id, value) {
    setMedicines((current) => current.map((item) => (item.id === id ? { ...item, stock: Number(value || 0) } : item)));
  }

  function removeMedicine(id) {
    if (!confirm("¿Eliminar este medicamento del inventario?")) return;
    setMedicines((current) => current.filter((item) => item.id !== id));
  }

  return (
    <Card title="Inventario de medicamentos">
      <form onSubmit={addMedicine} className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-5">
        <input className={`${inputClass()} md:col-span-2`} value={medicineForm.name} onChange={(e) => setMedicineForm({ ...medicineForm, name: e.target.value })} placeholder="Medicamento" />
        <input className={inputClass()} type="number" min="0" value={medicineForm.stock} onChange={(e) => setMedicineForm({ ...medicineForm, stock: e.target.value })} placeholder="Stock" />
        <input className={inputClass()} type="number" min="0" value={medicineForm.minimumStock} onChange={(e) => setMedicineForm({ ...medicineForm, minimumStock: e.target.value })} placeholder="Mínimo" />
        <button className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800" type="submit">
          Agregar
        </button>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="p-3">Medicamento</th>
              <th className="p-3">Stock actual</th>
              <th className="p-3">Stock mínimo</th>
              <th className="p-3">Unidad</th>
              <th className="p-3">Estado</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {medicines.map((medicine) => {
              const isLow = Number(medicine.stock) <= Number(medicine.minimumStock);
              return (
                <tr key={medicine.id} className="border-b last:border-0">
                  <td className="p-3 font-medium text-zinc-900">{medicine.name}</td>
                  <td className="p-3">
                    <input className="w-24 rounded-lg border border-zinc-300 px-2 py-1" type="number" min="0" value={medicine.stock} onChange={(e) => updateStock(medicine.id, e.target.value)} />
                  </td>
                  <td className="p-3">{medicine.minimumStock}</td>
                  <td className="p-3">{medicine.unit}</td>
                  <td className="p-3">{isLow ? <Badge tone="critical">Reabastecer</Badge> : <Badge tone="low">Suficiente</Badge>}</td>
                  <td className="p-3 text-right">
                    <button className="rounded-lg px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => removeMedicine(medicine.id)} type="button">
                      Eliminar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function HistoryTable({ attentions, medicines, onDelete }) {
  return (
    <Card title="Historial mensual de atenciones">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <th className="p-3">Fecha</th>
              <th className="p-3">Paciente</th>
              <th className="p-3">No. empleado</th>
              <th className="p-3">Área</th>
              <th className="p-3">Motivo / diagnóstico</th>
              <th className="p-3">Riesgo</th>
              <th className="p-3">Tiempo</th>
              <th className="p-3">Medicamento</th>
              <th className="p-3">Notas</th>
              <th className="p-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {attentions.length === 0 ? (
              <tr>
                <td colSpan="10" className="p-6 text-center text-zinc-500">No hay atenciones registradas para este periodo.</td>
              </tr>
            ) : (
              attentions.map((attention) => {
                const medicine = medicines.find((item) => item.id === attention.medicineId);
                return (
                  <tr key={attention.id} className="border-b align-top last:border-0">
                    <td className="p-3 text-zinc-700">{attention.date}</td>
                    <td className="p-3 font-medium text-zinc-900">{attention.patientName}</td>
                    <td className="p-3">{attention.employeeNumber}</td>
                    <td className="p-3">{attention.area || "—"}</td>
                    <td className="p-3">{attention.diagnosis || "—"}</td>
                    <td className="p-3"><Badge tone={getRiskTone(attention.riskLevel)}>{attention.riskLevel}</Badge></td>
                    <td className="p-3">{attention.attentionMinutes} min</td>
                    <td className="p-3">{medicine ? `${medicine.name} x ${attention.medicineQuantity}` : "—"}</td>
                    <td className="max-w-xs p-3 text-zinc-600">{attention.notes || "—"}</td>
                    <td className="p-3 text-right">
                      <button className="rounded-lg px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-50" onClick={() => onDelete(attention.id)} type="button">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function FutureModules() {
  return (
    <Card title="Módulos preparados para crecimiento">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-zinc-50 p-4">
          <h3 className="font-semibold text-zinc-900">Retroalimentación del paciente</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Próxima extensión: encuesta posterior a la atención, puntuación de satisfacción,
            comentarios, tiempo percibido de respuesta y alertas por calificación baja.
          </p>
        </div>
        <div className="rounded-2xl bg-zinc-50 p-4">
          <h3 className="font-semibold text-zinc-900">Agenda y programación de citas</h3>
          <p className="mt-2 text-sm text-zinc-600">
            Próxima extensión: calendario de consultas, campañas de salud, citas de seguimiento,
            exámenes periódicos y recordatorios automáticos.
          </p>
        </div>
      </div>
    </Card>
  );
}

export default function App() {
  const [attentions, setAttentions] = useState(() => loadFromStorage(STORAGE_KEYS.attentions, []));
  const [medicines, setMedicines] = useState(() => loadFromStorage(STORAGE_KEYS.medicines, DEFAULT_MEDICINES));
  const [selectedMonth, setSelectedMonth] = useState("Todos");
  const [search, setSearch] = useState("");

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.attentions, attentions);
  }, [attentions]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.medicines, medicines);
  }, [medicines]);

  const monthOptions = useMemo(() => {
    const months = Array.from(new Set(attentions.map((item) => getMonthKey(item.date)))).sort().reverse();
    return ["Todos", ...months];
  }, [attentions]);

  const filteredAttentions = useMemo(() => {
    return attentions
      .filter((item) => selectedMonth === "Todos" || getMonthKey(item.date) === selectedMonth)
      .filter((item) => {
        const term = search.trim().toLowerCase();
        if (!term) return true;
        return [item.patientName, item.employeeNumber, item.area, item.diagnosis, item.riskLevel]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [attentions, selectedMonth, search]);

  const kpis = useMemo(() => calculateKpis(filteredAttentions, medicines), [filteredAttentions, medicines]);
  const riskChart = useMemo(() => buildRiskChart(filteredAttentions), [filteredAttentions]);
  const medicineChart = useMemo(() => buildMedicineUsageChart(filteredAttentions, medicines), [filteredAttentions, medicines]);
  const monthlyTrend = useMemo(() => buildMonthlyTrend(attentions), [attentions]);

  function addAttention(attention) {
    setAttentions((current) => [attention, ...current]);

    if (attention.medicineId && Number(attention.medicineQuantity) > 0) {
      setMedicines((current) =>
        current.map((medicine) =>
          medicine.id === attention.medicineId
            ? { ...medicine, stock: Math.max(Number(medicine.stock) - Number(attention.medicineQuantity), 0) }
            : medicine
        )
      );
    }
  }

  function deleteAttention(id) {
    if (!confirm("¿Eliminar esta atención? Esta acción no regresa automáticamente medicamento al inventario.")) return;
    setAttentions((current) => current.filter((item) => item.id !== id));
  }

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-950 px-5 py-6 text-white md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-500">SOS · Salud ocupacional</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Dashboard de Atenciones Médicas</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-300">
              Registro clínico-operativo, inventario de medicamento, historial mensual y KPIs para consultorio industrial in-plant.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
            Periodo activo: <span className="font-semibold text-white">{selectedMonth === "Todos" ? "Todos los meses" : getMonthLabel(selectedMonth)}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-6 md:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <KpiCard label="Atenciones" value={formatCurrencyLikeNumber(kpis.total)} helper="Total en el periodo filtrado" />
          <KpiCard label="Tiempo promedio" value={`${kpis.averageMinutes.toFixed(1)} min`} helper="Promedio por atención" />
          <KpiCard label="Riesgo alto/crítico" value={formatCurrencyLikeNumber(kpis.highRisk)} helper="Casos prioritarios" />
          <KpiCard label="Riesgo crítico" value={formatCurrencyLikeNumber(kpis.criticalRisk)} helper="Eventos de mayor severidad" />
          <KpiCard label="Medicamento usado" value={formatCurrencyLikeNumber(kpis.medicineUsage)} helper="Unidades entregadas" />
          <KpiCard label="Alertas stock" value={formatCurrencyLikeNumber(kpis.lowStock)} helper="Medicamentos bajo mínimo" />
        </div>

        <Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Filtrar por mes">
              <select className={inputClass()} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthOptions.map((month) => (
                  <option key={month} value={month}>{month === "Todos" ? "Todos los meses" : getMonthLabel(month)}</option>
                ))}
              </select>
            </Field>

            <Field label="Buscar paciente, empleado, área, diagnóstico o riesgo">
              <input className={inputClass()} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar..." />
            </Field>

            <div className="flex items-end">
              <button className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50" onClick={() => { setSelectedMonth("Todos"); setSearch(""); }} type="button">
                Limpiar filtros
              </button>
            </div>
          </div>
        </Card>

        <AttentionForm medicines={medicines} onSubmit={addAttention} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card title="KPIs visuales">
            <div className="space-y-8">
              <BarChart data={riskChart} title="Atenciones por nivel de riesgo" />
              <BarChart data={medicineChart} title="Uso de medicamento por tipo" />
            </div>
          </Card>

          <Card title="Resumen mensual">
            {monthlyTrend.length === 0 ? (
              <p className="text-sm text-zinc-500">Registra atenciones para visualizar la tendencia mensual.</p>
            ) : (
              <LineChartSvg data={monthlyTrend} title="Volumen mensual de atenciones" />
            )}
          </Card>
        </div>

        <InventoryManager medicines={medicines} setMedicines={setMedicines} />
        <HistoryTable attentions={filteredAttentions} medicines={medicines} onDelete={deleteAttention} />
        <FutureModules />
      </div>
    </main>
  );
}
