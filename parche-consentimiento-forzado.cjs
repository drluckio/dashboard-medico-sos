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
  `PreemploymentMedicalExamModule_backup_before_consent_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

if (content.includes("consent_privacy") && content.includes("Consentimiento informado y privacidad")) {
  console.log("El módulo ya contiene consentimiento y privacidad.");
  console.log("Si no lo ves en la app, detén Vite con Ctrl+C y vuelve a ejecutar npm run dev.");
  process.exit(0);
}

let changes = 0;

function applyRegex(regex, replacement, label) {
  if (!regex.test(content)) {
    console.error("");
    console.error("No pude aplicar el bloque:", label);
    console.error("El archivo puede tener una estructura diferente a la esperada.");
    console.error("Respaldo creado en:", backupPath);
    process.exit(1);
  }

  content = content.replace(regex, replacement);
  changes += 1;
  console.log("Aplicado:", label);
}

/*
  1. Agrega consentimiento al estado inicial, después de antidoping.
*/
if (!content.includes("consent_privacy: {")) {
  applyRegex(
    /(antidoping:\s*\{[\s\S]*?observations:\s*"",\s*\},)(\s*\n\s*key_history:\s*\{)/,
    `$1

    consent_privacy: {
      privacy_notice_delivered: "",
      privacy_notice_medium: "",
      medical_evaluation_consent: "",
      antidoping_consent: "",
      sensitive_data_consent: "",
      accepted_at: "",
      informed_by: "",
      signature_status: "",
      observations: "",
    },$2`,
    "estado inicial consent_privacy"
  );
}

/*
  2. Recupera consentimiento cuando se edita un expediente existente.
*/
if (!content.includes("...(complementary.consent_privacy || {})")) {
  applyRegex(
    /(antidoping:\s*\{\s*\.\.\.initial\.antidoping,\s*\.\.\.\(complementary\.antidoping\s*\|\|\s*\{\}\),\s*\},)(\s*\n\s*key_history:\s*\{)/,
    `$1

    consent_privacy: {
      ...initial.consent_privacy,
      ...(complementary.consent_privacy || {}),
    },$2`,
    "lectura consent_privacy desde complementary_tests"
  );
}

/*
  3. Agrega validaciones de consentimiento al análisis/candado de cierre.
*/
if (!content.includes("Falta confirmar entrega de aviso de privacidad")) {
  applyRegex(
    /(\s*)if\s*\(form\.antidoping\.performed\s*!==\s*"Realizado"\)\s*\{/,
    `$1if (form.consent_privacy.privacy_notice_delivered !== "Sí") {
$1  blockers.push("Falta confirmar entrega de aviso de privacidad.");
$1}

$1if (!form.consent_privacy.privacy_notice_medium) {
$1  blockers.push("Falta medio de entrega del aviso de privacidad.");
$1}

$1if (form.consent_privacy.medical_evaluation_consent !== "Sí") {
$1  blockers.push("Falta consentimiento para valoración médica ocupacional.");
$1}

$1if (form.consent_privacy.antidoping_consent !== "Sí") {
$1  blockers.push("Falta consentimiento específico para antidoping.");
$1}

$1if (form.consent_privacy.sensitive_data_consent !== "Sí") {
$1  blockers.push("Falta consentimiento para tratamiento de datos personales sensibles.");
$1}

$1if (!form.consent_privacy.accepted_at) {
$1  blockers.push("Falta fecha y hora de aceptación del consentimiento.");
$1}

$1if (fieldIsEmpty(form.consent_privacy.informed_by)) {
$1  blockers.push("Falta registrar quién informó y recabó consentimiento.");
$1}

$1if (
$1  !["Recabada física", "Recabada digital simple"].includes(
$1    form.consent_privacy.signature_status
$1  )
$1) {
$1  blockers.push("Falta evidencia de firma o aceptación del consentimiento.");
$1}

