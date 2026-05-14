import React, { useMemo, useState } from "react";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function nowDatetimeLocal() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

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

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("es-MX", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
}

const initialForm = {
  date: todayIso(),
  datetime: nowDatetimeLocal(),

  company_id: "",
  plant_id: "",
  company_name: "",
  plant_name: "",

  collaborator_name: "",
  employee_number: "",
  area: "",
  job_position: "",
  phone: "",

  physician_name: "Dr. Raúl Gustavo Lucio Aguilera",
  physician_license: "12704357",
  staff_name: "",
  witness_name: "",

  reason: "Protocolo de seguridad industrial",
  observations: "",

  alcohol_device: "",
  alcohol_result: "",
  alcohol_confirmatory_note: "",

  antidoping_folio: "",
  antidoping_sample_type: "Orina",
  antidoping_panel: "5 parámetros",
  antidoping_lot: "",
  antidoping_result: "",

  medical_reason: "",
  medical_findings: "",
  medical_recommendations: "",

  referral_reason: "",
  referral_destination: "Unidad de Medicina Familiar / Hospital de adscripción",
  referral_urgency: "No urgente",
  referral_commitment: "",
};

function getCompanyName(form, companies) {
  if (form.company_name) return form.company_name;
  return companies.find((company) => company.id === form.company_id)?.name || "";
}

function getPlantName(form, plants) {
  if (form.plant_name) return form.plant_name;
  return plants.find((plant) => plant.id === form.plant_id)?.name || "";
}

function styles() {
  return `
    * { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 26px;
      font-family: Arial, Helvetica, sans-serif;
      color: #18181b;
      background: #ffffff;
    }

    .page {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid #d4d4d8;
      padding: 32px;
      min-height: 1160px;
      page-break-after: always;
    }

    .page:last-child {
      page-break-after: auto;
    }

    .header {
      border-bottom: 4px solid #991b1b;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }

    .brand {
      font-size: 11px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #991b1b;
      font-weight: 900;
    }

    h1 {
      margin: 8px 0 0;
      font-size: 24px;
      line-height: 1.15;
      color: #09090b;
    }

    h2 {
      margin: 20px 0 8px;
      font-size: 14px;
      color: #7f1d1d;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    .subtitle {
      margin-top: 8px;
      color: #52525b;
      font-size: 12px;
      line-height: 1.45;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 9px;
      margin: 14px 0;
    }

    .box {
      border: 1px solid #e4e4e7;
      border-radius: 9px;
      padding: 9px;
      background: #fafafa;
      min-height: 54px;
    }

    .full {
      grid-column: 1 / -1;
    }

    .label {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #71717a;
      font-weight: 900;
      margin-bottom: 4px;
    }

    .value {
      font-size: 12px;
      font-weight: 800;
      white-space: pre-wrap;
    }

    .paragraph {
      font-size: 12.7px;
      line-height: 1.58;
      text-align: justify;
      margin: 8px 0;
    }

    .checklist {
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
      font-size: 12.7px;
      line-height: 1.52;
    }

    .checklist li {
      margin-bottom: 7px;
    }

    .check {
      display: inline-block;
      width: 13px;
      height: 13px;
      border: 1px solid #18181b;
      margin-right: 8px;
      vertical-align: -2px;
    }

    .notice {
      margin-top: 14px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #78350f;
      border-radius: 9px;
      padding: 11px;
      font-size: 11.5px;
      line-height: 1.45;
      font-weight: 700;
    }

    .danger {
      border-color: #fecaca;
      background: #fef2f2;
      color: #7f1d1d;
    }

    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 44px;
    }

    .signature {
      border-top: 1px solid #18181b;
      min-height: 76px;
      padding-top: 8px;
      font-size: 11.5px;
      text-align: center;
    }

    .signature strong {
      display: block;
      font-size: 12.5px;
      margin-bottom: 4px;
    }

    .signature span {
      color: #52525b;
    }

    .footer {
      margin-top: 22px;
      border-top: 1px solid #e4e4e7;
      padding-top: 11px;
      font-size: 9.5px;
      color: #52525b;
      line-height: 1.45;
    }

    @media print {
      body { padding: 0; }
      .page {
        border: none;
        max-width: none;
        min-height: auto;
      }
    }
  `;
}

