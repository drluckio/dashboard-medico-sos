const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "ConsentFormsModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\ConsentFormsModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `ConsentFormsModule_backup_before_new_hire_consent_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

function replaceText(search, replacement, label) {
  if (!content.includes(search)) {
    console.warn("No encontré:", label);
    return false;
  }

  content = content.replace(search, replacement);
  changes += 1;
  console.log("Aplicado:", label);
  return true;
}

/*
  1. Agregar opción al selector de consentimientos.
*/
if (!content.includes('{ id: "new_hire", label: "Nuevo ingreso" }')) {
  replaceText(
    "const consentFormOptions = [\n",
    'const consentFormOptions = [\n  { id: "new_hire", label: "Nuevo ingreso" },\n',
    "opción Nuevo ingreso"
  );
}

/*
  2. Agregar Nuevo ingreso al estado seleccionado por defecto.
*/
if (
  content.includes('const [selectedFormTypes, setSelectedFormTypes] = useState([') &&
  !content.includes('"new_hire",\n    "alcohol"')
) {
  replaceText(
    'const [selectedFormTypes, setSelectedFormTypes] = useState([\n    "alcohol",',
    'const [selectedFormTypes, setSelectedFormTypes] = useState([\n    "new_hire",\n    "alcohol",',
    "selección por defecto Nuevo ingreso"
  );
}

/*
  3. Insertar generador del consentimiento de nuevo ingreso.
*/
const newHireFunction = `
function buildNewHireConsent(form, companies, plants) {
  return \`
    <main class="page">
      \${header(
        "Consentimiento informado para examen médico de nuevo ingreso",
        "Formato físico para autorización de valoración médica ocupacional previa al ingreso laboral."
      )}

      \${collaboratorGrid(form, companies, plants)}

      <h2>Declaración y consentimiento</h2>

      <p class="paragraph">
        Manifiesto que he sido informado(a) de que el examen médico de nuevo ingreso tiene como finalidad
        valorar mi estado general de salud, antecedentes médicos, signos vitales, exploración física y
        compatibilidad médico-funcional con el puesto propuesto, desde una perspectiva de salud ocupacional,
        prevención de riesgos y seguridad industrial.
      </p>

      <p class="paragraph">
        Entiendo que esta valoración médica ocupacional puede incluir interrogatorio clínico, antecedentes
        heredofamiliares, antecedentes personales patológicos y no patológicos, antecedentes laborales,
        revisión por aparatos y sistemas, toma de signos vitales, somatometría, exploración física general,
        exploración neurológica básica, valoración visual, movilidad, equilibrio, coordinación y otras pruebas
        funcionales relacionadas con el perfil del puesto.
      </p>

      <p class="paragraph">
        Entiendo que, dependiendo del puesto evaluado, el personal médico podrá solicitar o revisar estudios
        complementarios tales como audiometría, espirometría, radiografías, laboratorio, electrocardiograma,
        pruebas funcionales, antidoping u otros estudios ocupacionales aplicables. Cuando exista un consentimiento
        específico para alguno de estos procedimientos, este deberá recabarse de forma independiente.
      </p>

      <p class="paragraph">
        Reconozco que este examen no sustituye la atención de mi médico tratante, unidad médica familiar,
        consulta especializada, servicio de urgencias ni estudios diagnósticos externos. Su alcance se limita
        a la emisión de un dictamen médico ocupacional relacionado con el puesto evaluado.
      </p>

      <ul class="checklist">
        <li><span class="check"></span>Autorizo la realización del examen médico de nuevo ingreso.</li>
        <li><span class="check"></span>Autorizo la toma de signos vitales y somatometría.</li>
        <li><span class="check"></span>Autorizo el interrogatorio médico ocupacional y registro de antecedentes relevantes.</li>
        <li><span class="check"></span>Autorizo la exploración física y funcional necesaria conforme al puesto evaluado.</li>
        <li><span class="check"></span>Entiendo que puedo informar molestias, antecedentes, enfermedades, tratamientos o limitaciones relevantes.</li>
        <li><span class="check"></span>Entiendo que el resultado podrá ser: apto, apto con recomendaciones, apto con restricciones, no apto temporal, no apto para el puesto evaluado o requiere valoración complementaria.</li>
        <li><span class="check"></span>Entiendo que el expediente clínico completo queda bajo resguardo médico y que a RH/EHS solo se comunicará el dictamen operativo necesario.</li>
      </ul>

      <h2>Datos del proceso de nuevo ingreso</h2>

      <section class="grid">
        \${box("Fecha y hora", formatDateTime(form.datetime))}
        \${box("Empresa", getCompanyName(form, companies))}
        \${box("Planta", getPlantName(form, plants))}
        \${box("Puesto evaluado", form.job_position)}
        \${box("Área", form.area)}
        \${box("Motivo", "Examen médico de nuevo ingreso")}
        \${box("Observaciones", form.observations, true)}
      </section>

      <div class="notice">
        La firma de este consentimiento acredita que el aspirante fue informado sobre el alcance del examen
        médico ocupacional de nuevo ingreso y autoriza la valoración correspondiente. La información clínica
        completa deberá mantenerse bajo resguardo médico y confidencial.
      </div>

      <section class="signature-grid">
        \${signature("Firma del aspirante", form.collaborator_name || "Nombre y firma")}
        \${signature("Firma de quien informa y recaba", form.staff_name || "Nombre y firma")}
      </section>

      <section class="signature-grid">
        \${signature("Médico responsable", \`\${form.physician_name || "Nombre"} · Cédula: \${form.physician_license || "__________"}\`)}
        \${signature("Testigo / RH / EHS", form.witness_name || "Nombre y firma")}
      </section>

      \${footer()}
    </main>
  \`;
}
`;

