const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "PreemploymentMedicalExamModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\PreemploymentMedicalExamModule.jsx");
  console.error("Ejecuta este script dentro de C:\\Users\\raul_\\Desktop\\dashboard-medico-sos");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `PreemploymentMedicalExamModule_backup_before_consent_print_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

function applyRegex(regex, replacement, label) {
  if (!regex.test(content)) {
    console.error("");
    console.error("No pude aplicar:", label);
    console.error("Respaldo creado en:", backupPath);
    process.exit(1);
  }

  content = content.replace(regex, replacement);
  changes += 1;
  console.log("Aplicado:", label);
}

function replaceOptional(search, replacement, label) {
  if (!content.includes(search)) {
    console.warn("No encontré bloque opcional:", label);
    return;
  }

  content = content.replace(search, replacement);
  changes += 1;
  console.log("Aplicado:", label);
}

const physicalConsentFunctions = String.raw`
function buildPhysicalConsentHtml(exam, companies, plants) {
  const consent = exam?.complementary_tests?.consent_privacy || {};
  const antidoping = exam?.complementary_tests?.antidoping || {};
  const companyName = getExamCompanyName(exam, companies);
  const plantName = getExamPlantName(exam, plants);
  const profileKeys = selectedProfileKeysFromExam(exam);
  const profileLabel = getSelectedProfileLabels(profileKeys);

  return \`
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Consentimiento informado - \${escapeHtml(exam.candidate_name)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 36px;
      font-family: Arial, Helvetica, sans-serif;
      color: #18181b;
      background: #ffffff;
    }
    .page {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid #d4d4d8;
      padding: 34px;
    }
    .header {
      border-bottom: 4px solid #991b1b;
      padding-bottom: 16px;
      margin-bottom: 22px;
    }
    .brand {
      font-size: 12px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #991b1b;
      font-weight: 900;
    }
    h1 {
      margin: 8px 0 0;
      font-size: 25px;
      line-height: 1.15;
      color: #09090b;
    }
    h2 {
      margin: 22px 0 8px;
      font-size: 15px;
      color: #7f1d1d;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }
    .subtitle {
      margin-top: 8px;
      color: #52525b;
      font-size: 13px;
      line-height: 1.45;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 16px 0;
    }
    .box {
      border: 1px solid #e4e4e7;
      border-radius: 10px;
      padding: 10px;
      background: #fafafa;
      min-height: 58px;
    }
    .full {
      grid-column: 1 / -1;
    }
    .label {
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: #71717a;
      font-weight: 900;
      margin-bottom: 5px;
    }
    .value {
      font-size: 13px;
      font-weight: 800;
      white-space: pre-wrap;
    }
    .paragraph {
      font-size: 13px;
      line-height: 1.55;
      text-align: justify;
      margin: 8px 0;
    }
    .checklist {
      margin: 10px 0 0;
      padding: 0;
      list-style: none;
      font-size: 13px;
      line-height: 1.55;
    }
    .checklist li {
      margin-bottom: 6px;
    }
    .check {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 1px solid #18181b;
      margin-right: 8px;
      vertical-align: -2px;
    }
    .notice {
      margin-top: 16px;
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #78350f;
      border-radius: 10px;
      padding: 12px;
      font-size: 12px;
      line-height: 1.45;
      font-weight: 700;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 46px;
    }
    .signature {
      border-top: 1px solid #18181b;
      min-height: 78px;
      padding-top: 8px;
      font-size: 12px;
      text-align: center;
    }
    .signature strong {
      display: block;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .small {
      font-size: 10px;
      color: #52525b;
      line-height: 1.4;
    }
    .footer {
      margin-top: 24px;
      border-top: 1px solid #e4e4e7;
      padding-top: 12px;
      font-size: 10px;
      color: #52525b;
      line-height: 1.45;
    }
    .hash {
      margin-top: 10px;
      padding: 10px;
      border-radius: 8px;
      background: #f4f4f5;
      font-family: "Courier New", monospace;
      font-size: 9px;
      word-break: break-all;
    }
    @media print {
      body { padding: 0; }
      .page { border: none; max-width: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div class="brand">SOS — Soluciones Operativas Sierra Madre</div>
      <h1>Consentimiento informado para valoración médica ocupacional de ingreso</h1>
      <div class="subtitle">
        Formato para firma física del aspirante. Este documento respalda la valoración médica ocupacional,
        el antidoping obligatorio de ingreso y el tratamiento de datos personales sensibles relacionados con salud.
      </div>
    </section>

    <section class="grid">
      <div class="box">
        <div class="label">Aspirante</div>
        <div class="value">\${escapeHtml(exam.candidate_name || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Identificador</div>
        <div class="value">\${escapeHtml(exam.candidate_identifier || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Empresa</div>
        <div class="value">\${escapeHtml(companyName)}</div>
      </div>

      <div class="box">
        <div class="label">Planta</div>
        <div class="value">\${escapeHtml(plantName)}</div>
      </div>

      <div class="box">
        <div class="label">Puesto evaluado</div>
        <div class="value">\${escapeHtml(exam.job_position || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Fecha de valoración</div>
        <div class="value">\${escapeHtml(formatDate(exam.exam_date))}</div>
      </div>

      <div class="box full">
        <div class="label">Perfil ocupacional evaluado</div>
        <div class="value">\${escapeHtml(profileLabel)}</div>
      </div>
    </section>

    <h2>Declaración del aspirante</h2>

    <p class="paragraph">
      Manifiesto que he sido informado(a) de que la valoración médica ocupacional de ingreso tiene como finalidad
      identificar mi compatibilidad médico-funcional con el puesto evaluado, documentar antecedentes relevantes,
      signos vitales, exploración física, pruebas funcionales y estudios complementarios que resulten aplicables
      conforme al perfil ocupacional del puesto.
    </p>

    <p class="paragraph">
      Reconozco que esta valoración no sustituye la atención médica integral de mi médico tratante ni constituye
      tratamiento médico de enfermedades preexistentes. La información obtenida será utilizada para fines de salud
      ocupacional, prevención de riesgos, integración documental y emisión del dictamen médico ocupacional correspondiente.
    </p>

    <h2>Autorizaciones</h2>

    <ul class="checklist">
      <li><span class="check"></span>Autorizo la realización de la valoración médica ocupacional de ingreso.</li>
      <li><span class="check"></span>Autorizo la realización de antidoping como requisito general del proceso de ingreso.</li>
      <li><span class="check"></span>Autorizo el tratamiento de mis datos personales sensibles relacionados con salud para fines médico-ocupacionales.</li>
      <li><span class="check"></span>Reconozco haber recibido o tenido a disposición el aviso de privacidad correspondiente.</li>
      <li><span class="check"></span>Autorizo que se emita a RH/EHS únicamente un dictamen resumido de aptitud, restricciones o recomendaciones laborales, sin revelar mi expediente clínico completo.</li>
    </ul>

    <h2>Registro de consentimiento en sistema</h2>

    <section class="grid">
      <div class="box">
        <div class="label">Aviso de privacidad entregado</div>
        <div class="value">\${escapeHtml(consent.privacy_notice_delivered || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Medio de entrega</div>
        <div class="value">\${escapeHtml(consent.privacy_notice_medium || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Consentimiento valoración médica</div>
        <div class="value">\${escapeHtml(consent.medical_evaluation_consent || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Consentimiento antidoping</div>
        <div class="value">\${escapeHtml(consent.antidoping_consent || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Consentimiento datos sensibles</div>
        <div class="value">\${escapeHtml(consent.sensitive_data_consent || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Fecha/hora de aceptación</div>
        <div class="value">\${escapeHtml(consent.accepted_at || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Informó y recabó</div>
        <div class="value">\${escapeHtml(consent.informed_by || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Evidencia de aceptación</div>
        <div class="value">\${escapeHtml(consent.signature_status || "-")}</div>
      </div>

      <div class="box full">
        <div class="label">Observaciones</div>
        <div class="value">\${escapeHtml(consent.observations || "-")}</div>
      </div>
    </section>

    <h2>Antidoping de ingreso</h2>

    <section class="grid">
      <div class="box">
        <div class="label">Realizado</div>
        <div class="value">\${escapeHtml(antidoping.performed || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Fecha de toma</div>
        <div class="value">\${escapeHtml(formatDate(antidoping.test_date))}</div>
      </div>

      <div class="box">
        <div class="label">Folio SOS</div>
        <div class="value">\${escapeHtml(antidoping.folio || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Resultado</div>
        <div class="value">\${escapeHtml(antidoping.result || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Tipo de prueba</div>
        <div class="value">\${escapeHtml(antidoping.test_type || "-")}</div>
      </div>

      <div class="box">
        <div class="label">Lote</div>
        <div class="value">\${escapeHtml(antidoping.lot_number || "-")}</div>
      </div>
    </section>

    <div class="notice">
      La firma física de este formato acredita que el aspirante fue informado y otorgó consentimiento
      para la valoración médica ocupacional, antidoping y tratamiento de datos sensibles conforme al proceso interno.
      El expediente clínico completo permanece bajo resguardo médico.
    </div>

    <section class="signature-grid">
      <div class="signature">
        <strong>Firma del aspirante</strong>
        Nombre: \${escapeHtml(exam.candidate_name || "____________________________")}<br />
        Fecha: ____________________________
      </div>

      <div class="signature">
        <strong>Firma de quien informa y recaba</strong>
        Nombre: \${escapeHtml(consent.informed_by || "____________________________")}<br />
        Fecha: ____________________________
      </div>
    </section>

    <section class="signature-grid">
      <div class="signature">
        <strong>Testigo / RH / EHS</strong>
        Nombre y firma
      </div>

      <div class="signature">
        <strong>Médico dictaminador</strong>
        \${escapeHtml(exam.physician_name || "____________________________")}<br />
        Cédula: \${escapeHtml(exam.physician_license || "________________")}
      </div>
    </section>

    <div class="footer">
      Este formato corresponde al consentimiento físico asociado al expediente clínico ocupacional digital.
      La información clínica completa, antecedentes, exploración y resultados se resguardan en el sistema interno
      de SOS — Soluciones Operativas Sierra Madre.
      <div class="hash">
        Hash de expediente, si ya fue cerrado digitalmente:<br />
        \${escapeHtml(exam.signature_hash || "Pendiente de cierre digital / no disponible en esta impresión")}
      </div>
    </div>
  </main>
</body>
</html>
\`;
}

function printPhysicalConsentDocument(exam, companies, plants, existingWindow = null) {
  const printWindow =
    existingWindow || window.open("", "_blank", "width=900,height=1000");

  if (!printWindow) {
    alert(
      "El navegador bloqueó la ventana de impresión. Usa el botón 'Consentimiento físico' desde historial."
    );
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPhysicalConsentHtml(exam, companies, plants));
  printWindow.document.close();

  setTimeout(() => {
    printWindow.focus();
    printWindow.print();
  }, 400);
}
`;

if (!content.includes("function buildPhysicalConsentHtml")) {
  applyRegex(
    /function TextInput\(\{/,
    `${physicalConsentFunctions}\n\nfunction TextInput({`,
    "funciones de consentimiento físico imprimible"
  );
}

if (!content.includes("consentPrintWindow")) {
  applyRegex(
    /(\s*)if \(!confirmed\) return;\s*\n\s*const \{ error \} = await supabase\.rpc\("close_preemployment_exam", \{/,
    `$1if (!confirmed) return;

$1const consentPrintWindow = window.open("", "_blank", "width=900,height=1000");

$1const { error } = await supabase.rpc("close_preemployment_exam", {`,
    "abrir ventana de consentimiento al cerrar"
  );

  applyRegex(
    /(\s*)if \(error\) \{\s*\n\s*alert\("No se pudo cerrar el expediente: " \+ error\.message\);\s*\n\s*return;\s*\n\s*\}/,
    `$1if (error) {
$1  if (consentPrintWindow) consentPrintWindow.close();
$1  alert("No se pudo cerrar el expediente: " + error.message);
$1  return;
$1}`,
    "cerrar ventana si falla el cierre"
  );

  replaceOptional(
`    setSelectedExam(null);
    setCertificateExam(null);
    await loadExams();`,
`    printPhysicalConsentDocument(exam, companies, plants, consentPrintWindow);

    setSelectedExam(null);
    setCertificateExam(null);
    await loadExams();`,
    "imprimir consentimiento después del cierre"
  );
}

replaceOptional(
`                            <button
                              type="button"
                              onClick={() =>
                                printCompanyCertificate(exam, companies, plants)
                              }
                              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                            >
                              Imprimir
                            </button>`,
`                            <button
                              type="button"
                              onClick={() =>
                                printCompanyCertificate(exam, companies, plants)
                              }
                              className="rounded-xl border border-zinc-300 px-3 py-2 text-xs font-black text-zinc-700 hover:bg-zinc-50"
                            >
                              Imprimir
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                printPhysicalConsentDocument(exam, companies, plants)
                              }
                              className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-black text-amber-900 hover:bg-amber-100"
                            >
                              Consentimiento físico
                            </button>`,
  "botón consentimiento físico en historial"
);

replaceOptional(
`                  <button
                    type="button"
                    onClick={() =>
                      printCompanyCertificate(selectedExam, companies, plants)
                    }
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-white"
                  >
                    Imprimir dictamen
                  </button>`,
`                  <button
                    type="button"
                    onClick={() =>
                      printCompanyCertificate(selectedExam, companies, plants)
                    }
                    className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-white"
                  >
                    Imprimir dictamen
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      printPhysicalConsentDocument(selectedExam, companies, plants)
                    }
                    className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-black text-amber-900 hover:bg-amber-100"
                  >
                    Consentimiento físico
                  </button>`,
  "botón consentimiento físico en vista rápida"
);

fs.writeFileSync(filePath, content, "utf8");

const finalContent = fs.readFileSync(filePath, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Verificación:");
console.log(
  "buildPhysicalConsentHtml:",
  finalContent.includes("function buildPhysicalConsentHtml") ? "OK" : "NO"
);
console.log(
  "printPhysicalConsentDocument:",
  finalContent.includes("function printPhysicalConsentDocument") ? "OK" : "NO"
);
console.log(
  "consentPrintWindow:",
  finalContent.includes("consentPrintWindow") ? "OK" : "NO"
);

if (
  finalContent.includes("function buildPhysicalConsentHtml") &&
  finalContent.includes("function printPhysicalConsentDocument") &&
  finalContent.includes("consentPrintWindow")
) {
  console.log("");
  console.log("LISTO. Ahora ejecuta: npm run dev");
} else {
  console.log("");
  console.log("Algo no quedó insertado. Comparte esta salida.");
}