function box(label, value, full = false) {
  return `
    <div class="box ${full ? "full" : ""}">
      <div class="label">${escapeHtml(label)}</div>
      <div class="value">${escapeHtml(value || "-")}</div>
    </div>
  `;
}

function signature(title, subtitle) {
  return `
    <div class="signature">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(subtitle || "Nombre y firma")}</span>
    </div>
  `;
}

function header(title, subtitle) {
  return `
    <section class="header">
      <div class="brand">SOS — Soluciones Operativas Sierra Madre</div>
      <h1>${escapeHtml(title)}</h1>
      <div class="subtitle">${escapeHtml(subtitle)}</div>
    </section>
  `;
}

function collaboratorGrid(form, companies, plants) {
  const companyName = getCompanyName(form, companies);
  const plantName = getPlantName(form, plants);

  return `
    <section class="grid">
      ${box("Colaborador / aspirante", form.collaborator_name)}
      ${box("Número de empleado / identificador", form.employee_number)}
      ${box("Fecha", formatDate(form.date))}
      ${box("Empresa", companyName)}
      ${box("Planta", plantName)}
      ${box("Área", form.area)}
      ${box("Puesto", form.job_position)}
      ${box("Teléfono", form.phone)}
      ${box("Motivo", form.reason)}
      ${box("Médico responsable", form.physician_name)}
      ${box("Cédula profesional", form.physician_license)}
      ${box("Personal que informa / recaba", form.staff_name)}
    </section>
  `;
}

function footer() {
  return `
    <div class="footer">
      Documento interno de soporte operativo y médico-ocupacional. La información contenida se considera
      confidencial y deberá utilizarse exclusivamente para fines de seguridad, salud ocupacional, atención
      médica, control documental y seguimiento autorizado.
    </div>
  `;
}

function buildAlcoholConsent(form, companies, plants) {
  return `
    <main class="page">
      ${header(
        "Consentimiento informado para alcoholimetría",
        "Formato físico para autorización de prueba de alcohol en aire espirado dentro de protocolo de seguridad industrial."
      )}

      ${collaboratorGrid(form, companies, plants)}

      <h2>Declaración y consentimiento</h2>

      <p class="paragraph">
        Manifiesto que he sido informado(a) de que la alcoholimetría forma parte de los protocolos
        de seguridad industrial, prevención de riesgos y control de ingreso o permanencia segura dentro
        de las instalaciones. Entiendo que la prueba se realiza mediante equipo de medición en aire espirado,
        conforme al procedimiento interno aplicable.
      </p>

      <p class="paragraph">
        Autorizo de manera libre y voluntaria la realización de la prueba de alcoholimetría. Reconozco que
        el resultado podrá ser valorado por personal médico autorizado, considerando datos clínicos,
        signos observables, condiciones de seguridad y, cuando aplique, pruebas confirmatorias o repetición
        del procedimiento.
      </p>

      <ul class="checklist">
        <li><span class="check"></span>Autorizo la realización de alcoholimetría por aire espirado.</li>
        <li><span class="check"></span>Fui informado(a) del motivo de la prueba y su relación con seguridad industrial.</li>
        <li><span class="check"></span>Entiendo que el resultado será tratado como información confidencial de salud ocupacional.</li>
        <li><span class="check"></span>Entiendo que un resultado fuera de parámetros podrá requerir valoración clínica o prueba confirmatoria.</li>
        <li><span class="check"></span>Entiendo que la negativa a realizar la prueba podrá documentarse conforme al protocolo interno de la empresa.</li>
      </ul>

      <h2>Registro de prueba</h2>

      <section class="grid">
        ${box("Fecha y hora", formatDateTime(form.datetime))}
        ${box("Equipo / dispositivo", form.alcohol_device)}
        ${box("Resultado registrado", form.alcohol_result)}
        ${box("Nota confirmatoria / clínica", form.alcohol_confirmatory_note, true)}
        ${box("Observaciones", form.observations, true)}
      </section>

      <div class="notice">
        Este formato no sustituye el criterio médico ni los procedimientos internos de seguridad. La comunicación
        a RH/EHS deberá limitarse al estatus operativo necesario, evitando revelar información sensible no indispensable.
      </div>

      <section class="signature-grid">
        ${signature("Firma del colaborador / aspirante", form.collaborator_name || "Nombre y firma")}
        ${signature("Firma de quien informa y recaba", form.staff_name || "Nombre y firma")}
      </section>

      <section class="signature-grid">
        ${signature("Médico responsable", `${form.physician_name || "Nombre"} · Cédula: ${form.physician_license || "__________"}`)}
        ${signature("Testigo / RH / EHS", form.witness_name || "Nombre y firma")}
      </section>

      ${footer()}
    </main>
  `;
}

