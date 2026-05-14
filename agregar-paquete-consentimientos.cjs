const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "PreemploymentMedicalExamModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\PreemploymentMedicalExamModule.jsx");
  console.error("Ejecuta esto dentro de C:\\Users\\raul_\\Desktop\\dashboard-medico-sos");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `PreemploymentMedicalExamModule_backup_before_consent_packet_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

function applyRegex(regex, replacement, label) {
  if (!regex.test(content)) {
    console.warn("No pude aplicar:", label);
    return false;
  }

  content = content.replace(regex, replacement);
  changes += 1;
  console.log("Aplicado:", label);
  return true;
}

function replaceAllText(search, replacement, label) {
  if (!content.includes(search)) return false;
  content = content.split(search).join(replacement);
  changes += 1;
  console.log("Aplicado:", label);
  return true;
}

/*
  Si el parche anterior alcanzó a meter referencias antiguas, las convertimos al nuevo paquete.
*/
replaceAllText(
  "printPhysicalConsentDocument",
  "printConsentPacketDocuments",
  "renombrar referencias previas a consentimiento físico"
);

replaceAllText(
  "consentPrintWindow",
  "consentPacketWindow",
  "renombrar ventana previa de consentimiento"
);

const consentPacketFunctions = `
function buildConsentPacketHtml(exam, companies, plants) {
  const consent = exam?.complementary_tests?.consent_privacy || {};
  const antidoping = exam?.complementary_tests?.antidoping || {};
  const companyName = getExamCompanyName(exam, companies);
  const plantName = getExamPlantName(exam, plants);
  const profileKeys = selectedProfileKeysFromExam(exam);
  const profileLabel = getSelectedProfileLabels(profileKeys);

  const value = (text) => escapeHtml(text || "-");

  const field = (label, text) =>
    '<div class="box">' +
      '<div class="label">' + escapeHtml(label) + '</div>' +
      '<div class="value">' + value(text) + '</div>' +
    '</div>';

  const fullField = (label, text) =>
    '<div class="box full">' +
      '<div class="label">' + escapeHtml(label) + '</div>' +
      '<div class="value">' + value(text) + '</div>' +
    '</div>';

  const signatureBlock = (title, subtitle) =>
    '<div class="signature">' +
      '<strong>' + escapeHtml(title) + '</strong>' +
      '<span>' + escapeHtml(subtitle || "Nombre y firma") + '</span>' +
    '</div>';

  const commonHeader =
    '<section class="header">' +
      '<div class="brand">SOS — Soluciones Operativas Sierra Madre</div>' +
      '<h1>Paquete de consentimientos informados</h1>' +
      '<div class="subtitle">Formatos físicos asociados al expediente clínico ocupacional digital. Listos para firma autógrafa.</div>' +
    '</section>';

  const candidateGrid =
    '<section class="grid">' +
      field("Aspirante", exam.candidate_name) +
      field("Identificador", exam.candidate_identifier) +
      field("Empresa", companyName) +
      field("Planta", plantName) +
      field("Puesto evaluado", exam.job_position) +
      field("Área / turno probable", [exam.area, exam.probable_shift].filter(Boolean).join(" / ")) +
      field("Fecha de valoración", formatDate(exam.exam_date)) +
      field("Médico dictaminador", exam.physician_name) +
      field("Cédula profesional", exam.physician_license) +
      fullField("Perfil ocupacional evaluado", profileLabel) +
    '</section>';

  const footer =
    '<div class="footer">' +
      'Este formato forma parte del expediente clínico ocupacional digital interno de SOS. ' +
      'La historia clínica completa, antecedentes, exploración física y demás datos sensibles permanecen bajo resguardo médico. ' +
      '<div class="hash"><strong>Hash de expediente:</strong><br />' +
      value(exam.signature_hash || "Pendiente de cierre digital / no disponible en esta impresión") +
      '</div>' +
    '</div>';

  return [
    '<!doctype html>',
    '<html>',
    '<head>',
    '<meta charset="utf-8" />',
    '<title>Consentimientos informados - ' + value(exam.candidate_name) + '</title>',
    '<style>',
    '* { box-sizing: border-box; }',
    'body { margin: 0; padding: 28px; font-family: Arial, Helvetica, sans-serif; color: #18181b; background: #ffffff; }',
    '.page { max-width: 900px; min-height: 1200px; margin: 0 auto; border: 1px solid #d4d4d8; padding: 32px; page-break-after: always; }',
    '.page:last-child { page-break-after: auto; }',
    '.header { border-bottom: 4px solid #991b1b; padding-bottom: 15px; margin-bottom: 20px; }',
    '.brand { font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: #991b1b; font-weight: 900; }',
    'h1 { margin: 8px 0 0; font-size: 24px; line-height: 1.15; color: #09090b; }',
    'h2 { margin: 20px 0 8px; font-size: 14px; color: #7f1d1d; text-transform: uppercase; letter-spacing: 0.12em; }',
    '.subtitle { margin-top: 8px; color: #52525b; font-size: 12px; line-height: 1.45; }',
    '.grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 9px; margin: 14px 0; }',
    '.box { border: 1px solid #e4e4e7; border-radius: 9px; padding: 9px; background: #fafafa; min-height: 54px; }',
    '.full { grid-column: 1 / -1; }',
    '.label { font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.12em; color: #71717a; font-weight: 900; margin-bottom: 4px; }',
    '.value { font-size: 12px; font-weight: 800; white-space: pre-wrap; }',
    '.paragraph { font-size: 12.5px; line-height: 1.55; text-align: justify; margin: 8px 0; }',
    '.checklist { margin: 10px 0 0; padding: 0; list-style: none; font-size: 12.5px; line-height: 1.5; }',
    '.checklist li { margin-bottom: 6px; }',
    '.check { display: inline-block; width: 13px; height: 13px; border: 1px solid #18181b; margin-right: 8px; vertical-align: -2px; }',
    '.notice { margin-top: 14px; border: 1px solid #fde68a; background: #fffbeb; color: #78350f; border-radius: 9px; padding: 11px; font-size: 11.5px; line-height: 1.45; font-weight: 700; }',
    '.signature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 42px; }',
    '.signature { border-top: 1px solid #18181b; min-height: 72px; padding-top: 8px; font-size: 11.5px; text-align: center; }',
    '.signature strong { display: block; font-size: 12.5px; margin-bottom: 4px; }',
    '.signature span { color: #52525b; }',
    '.footer { margin-top: 22px; border-top: 1px solid #e4e4e7; padding-top: 11px; font-size: 9.5px; color: #52525b; line-height: 1.45; }',
    '.hash { margin-top: 10px; padding: 9px; border-radius: 8px; background: #f4f4f5; font-family: "Courier New", monospace; font-size: 8.5px; word-break: break-all; color: #3f3f46; }',
    '@media print { body { padding: 0; } .page { border: none; max-width: none; min-height: auto; } }',
    '</style>',
    '</head>',
    '<body>',

    '<main class="page">',
      commonHeader,
      '<h2>1. Consentimiento informado para valoración médica ocupacional de ingreso</h2>',
      candidateGrid,
      '<p class="paragraph">Manifiesto que he sido informado(a) de que la valoración médica ocupacional de ingreso tiene como finalidad evaluar mi compatibilidad médico-funcional con el puesto solicitado, mediante interrogatorio clínico, toma de signos vitales, exploración física, pruebas funcionales y revisión de estudios complementarios que resulten aplicables conforme al perfil ocupacional del puesto.</p>',
      '<p class="paragraph">Reconozco que esta valoración no sustituye la atención médica integral de mi médico tratante, no constituye tratamiento médico de enfermedades preexistentes y se limita a fines de salud ocupacional, prevención de riesgos, integración documental y emisión del dictamen médico ocupacional correspondiente.</p>',
      '<ul class="checklist">',
        '<li><span class="check"></span>Autorizo la realización de la valoración médica ocupacional de ingreso.</li>',
        '<li><span class="check"></span>Autorizo la toma de signos vitales, interrogatorio médico, exploración física y maniobras funcionales necesarias según el puesto evaluado.</li>',
        '<li><span class="check"></span>Entiendo que puedo comunicar molestias, antecedentes o limitaciones relevantes durante la valoración.</li>',
        '<li><span class="check"></span>Entiendo que el dictamen podrá indicar aptitud, recomendaciones, restricciones o necesidad de valoración complementaria.</li>',
      '</ul>',
      '<div class="notice">El dictamen que se entregue a RH/EHS será una versión resumida y operativa, sin revelar el expediente clínico completo ni antecedentes sensibles no necesarios.</div>',
      '<section class="signature-grid">',
        signatureBlock("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
        signatureBlock("Firma de quien informa y recaba", consent.informed_by || "Nombre y firma"),
      '</section>',
      '<section class="signature-grid">',
        signatureBlock("Médico dictaminador", (exam.physician_name || "Nombre") + " · Cédula: " + (exam.physician_license || "__________")),
        signatureBlock("Testigo / RH / EHS", "Nombre y firma"),
      '</section>',
      footer,
    '</main>',

    '<main class="page">',
      commonHeader,
      '<h2>2. Consentimiento informado específico para antidoping de ingreso</h2>',
      candidateGrid,
      '<section class="grid">',
        field("Antidoping realizado", antidoping.performed),
        field("Fecha de toma", formatDate(antidoping.test_date)),
        field("Folio SOS", antidoping.folio),
        field("Tipo de prueba", antidoping.test_type),
        field("Muestra", antidoping.sample_type),
        field("Lote de prueba", antidoping.lot_number),
        field("Resultado registrado", antidoping.result),
        fullField("Observaciones", antidoping.observations),
      '</section>',
      '<p class="paragraph">Manifiesto que he sido informado(a) de que el antidoping forma parte del proceso general de ingreso y tiene finalidad preventiva, ocupacional y de seguridad industrial. Autorizo la toma y análisis de muestra para prueba toxicológica conforme al procedimiento interno aplicable.</p>',
      '<p class="paragraph">Entiendo que un resultado de tamizaje no negativo, inválido o pendiente puede requerir confirmación, repetición, valoración complementaria o revisión por el personal médico responsable antes de emitir un dictamen definitivo.</p>',
      '<ul class="checklist">',
        '<li><span class="check"></span>Autorizo la realización de antidoping como requisito del proceso de ingreso.</li>',
        '<li><span class="check"></span>Declaro haber sido informado(a) sobre el tipo de muestra y el procedimiento general de toma.</li>',
        '<li><span class="check"></span>Entiendo que el resultado será tratado como información sensible de salud ocupacional.</li>',
        '<li><span class="check"></span>Entiendo que el resultado se integrará al expediente clínico ocupacional digital bajo resguardo médico.</li>',
      '</ul>',
      '<div class="notice">Este consentimiento corresponde específicamente al antidoping de ingreso. La comunicación a RH/EHS deberá limitarse al dictamen ocupacional o estatus operativo necesario, evitando revelar información sensible no indispensable.</div>',
      '<section class="signature-grid">',
        signatureBlock("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
        signatureBlock("Firma de quien toma / informa", consent.informed_by || "Nombre y firma"),
      '</section>',
      '<section class="signature-grid">',
        signatureBlock("Médico responsable", (exam.physician_name || "Nombre") + " · Cédula: " + (exam.physician_license || "__________")),
        signatureBlock("Testigo / RH / EHS", "Nombre y firma"),
      '</section>',
      footer,
    '</main>',

    '<main class="page">',
      commonHeader,
      '<h2>3. Aviso de privacidad, confidencialidad y datos personales sensibles</h2>',
      candidateGrid,
      '<section class="grid">',
        field("Aviso de privacidad entregado", consent.privacy_notice_delivered),
        field("Medio de entrega", consent.privacy_notice_medium),
        field("Consentimiento valoración médica", consent.medical_evaluation_consent),
        field("Consentimiento antidoping", consent.antidoping_consent),
        field("Consentimiento datos sensibles", consent.sensitive_data_consent),
        field("Fecha/hora de aceptación", consent.accepted_at),
        field("Informó y recabó", consent.informed_by),
        field("Evidencia de aceptación", consent.signature_status),
        fullField("Observaciones", consent.observations),
      '</section>',
      '<p class="paragraph">Reconozco que he sido informado(a) de que durante la valoración médica ocupacional se recabarán y tratarán datos personales sensibles relacionados con mi estado de salud, antecedentes, signos vitales, exploración física, pruebas funcionales y estudios complementarios aplicables.</p>',
      '<p class="paragraph">Autorizo que dichos datos sean utilizados exclusivamente para fines de salud ocupacional, prevención de riesgos laborales, integración y resguardo de expediente clínico, emisión de dictamen médico ocupacional, seguimiento interno autorizado y cumplimiento de obligaciones legales, contractuales o administrativas aplicables.</p>',
      '<p class="paragraph">Entiendo que el expediente clínico completo permanecerá bajo resguardo médico y que a RH/EHS se le podrá entregar únicamente un dictamen resumido con aptitud, restricciones o recomendaciones laborales estrictamente necesarias para la operación.</p>',
      '<ul class="checklist">',
        '<li><span class="check"></span>Confirmo haber recibido o tenido a disposición el aviso de privacidad.</li>',
        '<li><span class="check"></span>Autorizo el tratamiento de mis datos personales sensibles relacionados con salud.</li>',
        '<li><span class="check"></span>Autorizo el resguardo del expediente clínico ocupacional en sistema digital interno.</li>',
        '<li><span class="check"></span>Entiendo la separación entre expediente clínico completo y dictamen RH/EHS.</li>',
      '</ul>',
      '<div class="notice">El acceso al expediente clínico completo se limita a personal clínico autorizado y a los supuestos legalmente aplicables. El dictamen operativo para empresa no debe contener historia clínica completa ni datos sensibles innecesarios.</div>',
      '<section class="signature-grid">',
        signatureBlock("Firma del aspirante", exam.candidate_name || "Nombre y firma"),
        signatureBlock("Firma de quien informa y recaba", consent.informed_by || "Nombre y firma"),
      '</section>',
      '<section class="signature-grid">',
        signatureBlock("Médico dictaminador", (exam.physician_name || "Nombre") + " · Cédula: " + (exam.physician_license || "__________")),
        signatureBlock("Testigo / RH / EHS", "Nombre y firma"),
      '</section>',
      footer,
    '</main>',

    '</body>',
    '</html>',
  ].join("");
}

function printConsentPacketDocuments(exam, companies, plants, existingWindow = null) {
  const printWindow =
    existingWindow || window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert("El navegador bloqueó la ventana de impresión. Usa el botón 'Consentimientos' desde historial.");
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
`;

if (!content.includes("function buildConsentPacketHtml")) {
  applyRegex(
    /\nfunction TextInput\(\{/,
    "\n" + consentPacketFunctions + "\n\nfunction TextInput({",
    "insertar generador de paquete de consentimientos"
  );
}

/*
  Botón visible en historial, antes de Editar/Cerrar.
*/
if (!content.includes("printConsentPacketDocuments(exam, companies, plants)")) {
  const historyButton = `                            <button
                              type="button"
                              onClick={() =>
                                printConsentPacketDocuments(exam, companies, plants)
                              }
                              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
                            >
                              Consentimientos
                            </button>

`;

  applyRegex(
    /(\s*)\{canDictaminate && exam\.status !== "Cerrado" && \(/,
    historyButton + '$1{canDictaminate && exam.status !== "Cerrado" && (',
    "insertar botón Consentimientos en historial"
  );
}

/*
  Botón visible en vista rápida.
*/
if (!content.includes("printConsentPacketDocuments(selectedExam, companies, plants)")) {
  const quickButton = `                  <button
                    type="button"
                    onClick={() =>
                      printConsentPacketDocuments(selectedExam, companies, plants)
                    }
                    className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 hover:bg-amber-100"
                  >
                    Consentimientos
                  </button>

`;

  applyRegex(
    /(\s*)<button\s+type="button"\s+onClick=\{\(\) => setSelectedExam\(null\)\}/,
    quickButton + '$1<button\n$1  type="button"\n$1  onClick={() => setSelectedExam(null)}',
    "insertar botón Consentimientos en vista rápida"
  );
}

/*
  Abrir ventana antes del await para evitar bloqueo del navegador.
*/
if (!content.includes("const consentPacketWindow = window.open")) {
  applyRegex(
    /(\s*)if \(!confirmed\) return;\s*\n\s*const \{ error \} = await supabase\.rpc\("close_preemployment_exam", \{/,
    `$1if (!confirmed) return;

$1const consentPacketWindow = window.open("", "_blank", "width=900,height=1000");

$1const { error } = await supabase.rpc("close_preemployment_exam", {`,
    "abrir ventana de consentimientos antes de cerrar"
  );
}

/*
  Cerrar ventana si falla el cierre.
*/
if (
  content.includes("const consentPacketWindow = window.open") &&
  !content.includes("if (consentPacketWindow) consentPacketWindow.close();")
) {
  applyRegex(
    /(\s*)if \(error\) \{\s*\n\s*alert\("No se pudo cerrar el expediente: " \+ error\.message\);\s*\n\s*return;\s*\n\s*\}/,
    `$1if (error) {
$1  if (consentPacketWindow) consentPacketWindow.close();
$1  alert("No se pudo cerrar el expediente: " + error.message);
$1  return;
$1}`,
    "cerrar ventana si falla cierre"
  );
}

/*
  Imprimir automáticamente después del cierre exitoso.
*/
if (
  content.includes("const consentPacketWindow = window.open") &&
  !content.includes("printConsentPacketDocuments(exam, companies, plants, consentPacketWindow)")
) {
  applyRegex(
    /(\s*)setSelectedExam\(null\);\s*\n\s*setCertificateExam\(null\);\s*\n\s*await loadExams\(\);/,
    `$1printConsentPacketDocuments(exam, companies, plants, consentPacketWindow);

$1setSelectedExam(null);
$1setCertificateExam(null);
$1await loadExams();`,
    "imprimir paquete automáticamente después de cerrar"
  );
}

fs.writeFileSync(filePath, content, "utf8");

const finalContent = fs.readFileSync(filePath, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);

console.log("");
console.log("Verificación:");
console.log(
  "buildConsentPacketHtml:",
  finalContent.includes("function buildConsentPacketHtml") ? "OK" : "NO"
);
console.log(
  "printConsentPacketDocuments:",
  finalContent.includes("function printConsentPacketDocuments") ? "OK" : "NO"
);
console.log(
  "Botón historial:",
  finalContent.includes("printConsentPacketDocuments(exam, companies, plants)") ? "OK" : "NO"
);
console.log(
  "Botón vista rápida:",
  finalContent.includes("printConsentPacketDocuments(selectedExam, companies, plants)") ? "OK" : "NO"
);
console.log(
  "Auto al cerrar:",
  finalContent.includes("printConsentPacketDocuments(exam, companies, plants, consentPacketWindow)") ? "OK" : "NO"
);

console.log("");
console.log("Ahora ejecuta: npm run dev");
