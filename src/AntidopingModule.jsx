import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

const resultOptions = ["Pendiente", "Negativo", "No negativo", "Inválido"];

const reasonOptions = [
  "Nuevo ingreso",
  "Aleatorio",
  "Sospecha razonable",
  "Post-accidente / incidente",
  "Retorno laboral",
  "Seguimiento",
  "Otro",
];

const testTypeOptions = [
  "Antidoping 5 parámetros",
  "Antidoping 6 parámetros",
  "Antidoping 10 parámetros",
  "Alcoholimetría",
  "Otro",
];

const sampleTypeOptions = ["Orina", "Saliva", "Aliento", "Otro"];

function createInitialForm() {
  return {
    test_date: new Date().toISOString().slice(0, 10),
    employee_name: "",
    employee_number: "",
    area: "",
    reason: "Nuevo ingreso",
    test_type: "Antidoping 5 parámetros",
    sample_type: "Orina",
    sample_code: "",
    lot_number: "",
    result: "Pendiente",
    collector_name: "",
    observations: "",
  };
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

function buildCountList(items, getValue, limit = 6) {
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

function getResultBadgeClass(result) {
  if (result === "No negativo") {
    return "bg-red-100 text-red-800 ring-red-200";
  }

  if (result === "Inválido") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }

  if (result === "Pendiente") {
    return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  }

  return "bg-emerald-100 text-emerald-800 ring-emerald-200";
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

function ReportList({ title, items, danger = false }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5">
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

export default function AntidopingModule({ session, userRole }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(createInitialForm());
  const [reportMonth, setReportMonth] = useState(getCurrentMonthKey());

  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    result: "Todos",
    area: "Todas",
    employeeNumber: "",
    searchText: "",
  });

  const canRegister = ["admin", "medico", "enfermeria"].includes(userRole);
  const canDelete = userRole === "admin";

  useEffect(() => {
    loadTests();
  }, []);

  const uniqueAreas = useMemo(() => {
    const areas = tests
      .map((item) => item.area)
      .filter(Boolean)
      .map((area) => area.trim())
      .filter(Boolean);

    return ["Todas", ...Array.from(new Set(areas)).sort()];
  }, [tests]);

  const monthOptions = useMemo(() => {
    const months = tests
      .map((item) => getMonthKey(item.test_date))
      .filter(Boolean);

    return Array.from(new Set([getCurrentMonthKey(), ...months]))
      .filter(Boolean)
      .sort()
      .reverse();
  }, [tests]);

  const filteredTests = useMemo(() => {
    return tests.filter((test) => {
      const testDate = test.test_date || "";

      if (filters.startDate && testDate < filters.startDate) return false;
      if (filters.endDate && testDate > filters.endDate) return false;

      if (filters.result !== "Todos" && test.result !== filters.result) {
        return false;
      }

      if (filters.area !== "Todas" && test.area !== filters.area) {
        return false;
      }

      if (
        filters.employeeNumber.trim() &&
        !String(test.employee_number || "")
          .toLowerCase()
          .includes(filters.employeeNumber.trim().toLowerCase())
      ) {
        return false;
      }

      if (filters.searchText.trim()) {
        const searchBase = [
          test.employee_name,
          test.employee_number,
          test.area,
          test.reason,
          test.test_type,
          test.sample_type,
          test.sample_code,
          test.lot_number,
          test.result,
          test.collector_name,
          test.observations,
          test.created_by_email,
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
  }, [tests, filters]);

  const monthlyTests = useMemo(() => {
    return tests.filter((test) => getMonthKey(test.test_date) === reportMonth);
  }, [tests, reportMonth]);

  const kpis = useMemo(() => {
    return {
      total: filteredTests.length,
      negative: filteredTests.filter((item) => item.result === "Negativo")
        .length,
      nonNegative: filteredTests.filter(
        (item) => item.result === "No negativo"
      ).length,
      invalid: filteredTests.filter((item) => item.result === "Inválido")
        .length,
      pending: filteredTests.filter((item) => item.result === "Pendiente")
        .length,
    };
  }, [filteredTests]);

  const monthlyReport = useMemo(() => {
    return {
      total: monthlyTests.length,
      resultDistribution: resultOptions.map((result) => ({
        label: result,
        count: monthlyTests.filter((item) => item.result === result).length,
      })),
      byReason: buildCountList(monthlyTests, (item) => item.reason),
      byArea: buildCountList(monthlyTests, (item) => item.area),
      byTestType: buildCountList(monthlyTests, (item) => item.test_type),
      byCollector: buildCountList(monthlyTests, (item) => item.collector_name),
      byCapturer: buildCountList(monthlyTests, (item) => item.created_by_email),
    };
  }, [monthlyTests]);

  async function loadTests() {
    setLoading(true);

    const { data, error } = await supabase
      .from("antidoping_tests")
      .select("*")
      .order("test_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert("Error cargando pruebas antidoping: " + error.message);
    } else {
      setTests(data || []);
    }

    setLoading(false);
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
      result: "Todos",
      area: "Todas",
      employeeNumber: "",
      searchText: "",
    });
  }

  async function saveTest(event) {
    event.preventDefault();

    if (!canRegister) {
      alert("Tu rol no permite registrar pruebas antidoping.");
      return;
    }

    if (!form.employee_name.trim()) {
      alert("Captura el nombre del colaborador.");
      return;
    }

    if (!form.employee_number.trim()) {
      alert("Captura el número de empleado.");
      return;
    }

    const payload = {
      test_date: form.test_date,
      employee_name: form.employee_name.trim(),
      employee_number: form.employee_number.trim(),
      area: form.area.trim() || null,
      reason: form.reason,
      test_type: form.test_type,
      sample_type: form.sample_type,
      sample_code: form.sample_code.trim() || null,
      lot_number: form.lot_number.trim() || null,
      result: form.result,
      collector_name: form.collector_name.trim() || null,
      observations: form.observations.trim() || null,
      created_by_user_id: session?.user?.id || null,
      created_by_email: session?.user?.email || "Sin correo",
    };

    const { data, error } = await supabase
      .from("antidoping_tests")
      .insert(payload)
      .select()
      .single();

    if (error) {
      alert("No se pudo guardar la prueba antidoping: " + error.message);
      return;
    }

    setTests((current) => [data, ...current]);
    setForm(createInitialForm());
  }

  async function deleteTest(id) {
    if (!canDelete) {
      alert("Solo el rol admin puede eliminar registros.");
      return;
    }

    if (!confirm("¿Eliminar esta prueba antidoping?")) return;

    const { error } = await supabase
      .from("antidoping_tests")
      .delete()
      .eq("id", id);

    if (error) {
      alert("No se pudo eliminar la prueba: " + error.message);
      return;
    }

    setTests((current) => current.filter((item) => item.id !== id));
  }

  function exportFilteredToCsv() {
    if (filteredTests.length === 0) {
      alert("No hay registros filtrados para exportar.");
      return;
    }

    const headers = [
      "Fecha",
      "Colaborador",
      "Numero de empleado",
      "Area",
      "Motivo",
      "Tipo de prueba",
      "Tipo de muestra",
      "Codigo de muestra",
      "Lote/Folio",
      "Resultado",
      "Responsable de toma",
      "Capturo",
      "Observaciones",
    ];

    const rows = filteredTests.map((test) => [
      test.test_date,
      test.employee_name,
      test.employee_number,
      test.area || "",
      test.reason,
      test.test_type,
      test.sample_type,
      test.sample_code || "",
      test.lot_number || "",
      test.result,
      test.collector_name || "",
      test.created_by_email || "",
      test.observations || "",
    ]);

    downloadCsv(
      `reporte-antidoping-sos-${getTodayForFileName()}.csv`,
      headers,
      rows
    );
  }

  function exportMonthlyReportToCsv() {
    if (monthlyTests.length === 0) {
      alert("No hay pruebas en el mes seleccionado para exportar.");
      return;
    }

    const summaryHeaders = ["Indicador", "Valor"];

    const summaryRows = [
      ["Mes", getMonthLabel(reportMonth)],
      ["Total de pruebas", monthlyReport.total],
      [
        "Negativas",
        monthlyTests.filter((item) => item.result === "Negativo").length,
      ],
      [
        "No negativas",
        monthlyTests.filter((item) => item.result === "No negativo").length,
      ],
      [
        "Invalidas",
        monthlyTests.filter((item) => item.result === "Inválido").length,
      ],
      [
        "Pendientes",
        monthlyTests.filter((item) => item.result === "Pendiente").length,
      ],
    ];

    const resultRows = monthlyReport.resultDistribution.map((item) => [
      `Resultado: ${item.label}`,
      item.count,
    ]);

    const reasonRows = monthlyReport.byReason.map((item) => [
      `Motivo: ${item.label}`,
      item.count,
    ]);

    const areaRows = monthlyReport.byArea.map((item) => [
      `Area: ${item.label}`,
      item.count,
    ]);

    const testTypeRows = monthlyReport.byTestType.map((item) => [
      `Tipo de prueba: ${item.label}`,
      item.count,
    ]);

    const collectorRows = monthlyReport.byCollector.map((item) => [
      `Responsable de toma: ${item.label}`,
      item.count,
    ]);

    const capturerRows = monthlyReport.byCapturer.map((item) => [
      `Capturista: ${item.label}`,
      item.count,
    ]);

    const detailHeaders = [
      "Fecha",
      "Colaborador",
      "Numero de empleado",
      "Area",
      "Motivo",
      "Tipo de prueba",
      "Tipo de muestra",
      "Codigo de muestra",
      "Lote/Folio",
      "Resultado",
      "Responsable de toma",
      "Capturo",
      "Observaciones",
    ];

    const detailRows = monthlyTests.map((test) => [
      test.test_date,
      test.employee_name,
      test.employee_number,
      test.area || "",
      test.reason,
      test.test_type,
      test.sample_type,
      test.sample_code || "",
      test.lot_number || "",
      test.result,
      test.collector_name || "",
      test.created_by_email || "",
      test.observations || "",
    ]);

    const rows = [
      ...summaryRows,
      [""],
      ...resultRows,
      [""],
      ...reasonRows,
      [""],
      ...areaRows,
      [""],
      ...testTypeRows,
      [""],
      ...collectorRows,
      [""],
      ...capturerRows,
      [""],
      detailHeaders,
      ...detailRows,
    ];

    downloadCsv(
      `reporte-mensual-antidoping-sos-${reportMonth}.csv`,
      summaryHeaders,
      rows
    );
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {loading && (
        <div className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
          Cargando pruebas antidoping...
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <KpiCard
          label="Pruebas"
          value={kpis.total}
          helper="Registros filtrados"
          tone="dark"
        />
        <KpiCard label="Negativas" value={kpis.negative} helper="Normal" />
        <KpiCard
          label="No negativas"
          value={kpis.nonNegative}
          helper="Requiere protocolo"
          tone={kpis.nonNegative > 0 ? "red" : "neutral"}
        />
        <KpiCard
          label="Inválidas"
          value={kpis.invalid}
          helper="Requiere repetición"
          tone={kpis.invalid > 0 ? "amber" : "neutral"}
        />
        <KpiCard
          label="Pendientes"
          value={kpis.pending}
          helper="Sin cierre"
        />
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Control toxicológico
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Registro de prueba antidoping
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Registro independiente para pruebas, resultado y trazabilidad.
            </p>
          </div>

          <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-white">
            Rol: {userRole || "cargando"}
          </span>
        </div>

        {canRegister ? (
          <form
            onSubmit={saveTest}
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              type="date"
              value={form.test_date}
              onChange={(event) => updateField("test_date", event.target.value)}
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Nombre del colaborador"
              value={form.employee_name}
              onChange={(event) =>
                updateField("employee_name", event.target.value)
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
              placeholder="Área"
              value={form.area}
              onChange={(event) => updateField("area", event.target.value)}
            />

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.reason}
              onChange={(event) => updateField("reason", event.target.value)}
            >
              {reasonOptions.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.test_type}
              onChange={(event) => updateField("test_type", event.target.value)}
            >
              {testTypeOptions.map((testType) => (
                <option key={testType} value={testType}>
                  {testType}
                </option>
              ))}
            </select>

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.sample_type}
              onChange={(event) =>
                updateField("sample_type", event.target.value)
              }
            >
              {sampleTypeOptions.map((sampleType) => (
                <option key={sampleType} value={sampleType}>
                  {sampleType}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Código de muestra"
              value={form.sample_code}
              onChange={(event) =>
                updateField("sample_code", event.target.value)
              }
            />

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              placeholder="Lote / folio de prueba"
              value={form.lot_number}
              onChange={(event) =>
                updateField("lot_number", event.target.value)
              }
            />

            <select
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4"
              value={form.result}
              onChange={(event) => updateField("result", event.target.value)}
            >
              {resultOptions.map((result) => (
                <option key={result} value={result}>
                  {result}
                </option>
              ))}
            </select>

            <input
              className="rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-2"
              placeholder="Responsable de toma"
              value={form.collector_name}
              onChange={(event) =>
                updateField("collector_name", event.target.value)
              }
            />

            <textarea
              className="min-h-28 rounded-2xl border border-zinc-300 bg-white px-4 py-3 outline-none ring-red-700/20 focus:ring-4 md:col-span-3"
              placeholder="Observaciones / cadena de custodia / incidencias"
              value={form.observations}
              onChange={(event) =>
                updateField("observations", event.target.value)
              }
            />

            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 md:col-span-3">
              Esta prueba se guardará como capturada por:{" "}
              <strong>{session?.user?.email || "usuario actual"}</strong>
            </div>

            <button className="rounded-2xl bg-red-700 px-5 py-4 font-black text-white shadow-sm hover:bg-red-800 md:col-span-3">
              Guardar prueba antidoping
            </button>
          </form>
        ) : (
          <EmptyState text="Tu rol actual no permite registrar pruebas antidoping." />
        )}
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Historial exclusivo
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Pruebas antidoping
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Registros filtrados: {filteredTests.length}
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
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
            value={filters.result}
            onChange={(event) => updateFilter("result", event.target.value)}
          >
            <option value="Todos">Todos los resultados</option>
            {resultOptions.map((result) => (
              <option key={result} value={result}>
                {result}
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
            placeholder="Buscar"
            value={filters.searchText}
            onChange={(event) => updateFilter("searchText", event.target.value)}
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead>
              <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                <th className="p-3">Fecha</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3">Empleado</th>
                <th className="p-3">Área</th>
                <th className="p-3">Motivo</th>
                <th className="p-3">Prueba</th>
                <th className="p-3">Muestra</th>
                <th className="p-3">Código</th>
                <th className="p-3">Lote/Folio</th>
                <th className="p-3">Resultado</th>
                <th className="p-3">Responsable</th>
                <th className="p-3">Capturó</th>
                <th className="p-3">Observaciones</th>
                {canDelete && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>

            <tbody>
              {filteredTests.map((test) => (
                <tr
                  key={test.id}
                  className="border-b align-top hover:bg-zinc-50"
                >
                  <td className="p-3">{test.test_date}</td>
                  <td className="p-3 font-bold">{test.employee_name}</td>
                  <td className="p-3">{test.employee_number}</td>
                  <td className="p-3">{test.area || "-"}</td>
                  <td className="p-3">{test.reason}</td>
                  <td className="p-3">{test.test_type}</td>
                  <td className="p-3">{test.sample_type}</td>
                  <td className="p-3">{test.sample_code || "-"}</td>
                  <td className="p-3">{test.lot_number || "-"}</td>

                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ring-1 ${getResultBadgeClass(
                        test.result
                      )}`}
                    >
                      {test.result}
                    </span>
                  </td>

                  <td className="p-3">{test.collector_name || "-"}</td>

                  <td className="p-3">
                    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">
                      {test.created_by_email || "Sin registro"}
                    </span>
                  </td>

                  <td className="p-3">{test.observations || "-"}</td>

                  {canDelete && (
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => deleteTest(test.id)}
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

          {filteredTests.length === 0 && (
            <div className="mt-4">
              <EmptyState text="No hay pruebas antidoping con los filtros actuales." />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-700">
              Reporte toxicológico
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight">
              Reporte mensual antidoping
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {getMonthLabel(reportMonth)} · {monthlyReport.total} pruebas
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
              Exportar reporte
            </button>

            <button
              type="button"
              onClick={printReport}
              className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
          <KpiCard label="Total" value={monthlyReport.total} tone="dark" />
          <KpiCard
            label="Negativas"
            value={
              monthlyTests.filter((item) => item.result === "Negativo").length
            }
          />
          <KpiCard
            label="No negativas"
            value={
              monthlyTests.filter((item) => item.result === "No negativo")
                .length
            }
            tone={
              monthlyTests.filter((item) => item.result === "No negativo")
                .length > 0
                ? "red"
                : "neutral"
            }
          />
          <KpiCard
            label="Inválidas"
            value={
              monthlyTests.filter((item) => item.result === "Inválido").length
            }
            tone={
              monthlyTests.filter((item) => item.result === "Inválido").length >
              0
                ? "amber"
                : "neutral"
            }
          />
          <KpiCard
            label="Pendientes"
            value={
              monthlyTests.filter((item) => item.result === "Pendiente").length
            }
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <ReportList
            title="Distribución por resultado"
            items={monthlyReport.resultDistribution}
            danger
          />
          <ReportList title="Motivos de prueba" items={monthlyReport.byReason} />
          <ReportList title="Áreas evaluadas" items={monthlyReport.byArea} />
          <ReportList title="Tipo de prueba" items={monthlyReport.byTestType} />
          <ReportList
            title="Responsables de toma"
            items={monthlyReport.byCollector}
          />
          <ReportList title="Capturistas" items={monthlyReport.byCapturer} />
        </div>
      </section>
    </div>
  );
}