function buildAntidopingConsent(form, companies, plants) {
  return `
    <main class="page">
      ${header(
        "Consentimiento informado para antidoping",
        "Formato físico para autorización de prueba toxicológica ocupacional."
      )}

      ${collaboratorGrid(form, companies, plants)}

      <h2>Declaración y consentimiento</h2>

      <p class="paragraph">
        Manifiesto que he sido informado(a) de que la prueba de antidoping tiene finalidad preventiva,
        ocupacional y de seguridad industrial. Entiendo que puede formar parte de procesos de ingreso,
        permanencia, investigación de incidentes, retorno seguro, programa aleatorio o protocolo interno
        autorizado por la empresa.
      </p>

      <p class="paragraph">
        Autorizo la toma y análisis de la muestra indicada para prueba toxicológica. Entiendo que el resultado
        de tamizaje podrá ser negativo, no negativo, inválido o pendiente, y que un resultado no negativo o
        inválido puede requerir confirmación, repetición, cadena de custodia, valoración médica o revisión
        complementaria antes de emitir una conclusión definitiva.
      </p>

      <ul class="checklist">
        <li><span class="check"></span>Autorizo la realización de prueba antidoping.</li>
        <li><span class="check"></span>Fui informado(a) del tipo de muestra, finalidad y alcance general del procedimiento.</li>
        <li><span class="check"></span>Entiendo que el resultado será tratado como dato sensible de salud ocupacional.</li>
        <li><span class="check"></span>Entiendo que el resultado se integrará al expediente o registro médico-ocupacional correspondiente.</li>
        <li><span class="check"></span>Entiendo que la negativa a realizar la prueba podrá documentarse conforme al protocolo interno.</li>
      </ul>

      <h2>Registro de prueba</h2>

      <section class="grid">
        ${box("Fecha y hora", formatDateTime(form.datetime))}
        ${box("Folio", form.antidoping_folio)}
        ${box("Tipo de muestra", form.antidoping_sample_type)}
        ${box("Panel / parámetros", form.antidoping_panel)}
        ${box("Lote de prueba", form.antidoping_lot)}
        ${box("Resultado registrado", form.antidoping_result)}
        ${box("Observaciones", form.observations, true)}
      </section>

      <div class="notice">
        Para fines de comunicación operativa, se recomienda utilizar lenguaje de tamizaje como “negativo”,
        “no negativo”, “inválido” o “pendiente”, evitando etiquetar como positivo definitivo sin confirmación
        cuando el procedimiento así lo requiera.
      </div>

      <section class="signature-grid">
        ${signature("Firma del colaborador / aspirante", form.collaborator_name || "Nombre y firma")}
        ${signature("Firma de quien informa y recaba", form.staff_name || "Nombre y firma")}
      </section>

      <section class="signature-grid">
        ${signature("Médico responsable", `${form.physician_name || "Nombre"} · Cédula: ${form.physician_license || "__________"}`)}
        ${signature("Testigo / RH / EHS", form.witness_name || "Nombre y firma")}
      </section>

      ${footer()}
    </main>
  `;
}

