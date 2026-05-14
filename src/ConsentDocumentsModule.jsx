import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "2-digit",
    });
  } catch {
    return value;
  }
}

function getCompanyName(companies, companyId, exam) {
  return (
    exam?.companies?.name ||
    companies.find((company) => company.id === companyId)?.name ||
    "-"
  );
}

function getPlantName(plants, plantId, exam) {
  return (
    exam?.company_plants?.name ||
    plants.find((plant) => plant.id === plantId)?.name ||
    "-"
  );
}

function getProfileLabel(exam) {
  return (
    exam?.occupational_history?.selected_profile_labels ||
    Object.entries(exam?.occupational_history?.job_profiles || {})
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key.replaceAll("_", " "))
      .join(", ") ||
    "-"
  );
}

function getAntidoping(exam) {
  return exam?.complementary_tests?.antidoping || {};
}

function getConsent(exam) {
  return exam?.complementary_tests?.consent_privacy || {};
}

function box(label, value, full = false) {
  return [
    `<div class="box ${full ? "full" : ""}">`,
    `<div class="label">${escapeHtml(label)}</div>`,
    `<div class="value">${escapeHtml(value || "-")}</div>`,
    "</div>",
  ].join("");
}

function signature(title, subtitle) {
  return [
    '<div class="signature">',
    `<strong>${escapeHtml(title)}</strong>`,
    `<span>${escapeHtml(subtitle || "Nombre y firma")}</span>`,
    "</div>",
  ].join("");
}