$1if (form.antidoping.performed !== "Realizado") {`,
    "validaciones de consentimiento"
  );
}

/*
  4. Guarda consentimiento dentro de complementary_tests.
*/
if (!content.includes("consent_privacy: form.consent_privacy")) {
  applyRegex(
    /complementary_tests:\s*\{\s*antidoping:\s*form\.antidoping,\s*\},/,
    `complementary_tests: {
        antidoping: form.antidoping,
        consent_privacy: form.consent_privacy,
      },`,
    "payload complementary_tests consent_privacy"
  );
}

/*
  5. Inserta la sección visual antes de Antidoping de ingreso.
*/
if (!content.includes("Consentimiento informado y privacidad")) {
  applyRegex(
    /(\s*)<Section\s+eyebrow="Obligatorio"\s+title="Antidoping de ingreso"/,
    `$1<Section
$1  eyebrow="Cumplimiento"
$1  title="Consentimiento informado y privacidad"
$1  helper="Bloque obligatorio para cierre del expediente. Permite documentar aviso de privacidad, consentimiento médico, antidoping y tratamiento de datos sensibles."
$1>
$1  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
$1    <SelectInput
$1      label="Aviso de privacidad entregado"
$1      value={form.consent_privacy.privacy_notice_delivered}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "privacy_notice_delivered", value)
$1      }
$1      options={["", "Sí", "No", "Pendiente"]}
$1    />

$1    <SelectInput
$1      label="Medio de entrega"
$1      value={form.consent_privacy.privacy_notice_medium}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "privacy_notice_medium", value)
$1      }
$1      options={[
$1        "",
$1        "Físico",
$1        "Digital",
$1        "Físico y digital",
$1        "Verbal con respaldo pendiente",
$1      ]}
$1    />

$1    <SelectInput
$1      label="Consentimiento valoración médica"
$1      value={form.consent_privacy.medical_evaluation_consent}
$1      onChange={(value) =>
$1        updateNested(
$1          "consent_privacy",
$1          "medical_evaluation_consent",
$1          value
$1        )
$1      }
$1      options={["", "Sí", "No", "Pendiente"]}
$1    />

$1    <SelectInput
$1      label="Consentimiento antidoping"
$1      value={form.consent_privacy.antidoping_consent}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "antidoping_consent", value)
$1      }
$1      options={["", "Sí", "No", "Pendiente"]}
$1    />

$1    <SelectInput
$1      label="Consentimiento datos sensibles"
$1      value={form.consent_privacy.sensitive_data_consent}
$1      onChange={(value) =>
$1        updateNested(
$1          "consent_privacy",
$1          "sensitive_data_consent",
$1          value
$1        )
$1      }
$1      options={["", "Sí", "No", "Pendiente"]}
$1    />

$1    <TextInput
$1      label="Fecha y hora de aceptación"
$1      type="datetime-local"
$1      value={form.consent_privacy.accepted_at}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "accepted_at", value)
$1      }
$1    />

$1    <TextInput
$1      label="Informó y recabó"
$1      value={form.consent_privacy.informed_by}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "informed_by", value)
$1      }
$1      placeholder="Nombre del personal clínico"
$1    />

$1    <SelectInput
$1      label="Evidencia de firma / aceptación"
$1      value={form.consent_privacy.signature_status}
$1      onChange={(value) =>
$1        updateNested("consent_privacy", "signature_status", value)
$1      }
$1      options={[
$1        "",
$1        "Recabada física",
$1        "Recabada digital simple",
$1        "Pendiente",
$1        "No recabada",
$1      ]}
$1    />

$1    <div className="md:col-span-3">
$1      <TextAreaInput
$1        label="Observaciones de consentimiento"
$1        value={form.consent_privacy.observations}
$1        onChange={(value) =>
$1          updateNested("consent_privacy", "observations", value)
$1        }
$1        rows={3}
$1      />
$1    </div>
$1  </div>

$1  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
$1    <strong>Regla de cierre:</strong> el expediente puede guardarse como
$1    borrador, pero no podrá cerrarse/firmarse si falta aviso de privacidad,
$1    consentimiento médico, consentimiento antidoping, consentimiento para
$1    datos sensibles o evidencia de aceptación.
$1  </div>
$1</Section>

$1<Section
$1  eyebrow="Obligatorio"
$1  title="Antidoping de ingreso"`,
    "sección visual consentimiento"
  );
}

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);

const finalContent = fs.readFileSync(filePath, "utf8");

console.log("");
console.log("Verificación:");
console.log("consent_privacy:", finalContent.includes("consent_privacy") ? "OK" : "NO");
console.log(
  "Consentimiento informado y privacidad:",
  finalContent.includes("Consentimiento informado y privacidad") ? "OK" : "NO"
);

if (
  finalContent.includes("consent_privacy") &&
  finalContent.includes("Consentimiento informado y privacidad")
) {
  console.log("");
  console.log("LISTO. Ahora ejecuta: npm run dev");
} else {
  console.log("");
  console.log("Algo no quedó insertado. Comparte la salida de este script.");
}
