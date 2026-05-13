const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "PreemploymentMedicalExamModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\PreemploymentMedicalExamModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

if (content.includes("consent_privacy")) {
  console.log("El módulo ya contiene consentimiento y privacidad. No hice cambios.");
  process.exit(0);
}

const backupPath = path.join(
  __dirname,
  "src",
  `PreemploymentMedicalExamModule_backup_consent_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

function replaceOrFail(search, replacement, label) {
  if (!content.includes(search)) {
    console.error(`No encontré el bloque para: ${label}`);
    console.error("No se modificó el archivo principal. Revisa si el módulo cambió.");
    process.exit(1);
  }

  content = content.replace(search, replacement);
}

replaceOrFail(
`    antidoping: {
      performed: "",
      test_date: todayIso(),
      folio: "",
      test_type: "Prueba rápida inmunocromatográfica",
      sample_type: "Orina",
      result: "Pendiente",
      lot_number: "",
      observations: "",
    },

    key_history: {`,
`    antidoping: {
      performed: "",
      test_date: todayIso(),
      folio: "",
      test_type: "Prueba rápida inmunocromatográfica",
      sample_type: "Orina",
      result: "Pendiente",
      lot_number: "",
      observations: "",
    },

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
    },

    key_history: {`,
"estado inicial de consentimiento"
);

replaceOrFail(
`    antidoping: {
      ...initial.antidoping,
      ...(complementary.antidoping || {}),
    },

    key_history: {`,
`    antidoping: {
      ...initial.antidoping,
      ...(complementary.antidoping || {}),
    },

    consent_privacy: {
      ...initial.consent_privacy,
      ...(complementary.consent_privacy || {}),
    },

    key_history: {`,
"lectura de consentimiento desde expediente"
);

replaceOrFail(
`  if (form.antidoping.performed !== "Realizado") {`,
`  if (form.consent_privacy.privacy_notice_delivered !== "Sí") {
    blockers.push("Falta confirmar entrega de aviso de privacidad.");
  }

  if (!form.consent_privacy.privacy_notice_medium) {
    blockers.push("Falta medio de entrega del aviso de privacidad.");
  }

  if (form.consent_privacy.medical_evaluation_consent !== "Sí") {
    blockers.push("Falta consentimiento para valoración médica ocupacional.");
  }

  if (form.consent_privacy.antidoping_consent !== "Sí") {
    blockers.push("Falta consentimiento específico para antidoping.");
  }

  if (form.consent_privacy.sensitive_data_consent !== "Sí") {
    blockers.push("Falta consentimiento para tratamiento de datos personales sensibles.");
  }

  if (!form.consent_privacy.accepted_at) {
    blockers.push("Falta fecha y hora de aceptación del consentimiento.");
  }

  if (fieldIsEmpty(form.consent_privacy.informed_by)) {
    blockers.push("Falta registrar quién informó y recabó consentimiento.");
  }

  if (
    !["Recabada física", "Recabada digital simple"].includes(
      form.consent_privacy.signature_status
    )
  ) {
    blockers.push("Falta evidencia de firma o aceptación del consentimiento.");
  }

  if (form.antidoping.performed !== "Realizado") {`,
"validaciones de consentimiento"
);

replaceOrFail(
`      complementary_tests: {
        antidoping: form.antidoping,
      },`,
`      complementary_tests: {
        antidoping: form.antidoping,
        consent_privacy: form.consent_privacy,
      },`,
"guardar consentimiento en complementary_tests"
);

replaceOrFail(
`          <Section
            eyebrow="Obligatorio"
            title="Antidoping de ingreso"`,
`          <Section
            eyebrow="Cumplimiento"
            title="Consentimiento informado y privacidad"
            helper="Bloque obligatorio para cierre del expediente. Permite documentar aviso de privacidad, consentimiento médico, antidoping y tratamiento de datos sensibles."
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <SelectInput
                label="Aviso de privacidad entregado"
                value={form.consent_privacy.privacy_notice_delivered}
                onChange={(value) =>
                  updateNested("consent_privacy", "privacy_notice_delivered", value)
                }
                options={["", "Sí", "No", "Pendiente"]}
              />

              <SelectInput
                label="Medio de entrega"
                value={form.consent_privacy.privacy_notice_medium}
                onChange={(value) =>
                  updateNested("consent_privacy", "privacy_notice_medium", value)
                }
                options={[
                  "",
                  "Físico",
                  "Digital",
                  "Físico y digital",
                  "Verbal con respaldo pendiente",
                ]}
              />

              <SelectInput
                label="Consentimiento valoración médica"
                value={form.consent_privacy.medical_evaluation_consent}
                onChange={(value) =>
                  updateNested(
                    "consent_privacy",
                    "medical_evaluation_consent",
                    value
                  )
                }
                options={["", "Sí", "No", "Pendiente"]}
              />

              <SelectInput
                label="Consentimiento antidoping"
                value={form.consent_privacy.antidoping_consent}
                onChange={(value) =>
                  updateNested("consent_privacy", "antidoping_consent", value)
                }
                options={["", "Sí", "No", "Pendiente"]}
              />

              <SelectInput
                label="Consentimiento datos sensibles"
                value={form.consent_privacy.sensitive_data_consent}
                onChange={(value) =>
                  updateNested(
                    "consent_privacy",
                    "sensitive_data_consent",
                    value
                  )
                }
                options={["", "Sí", "No", "Pendiente"]}
              />

              <TextInput
                label="Fecha y hora de aceptación"
                type="datetime-local"
                value={form.consent_privacy.accepted_at}
                onChange={(value) =>
                  updateNested("consent_privacy", "accepted_at", value)
                }
              />

              <TextInput
                label="Informó y recabó"
                value={form.consent_privacy.informed_by}
                onChange={(value) =>
                  updateNested("consent_privacy", "informed_by", value)
                }
                placeholder="Nombre del personal clínico"
              />

              <SelectInput
                label="Evidencia de firma / aceptación"
                value={form.consent_privacy.signature_status}
                onChange={(value) =>
                  updateNested("consent_privacy", "signature_status", value)
                }
                options={[
                  "",
                  "Recabada física",
                  "Recabada digital simple",
                  "Pendiente",
                  "No recabada",
                ]}
              />

              <div className="md:col-span-3">
                <TextAreaInput
                  label="Observaciones de consentimiento"
                  value={form.consent_privacy.observations}
                  onChange={(value) =>
                    updateNested("consent_privacy", "observations", value)
                  }
                  rows={3}
                />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <strong>Regla de cierre:</strong> el expediente puede guardarse como
              borrador, pero no podrá cerrarse/firmarse si falta aviso de privacidad,
              consentimiento médico, consentimiento antidoping, consentimiento para
              datos sensibles o evidencia de aceptación.
            </div>
          </Section>

          <Section
            eyebrow="Obligatorio"
            title="Antidoping de ingreso"`,
"sección visual de consentimiento"
);

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Listo. Se agregó consentimiento y privacidad al módulo de examen de ingreso.");
console.log("Respaldo creado en:");
console.log(backupPath);