function buildConsentPacketHtml(exam, companies, plants) {
  const companyName = getCompanyName(companies, exam.company_id, exam);
  const plantName = getPlantName(plants, exam.plant_id, exam);
  const profileLabel = getProfileLabel(exam);
  const antidoping = getAntidoping(exam);
  const consent = getConsent(exam);

  const commonHeader = [
    '<section class="header">',
    '<div class="brand">SOS — Soluciones Operativas Sierra Madre</div>',
    "<h1>Paquete de consentimientos informados</h1>",
    '<div class="subtitle">Formatos físicos asociados al expediente clínico ocupacional digital. Listos para firma autógrafa.</div>',
    "</section>",
  ].join("");

  const candidateGrid = [
    '<section class="grid">',
    box("Aspirante", exam.candidate_name),
    box("Identificador", exam.candidate_identifier),
    box("Empresa", companyName),
    box("Planta", plantName),
    box("Puesto evaluado", exam.job_position),
    box("Área / turno", [exam.area, exam.probable_shift].filter(Boolean).join(" / ")),
    box("Fecha de valoración", formatDate(exam.exam_date)),
    box("Médico dictaminador", exam.physician_name),
    box("Cédula profesional", exam.physician_license),
    box("Perfil ocupacional evaluado", profileLabel, true),
    "</section>",
  ].join("");

  const footer = [
    '<div class="footer">',
    "Este formato forma parte del expediente clínico ocupacional digital interno de SOS. ",
    "La historia clínica completa, antecedentes, exploración física y demás datos sensibles permanecen bajo resguardo médico. ",
    '<div class="hash">',
    "<strong>Hash de expediente:</strong><br />",
    escapeHtml(exam.signature_hash || "Pendiente de cierre digital / no disponible en esta impresión"),
    "</div>",
    "</div>",
  ].join("");

  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8" />',
    `<title>Consentimientos informados - ${escapeHtml(exam.candidate_name || "Aspirante")}</title>`,
    "<style>",
    "* { box-sizing: border-box; }",
    "body { margin: 0; padding: 28px; font-family: Arial, Helvetica, sans-serif; color: #18181b; background: #ffffff; }",
    ".page { max-width: 900px; min-height: 1200px; margin: 0 auto; border: 1px solid #d4d4d8; padding: 32px; page-break-after: always; }",
    ".page:last-child { page-break-after: auto; }",
    ".header { border-bottom: 4px solid #991b1b; padding-bottom: 15px; margin-bottom: 20px; }",
    ".brand { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #991b1b; font-weight: 900; }",
    "h1 { margin: 8px 0 0; font-size: 24px; line-height: 1.15; color: #09090b; }",
    "h2 { margin: 20px 0 8px; font-size: 14px; color: #7f1d1d; text-transform: uppercase; letter-spacing: 0.12em; }",
    ".subtitle { margin-top: 8px; color: #52525b; font-size: 12px; line-height: 1.45; }",
    ".grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 9px; margin: 14px 0; }",
    ".box { border: 1px solid #e4e4e7; border-radius: 9px; padding: 9px; background: #fafafa; min-height: 54px; }",
    ".full { grid-column: 1 / -1; }",
    ".label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; font-weight: 900; margin-bottom: 4px; }",
    ".value { font-size: 12px; font-weight: 800; white-space: pre-wrap; }",
    ".paragraph { font-size: 12.5px; line-height: 1.55; text-align: justify; margin: 8px 0; }",
    ".checklist { margin: 10px 0 0; padding: 0; list-style: none; font-size: 12.5px; line-height: 1.5; }",
    ".checklist li { margin-bottom: 6px; }",
    ".check { display: inline-block; width: 13px; height: 13px; border: 1px solid #18181b; margin-right: 8px; vertical-align: -2px; }",
    ".notice { margin-top: 14px; border: 1px solid #fde68a; background: #fffbeb; color: #78350f; border-radius: 9px; padding: 11px; font-size: 11.5px; line-height: 1.45; font-weight: 700; }",
    ".signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 42px; }",
    ".signature { border-top: 1px solid #18181b; min-height: 72px; padding-top: 8px; font-size: 11.5px; text-align: center; }",
    ".signature strong { display: block; font-size: 12.5px; margin-bottom: 4px; }",
    ".signature span { color: #52525b; }",
    ".footer { margin-top: 22px; border-top: 1px solid #e4e4e7; padding-top: 11px; font-size: 9.5px; color: #52525b; line-height: 1.45; }",
    ".hash { margin-top: 10px; padding: 9px; border-radius: 8px; background: #f4f4f5; font-family: 'Courier New', monospace; font-size: 8.5px; word-break: break-all; color: #3f3f46; }",
    "@media print { body { padding: 0; } .page { border: none; max-width: none; min-height: auto; } }",
    "</style>",
    "</head>",
    "<body>",

    '<main class="page">',
    commonHeader,
    "<h2>1. Consentimiento informado para valoración médica ocupacional de ingreso</h2>",
    candidateGrid,
    '<p class="paragraph">Manifiesto que he sido informado(a) de que la valoración médica ocupacional de ingreso tiene como finalidad evaluar mi compatibilidad médico-funcional con el puesto solicitado, mediante interrogatorio clínico, toma de signos vitales, exploración física, pruebas funcionales y revisión de estudios complementarios aplicables conforme al perfil ocupacional del puesto.</p>',
    '<p class="paragraph">Reconozco que esta valoración no sustituye la atención médica integral de mi médico tratante, no constituye tratamiento médico de enfermedades preexistentes y se limita a fines de salud ocupacional, prevención de riesgos, integración documental y emisión del dictamen médico ocupacional correspondiente.</p>',
    '<ul class="checklist">',
    '<li><span class="check"></span>Autorizo la realización de la valoración médica ocupacional de ingreso.</li>',
    '<li><span class="check"></span>Autorizo la toma de signos vitales, interrogatorio médico, exploración física y maniobras funcionales necesarias según el puesto evaluado.</li>',
    '<li><span class="check"></span>Entiendo que puedo comunicar molestias, antecedentes o limitaciones relevantes durante la valoración.</li>',
    '<li><span class="check"></span>Entiendo que el dictamen podrá indicar aptitud, recomendaciones, restricciones o necesidad de valoración complementaria.</li>',
    "</ul>",
    '<div class="notice">El dictamen que se entregue a RH/EHS será una versión resumida y operativa, sin revelar el expediente clínico completo ni antecedentes sensibles no necesarios.</div>',
    '<section class="signature-grid">',
    signature("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
    signature("Firma de quien informa y recaba", consent.informed_by || "Nombre y firma"),
    "</section>",
    '<section class="signature-grid">',
    signature("Médico dictaminador", `${exam.physician_name || "Nombre"} · Cédula: ${exam.physician_license || "__________"}`),
    signature("Testigo / RH / EHS", "Nombre y firma"),
    "</section>",
    footer,
    "</main>",

    '<main class="page">',
    commonHeader,
    "<h2>2. Consentimiento informado específico para antidoping de ingreso</h2>",
    candidateGrid,
    '<section class="grid">',
    box("Antidoping realizado", antidoping.performed),
    box("Fecha de toma", formatDate(antidoping.test_date)),
    box("Folio SOS", antidoping.folio),
    box("Tipo de prueba", antidoping.test_type),
    box("Muestra", antidoping.sample_type),
    box("Lote de prueba", antidoping.lot_number),
    box("Resultado registrado", antidoping.result),
    box("Observaciones", antidoping.observations, true),
    "</section>",
    '<p class="paragraph">Manifiesto que he sido informado(a) de que el antidoping forma parte del proceso general de ingreso y tiene finalidad preventiva, ocupacional y de seguridad industrial. Autorizo la toma y análisis de muestra para prueba toxicológica conforme al procedimiento interno aplicable.</p>',
    '<p class="paragraph">Entiendo que un resultado de tamizaje no negativo, inválido o pendiente puede requerir confirmación, repetición, valoración complementaria o revisión por el personal médico responsable antes de emitir un dictamen definitivo.</p>',
    '<ul class="checklist">',
    '<li><span class="check"></span>Autorizo la realización de antidoping como requisito del proceso de ingreso.</li>',
    '<li><span class="check"></span>Declaro haber sido informado(a) sobre el tipo de muestra y el procedimiento general de toma.</li>',
    '<li><span class="check"></span>Entiendo que el resultado será tratado como información sensible de salud ocupacional.</li>',
    '<li><span class="check"></span>Entiendo que el resultado se integrará al expediente clínico ocupacional digital bajo resguardo médico.</li>',
    "</ul>",
    '<div class="notice">Este consentimiento corresponde específicamente al antidoping de ingreso. La comunicación a RH/EHS deberá limitarse al dictamen ocupacional o estatus operativo necesario, evitando revelar información sensible no indispensable.</div>',
    '<section class="signature-grid">',
    signature("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
    signature("Firma de quien toma / informa", consent.informed_by || "Nombre y firma"),
    "</section>",
    '<section class="signature-grid">',
    signature("Médico responsable", `${exam.physician_name || "Nombre"} · Cédula: ${exam.physician_license || "__________"}`),
    signature("Testigo / RH / EHS", "Nombre y firma"),
    "</section>",
    footer,
    "</main>",

    '<main class="page">',
    commonHeader,
    "<h2>3. Aviso de privacidad, confidencialidad y datos personales sensibles</h2>",
    candidateGrid,
    '<section class="grid">',
    box("Aviso de privacidad entregado", consent.privacy_notice_delivered),
    box("Medio de entrega", consent.privacy_notice_medium),
    box("Consentimiento valoración médica", consent.medical_evaluation_consent),
    box("Consentimiento antidoping", consent.antidoping_consent),
    box("Consentimiento datos sensibles", consent.sensitive_data_consent),
    box("Fecha/hora de aceptación", consent.accepted_at),
    box("Informó y recabó", consent.informed_by),
    box("Evidencia de aceptación", consent.signature_status),
    box("Observaciones", consent.observations, true),
    "</section>",
    '<p class="paragraph">Reconozco que he sido informado(a) de que durante la valoración médica ocupacional se recabarán y tratarán datos personales sensibles relacionados con mi estado de salud, antecedentes, signos vitales, exploración física, pruebas funcionales y estudios complementarios aplicables.</p>',
    '<p class="paragraph">Autorizo que dichos datos sean utilizados exclusivamente para fines de salud ocupacional, prevención de riesgos laborales, integración y resguardo de expediente clínico, emisión de dictamen médico ocupacional, seguimiento interno autorizado y cumplimiento de obligaciones legales, contractuales o administrativas aplicables.</p>',
    '<p class="paragraph">Entiendo que el expediente clínico completo permanecerá bajo resguardo médico y que a RH/EHS se le podrá entregar únicamente un dictamen resumido con aptitud, restricciones o recomendaciones laborales estrictamente necesarias para la operación.</p>',
    '<ul class="checklist">',
    '<li><span class="check"></span>Confirmo haber recibido o tenido a disposición el aviso de privacidad.</li>',
    '<li><span class="check"></span>Autorizo el tratamiento de mis datos personales sensibles relacionados con salud.</li>',
    '<li><span class="check"></span>Autorizo el resguardo del expediente clínico ocupacional en sistema digital interno.</li>',
    '<li><span class="check"></span>Entiendo la separación entre expediente clínico completo y dictamen RH/EHS.</li>',
    "</ul>",
    '<div class="notice">El acceso al expediente clínico completo se limita a personal clínico autorizado y a los supuestos legalmente aplicables. El dictamen operativo para empresa no debe contener historia clínica completa ni datos sensibles innecesarios.</div>',
    '<section class="signature-grid">',
    signature("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
    signature("Firma de quien informa y recaba", consent.informed_by || "Nombre y firma"),
    "</section>",
    '<section class="signature-grid">',
    signature("Médico dictaminador", `${exam.physician_name || "Nombre"} · Cédula: ${exam.physician_license || "__________"}`),
    signature("Testigo / RH / EHS", "Nombre y firma"),
    "</section>",
    footer,
    "</main>",

    "</body>",
    "</html>",
  ].join("");
}

function printConsentPacket(exam, companies, plants) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildConsentPacketHtml(exam, companies, plants));
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}