function buildMedicalReviewConsent(form, companies, plants) {
  return `
    <main class="page">
      ${header(
        "Consentimiento informado para revisión médica en consultorio",
        "Formato físico para autorización de atención, valoración clínica básica y registro médico ocupacional."
      )}

      ${collaboratorGrid(form, companies, plants)}

      <h2>Declaración y consentimiento</h2>

      <p class="paragraph">
        Manifiesto que solicito o acepto recibir atención médica en consultorio de servicio médico ocupacional.
        He sido informado(a) de que la revisión puede incluir interrogatorio dirigido, toma de signos vitales,
        exploración física básica, orientación médica inicial, primeros auxilios, registro de síntomas y emisión
        de recomendaciones de seguimiento.
      </p>

      <p class="paragraph">
        Entiendo que esta valoración corresponde a una atención médica inicial u ocupacional y no sustituye
        atención hospitalaria, consulta especializada, estudios complementarios externos ni seguimiento por mi
        unidad médica familiar, institución de seguridad social, médico tratante u hospital cuando así se indique.
      </p>

      <ul class="checklist">
        <li><span class="check"></span>Autorizo la revisión médica en consultorio.</li>
        <li><span class="check"></span>Autorizo la toma de signos vitales e interrogatorio clínico dirigido.</li>
        <li><span class="check"></span>Autorizo la exploración física básica necesaria para el motivo de atención.</li>
        <li><span class="check"></span>Entiendo que puedo rechazar maniobras específicas y que dicha negativa podrá documentarse.</li>
        <li><span class="check"></span>Entiendo que, si se identifica un dato de alarma, podré ser referido a UMF, hospital o servicio de urgencias.</li>
      </ul>

      <h2>Registro de atención</h2>

      <section class="grid">
        ${box("Fecha y hora", formatDateTime(form.datetime))}
        ${box("Motivo de consulta", form.medical_reason, true)}
        ${box("Hallazgos relevantes", form.medical_findings, true)}
        ${box("Recomendaciones", form.medical_recommendations, true)}
        ${box("Observaciones", form.observations, true)}
      </section>

      <div class="notice">
        La información clínica completa debe permanecer bajo resguardo médico. A RH/EHS solo deberá comunicarse
        el estatus operativo estrictamente necesario para la seguridad del colaborador y de la operación.
      </div>

      <section class="signature-grid">
        ${signature("Firma del colaborador / aspirante", form.collaborator_name || "Nombre y firma")}
        ${signature("Firma de quien informa y recaba", form.staff_name || "Nombre y firma")}
      </section>

      <section class="signature-grid">
        ${signature("Médico responsable", `${form.physician_name || "Nombre"} · Cédula: ${form.physician_license || "__________"}`)}
        ${signature("Testigo / RH / EHS", form.witness_name || "Nombre y firma")}
      </section>

      ${footer()}
    </main>
  `;
}