if (!content.includes("function buildNewHireConsent")) {
  replaceText(
    "function buildAlcoholConsent(form, companies, plants) {",
    `${newHireFunction}\nfunction buildAlcoholConsent(form, companies, plants) {`,
    "función buildNewHireConsent"
  );
}

/*
  4. Agregar builder al mapa de impresión.
*/
if (!content.includes("new_hire: buildNewHireConsent")) {
  replaceText(
    "  const builders = {\n",
    "  const builders = {\n    new_hire: buildNewHireConsent,\n",
    "builder new_hire"
  );
}

/*
  5. Ajustar grid de impresión rápida a 5 columnas.
*/
replaceText(
  'className="grid grid-cols-1 gap-3 md:grid-cols-4"',
  'className="grid grid-cols-1 gap-3 md:grid-cols-5"',
  "grid impresión rápida a 5 columnas"
);

/*
  6. Agregar botón rápido individual.
*/
if (!content.includes('onClick={() => printDocument("new_hire", form, companies, plants)}')) {
  replaceText(
    `<div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <button
              type="button"
              onClick={() => printDocument("alcohol", form, companies, plants)}`,
    `<div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <button
              type="button"
              onClick={() => printDocument("new_hire", form, companies, plants)}
              className="rounded-2xl border border-zinc-300 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-900 hover:bg-zinc-100"
            >
              Nuevo ingreso
            </button>

            <button
              type="button"
              onClick={() => printDocument("alcohol", form, companies, plants)}`,
    "botón rápido Nuevo ingreso"
  );
}

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);

console.log("");
console.log("Verificación:");
console.log(
  "Opción new_hire:",
  content.includes('{ id: "new_hire", label: "Nuevo ingreso" }') ? "OK" : "NO"
);
console.log(
  "Función buildNewHireConsent:",
  content.includes("function buildNewHireConsent") ? "OK" : "NO"
);
console.log(
  "Builder new_hire:",
  content.includes("new_hire: buildNewHireConsent") ? "OK" : "NO"
);
console.log(
  "Botón Nuevo ingreso:",
  content.includes('printDocument("new_hire", form, companies, plants)') ? "OK" : "NO"
);

console.log("");
console.log("Ahora ejecuta: npm run build");notepad forzar-boton-nuevo-ingreso.cjs