function getFitnessBadgeClass(value) {
  if (value === "Apto para el puesto") return "bg-emerald-100 text-emerald-800";
  if (value === "Apto con recomendaciones") return "bg-blue-100 text-blue-800";
  if (value === "Apto con restricciones") return "bg-amber-100 text-amber-800";
  if (value === "Requiere valoración complementaria") return "bg-purple-100 text-purple-800";
  if (value === "No apto temporal" || value === "No apto para el puesto evaluado") {
    return "bg-red-100 text-red-800";
  }
  return "bg-zinc-100 text-zinc-700";
}

function getStatusBadgeClass(value) {
  if (value === "Cerrado") return "bg-emerald-100 text-emerald-800";
  if (value === "Cancelado") return "bg-red-100 text-red-800";
  if (value === "Corregido") return "bg-purple-100 text-purple-800";
  return "bg-zinc-100 text-zinc-700";
}

export default function ConsentDocumentsModule({
  companies = [],
  plants = [],
}) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const filteredExams = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return exams;

    return exams.filter((exam) => {
      const antidoping = getAntidoping(exam);

      const haystack = [
        exam.candidate_name,
        exam.candidate_identifier,
        exam.job_position,
        exam.area,
        exam.fitness_result,
        exam.status,
        getCompanyName(companies, exam.company_id, exam),
        getPlantName(plants, exam.plant_id, exam),
        getProfileLabel(exam),
        antidoping.result,
        antidoping.folio,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [exams, search, companies, plants]);

  useEffect(() => {
    loadExams();
  }, []);

  async function loadExams() {
    setLoading(true);

    const { data, error } = await supabase
      .from("preemployment_medical_exams")
      .select("*, companies:company_id(name), company_plants:plant_id(name)")
      .is("deleted_at", null)
      .order("exam_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      alert("No se pudieron cargar exámenes para consentimientos: " + error.message);
      setLoading(false);
      return;
    }

    setExams(data || []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Consentimientos
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              Paquete de consentimientos informados
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Genera formatos físicos listos para firma del aspirante, personal que informa,
              médico dictaminador y testigo/RH/EHS.
            </p>
          </div>

          <button
            type="button"
            onClick={loadExams}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Recargar
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Este paquete genera tres hojas: consentimiento para valoración médica
          ocupacional, consentimiento específico para antidoping y consentimiento/aviso
          de privacidad para datos personales sensibles.
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-black text-zinc-950">
              Exámenes disponibles
            </h3>
            <p className="mt-1 text-sm text-zinc-500">
              Selecciona un examen y genera el paquete de consentimientos.
            </p>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar aspirante, empresa, puesto, folio antidoping..."
            className="w-full rounded-2xl border border-zinc-300 px-4 py-3 text-sm outline-none ring-red-700/20 focus:ring-4 md:w-96"
          />
        </div>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            Cargando exámenes...
          </div>
        ) : filteredExams.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center text-sm text-zinc-500">
            No hay exámenes disponibles.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-sm">
              <thead>
                <tr className="border-b bg-zinc-950 text-left text-xs uppercase tracking-wide text-white">
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Aspirante</th>
                  <th className="p-3">Empresa</th>
                  <th className="p-3">Planta</th>
                  <th className="p-3">Puesto</th>
                  <th className="p-3">Perfil</th>
                  <th className="p-3">Antidoping</th>
                  <th className="p-3">Dictamen</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acción</th>
                </tr>
              </thead>

              <tbody>
                {filteredExams.map((exam) => {
                  const antidoping = getAntidoping(exam);

                  return (
                    <tr key={exam.id} className="border-b hover:bg-zinc-50">
                      <td className="p-3">{exam.exam_date}</td>
                      <td className="p-3 font-bold">{exam.candidate_name}</td>
                      <td className="p-3">
                        {getCompanyName(companies, exam.company_id, exam)}
                      </td>
                      <td className="p-3">
                        {getPlantName(plants, exam.plant_id, exam)}
                      </td>
                      <td className="p-3">{exam.job_position || "-"}</td>
                      <td className="p-3">{getProfileLabel(exam)}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold">
                            {antidoping.result || "-"}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {antidoping.folio || "Sin folio"}
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${getFitnessBadgeClass(
                            exam.fitness_result
                          )}`}
                        >
                          {exam.fitness_result || "Pendiente"}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${getStatusBadgeClass(
                            exam.status || "Borrador"
                          )}`}
                        >
                          {exam.status || "Borrador"}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => printConsentPacket(exam, companies, plants)}
                          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
                        >
                          Imprimir consentimientos
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}