function buildReferralCommitment(form, companies, plants) {
  return `
    <main class="page">
      ${header(
        "Carta compromiso y consentimiento de referencia médica",
        "Formato físico para documentar referencia a Unidad de Medicina Familiar, hospital o servicio médico externo bajo responsabilidad del colaborador."
      )}

      ${collaboratorGrid(form, companies, plants)}

      <h2>Motivo de referencia</h2>

      <section class="grid">
        ${box("Fecha y hora", formatDateTime(form.datetime))}
        ${box("Destino sugerido", form.referral_destination)}
        ${box("Prioridad", form.referral_urgency)}
        ${box("Motivo clínico / hallazgo", form.referral_reason, true)}
        ${box("Compromiso / instrucciones", form.referral_commitment, true)}
        ${box("Observaciones", form.observations, true)}
      </section>

      <h2>Declaración del colaborador</h2>

      <p class="paragraph">
        Manifiesto que he sido informado(a) por el personal médico de servicio ocupacional sobre la necesidad
        o conveniencia de acudir a valoración médica externa, Unidad de Medicina Familiar, hospital, servicio de
        urgencias o médico tratante, debido a los hallazgos, síntomas, antecedentes o condiciones descritas en
        este formato.
      </p>

      <p class="paragraph">
        Entiendo que el servicio médico ocupacional realiza una valoración inicial y que la atención definitiva,
        estudios complementarios, diagnóstico integral, tratamiento, incapacidad, seguimiento o manejo especializado
        corresponden a mi institución de salud, médico tratante, hospital o servicio externo correspondiente.
      </p>

      <p class="paragraph">
        Me comprometo a acudir a la unidad médica indicada o sugerida y a atender las recomendaciones recibidas.
        En caso de decidir no acudir, diferir la atención, abandonar el seguimiento, rechazar traslado o no informar
        evolución clínica, reconozco que dicha decisión queda bajo mi responsabilidad personal, sin perjuicio de las
        medidas de seguridad o restricciones operativas que la empresa pueda determinar para proteger mi salud y la
        seguridad de terceros.
      </p>

      <ul class="checklist">
        <li><span class="check"></span>Recibí explicación del motivo por el que se recomienda valoración externa.</li>
        <li><span class="check"></span>Entiendo los posibles riesgos de no acudir o diferir la atención médica recomendada.</li>
        <li><span class="check"></span>Me comprometo a acudir a UMF, hospital, urgencias o médico tratante según corresponda.</li>
        <li><span class="check"></span>Entiendo que debo informar evolución, indicaciones, restricciones o incapacidad cuando aplique.</li>
        <li><span class="check"></span>Entiendo que esta carta no sustituye nota médica externa, incapacidad ni alta médica institucional.</li>
      </ul>

      <div class="notice danger">
        Si existen datos de alarma, deterioro clínico, dolor torácico, dificultad respiratoria, alteración neurológica,
        trauma, sangrado, pérdida del estado de alerta, crisis hipertensiva, hipoglucemia, intoxicación, dolor intenso
        u otra condición potencialmente urgente, se deberá priorizar atención hospitalaria o servicio de urgencias.
      </div>

      <section class="signature-grid">
        ${signature("Firma del colaborador", form.collaborator_name || "Nombre y firma")}
        ${signature("Firma de quien informa y recaba", form.staff_name || "Nombre y firma")}
      </section>

      <section class="signature-grid">
        ${signature("Médico responsable", `${form.physician_name || "Nombre"} · Cédula: ${form.physician_license || "__________"}`)}
        ${signature("Testigo / RH / EHS", form.witness_name || "Nombre y firma")}
      </section>

      ${footer()}
    </main>
  `;
}

function buildDocument(type, form, companies, plants) {
  const pages = {
    alcohol: buildAlcoholConsent(form, companies, plants),
    antidoping: buildAntidopingConsent(form, companies, plants),
    medical: buildMedicalReviewConsent(form, companies, plants),
    referral: buildReferralCommitment(form, companies, plants),
    all: [
      buildAlcoholConsent(form, companies, plants),
      buildAntidopingConsent(form, companies, plants),
      buildMedicalReviewConsent(form, companies, plants),
      buildReferralCommitment(form, companies, plants),
    ].join(""),
  };

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Formatos de consentimiento - ${escapeHtml(form.collaborator_name || "Colaborador")}</title>
        <style>${styles()}</style>
      </head>
      <body>
        ${pages[type] || pages.all}
      </body>
    </html>
  `;
}

function printDocument(type, form, companies, plants) {
  const printWindow = window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildDocument(type, form, companies, plants));
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 350);
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
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
  placeholder = "",
  rows = 3,
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
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
          const valueOption = typeof option === "string" ? option : option.value;
          const labelOption = typeof option === "string" ? option : option.label;

          return (
            <option key={valueOption} value={valueOption}>
              {labelOption}
            </option>
          );
        })}
      </select>
    </label>
  );
}

export default function ConsentFormsModule({
  companies = [],
  plants = [],
}) {
  const [form, setForm] = useState(initialForm);

  const filteredPlants = useMemo(() => {
    if (!form.company_id) return plants;
    return plants.filter((plant) => plant.company_id === form.company_id);
  }, [plants, form.company_id]);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function selectCompany(companyId) {
    const company = companies.find((item) => item.id === companyId);

    setForm((current) => ({
      ...current,
      company_id: companyId,
      company_name: company?.name || "",
      plant_id: "",
      plant_name: "",
    }));
  }

  function selectPlant(plantId) {
    const plant = plants.find((item) => item.id === plantId);

    setForm((current) => ({
      ...current,
      plant_id: plantId,
      plant_name: plant?.name || "",
    }));
  }

  function clearForm() {
    const confirmed = window.confirm("¿Limpiar todos los campos del formulario?");

    if (!confirmed) return;

    setForm({
      ...initialForm,
      date: todayIso(),
      datetime: nowDatetimeLocal(),
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Formatos imprimibles
        </p>

        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">
              Consentimientos y cartas médicas
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-zinc-500">
              Genera formatos físicos listos para impresión y firma del colaborador,
              personal clínico, médico responsable y testigo/RH/EHS.
            </p>
          </div>

          <button
            type="button"
            onClick={clearForm}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Limpiar formulario
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Primero llena los datos generales. Después imprime el formato específico:
          alcoholimetría, antidoping, revisión médica, referencia médica o todos juntos.
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-zinc-950">
          Datos generales del colaborador
        </h3>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <TextInput
            label="Fecha"
            type="date"
            value={form.date}
            onChange={(value) => updateField("date", value)}
          />

          <TextInput
            label="Fecha y hora del evento"
            type="datetime-local"
            value={form.datetime}
            onChange={(value) => updateField("datetime", value)}
          />

          <TextInput
            label="Motivo"
            value={form.reason}
            onChange={(value) => updateField("reason", value)}
          />

          {companies.length > 0 ? (
            <SelectInput
              label="Empresa"
              value={form.company_id}
              onChange={selectCompany}
              options={[
                { value: "", label: "Seleccionar empresa" },
                ...companies.map((company) => ({
                  value: company.id,
                  label: company.name,
                })),
              ]}
            />
          ) : (
            <TextInput
              label="Empresa"
              value={form.company_name}
              onChange={(value) => updateField("company_name", value)}
            />
          )}

          {plants.length > 0 ? (
            <SelectInput
              label="Planta"
              value={form.plant_id}
              onChange={selectPlant}
              options={[
                { value: "", label: "Seleccionar planta" },
                ...filteredPlants.map((plant) => ({
                  value: plant.id,
                  label: plant.name,
                })),
              ]}
            />
          ) : (
            <TextInput
              label="Planta"
              value={form.plant_name}
              onChange={(value) => updateField("plant_name", value)}
            />
          )}

          <TextInput
            label="Colaborador / aspirante"
            value={form.collaborator_name}
            onChange={(value) => updateField("collaborator_name", value)}
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
          />

          <TextInput
            label="Puesto"
            value={form.job_position}
            onChange={(value) => updateField("job_position", value)}
          />

          <TextInput
            label="Teléfono"
            value={form.phone}
            onChange={(value) => updateField("phone", value)}
          />

          <TextInput
            label="Personal que informa / recaba"
            value={form.staff_name}
            onChange={(value) => updateField("staff_name", value)}
          />

          <TextInput
            label="Testigo / RH / EHS"
            value={form.witness_name}
            onChange={(value) => updateField("witness_name", value)}
          />

          <TextInput
            label="Médico responsable"
            value={form.physician_name}
            onChange={(value) => updateField("physician_name", value)}
          />

          <TextInput
            label="Cédula profesional"
            value={form.physician_license}
            onChange={(value) => updateField("physician_license", value)}
          />

          <div className="md:col-span-3">
            <TextAreaInput
              label="Observaciones generales"
              value={form.observations}
              onChange={(value) => updateField("observations", value)}
              rows={3}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-zinc-950">
          Datos específicos por formato
        </h3>

        <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 p-5">
            <p className="text-sm font-black text-zinc-950">
              Alcoholimetría
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                label="Equipo / dispositivo"
                value={form.alcohol_device}
                onChange={(value) => updateField("alcohol_device", value)}
              />

              <TextInput
                label="Resultado registrado"
                value={form.alcohol_result}
                onChange={(value) => updateField("alcohol_result", value)}
                placeholder="Ej. 0.000 / 0.009 / Pendiente"
              />

              <div className="md:col-span-2">
                <TextAreaInput
                  label="Nota confirmatoria / clínica"
                  value={form.alcohol_confirmatory_note}
                  onChange={(value) => updateField("alcohol_confirmatory_note", value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 p-5">
            <p className="text-sm font-black text-zinc-950">
              Antidoping
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <TextInput
                label="Folio antidoping"
                value={form.antidoping_folio}
                onChange={(value) => updateField("antidoping_folio", value)}
              />

              <TextInput
                label="Tipo de muestra"
                value={form.antidoping_sample_type}
                onChange={(value) => updateField("antidoping_sample_type", value)}
              />

              <TextInput
                label="Panel / parámetros"
                value={form.antidoping_panel}
                onChange={(value) => updateField("antidoping_panel", value)}
              />

              <TextInput
                label="Lote de prueba"
                value={form.antidoping_lot}
                onChange={(value) => updateField("antidoping_lot", value)}
              />

              <TextInput
                label="Resultado"
                value={form.antidoping_result}
                onChange={(value) => updateField("antidoping_result", value)}
                placeholder="Negativo / No negativo / Inválido / Pendiente"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 p-5">
            <p className="text-sm font-black text-zinc-950">
              Revisión médica en consultorio
            </p>

            <div className="mt-4 space-y-4">
              <TextAreaInput
                label="Motivo de consulta"
                value={form.medical_reason}
                onChange={(value) => updateField("medical_reason", value)}
                rows={3}
              />

              <TextAreaInput
                label="Hallazgos relevantes"
                value={form.medical_findings}
                onChange={(value) => updateField("medical_findings", value)}
                rows={3}
              />

              <TextAreaInput
                label="Recomendaciones"
                value={form.medical_recommendations}
                onChange={(value) => updateField("medical_recommendations", value)}
                rows={3}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 p-5">
            <p className="text-sm font-black text-zinc-950">
              Referencia médica / carta compromiso
            </p>

            <div className="mt-4 space-y-4">
              <TextInput
                label="Destino sugerido"
                value={form.referral_destination}
                onChange={(value) => updateField("referral_destination", value)}
              />

              <SelectInput
                label="Prioridad"
                value={form.referral_urgency}
                onChange={(value) => updateField("referral_urgency", value)}
                options={[
                  "No urgente",
                  "Prioritario",
                  "Urgente",
                  "Traslado inmediato recomendado",
                ]}
              />

              <TextAreaInput
                label="Motivo clínico / hallazgo"
                value={form.referral_reason}
                onChange={(value) => updateField("referral_reason", value)}
                rows={3}
              />

              <TextAreaInput
                label="Compromiso / instrucciones"
                value={form.referral_commitment}
                onChange={(value) => updateField("referral_commitment", value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-zinc-950">
          Imprimir formatos
        </h3>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-5">
          <button
            type="button"
            onClick={() => printDocument("alcohol", form, companies, plants)}
            className="rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3 text-sm font-black text-blue-900 hover:bg-blue-100"
          >
            Alcoholimetría
          </button>

          <button
            type="button"
            onClick={() => printDocument("antidoping", form, companies, plants)}
            className="rounded-2xl border border-purple-300 bg-purple-50 px-4 py-3 text-sm font-black text-purple-900 hover:bg-purple-100"
          >
            Antidoping
          </button>

          <button
            type="button"
            onClick={() => printDocument("medical", form, companies, plants)}
            className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-black text-emerald-900 hover:bg-emerald-100"
          >
            Revisión médica
          </button>

          <button
            type="button"
            onClick={() => printDocument("referral", form, companies, plants)}
            className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-black text-red-900 hover:bg-red-100"
          >
            Referencia / compromiso
          </button>

          <button
            type="button"
            onClick={() => printDocument("all", form, companies, plants)}
            className="rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white hover:bg-black"
          >
            Imprimir todos
          </button>
        </div>
      </section>
    </div>
  );
}
