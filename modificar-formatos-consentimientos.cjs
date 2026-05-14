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
  `ConsentFormsModule_backup_before_modificaciones_${Date.now()}.jsx`
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

function replaceRegex(regex, replacement, label) {
  if (!regex.test(content)) {
    console.warn("No encontré:", label);
    return false;
  }

  content = content.replace(regex, replacement);
  changes += 1;
  console.log("Aplicado:", label);
  return true;
}

/*
  1. Equipo alcoholimetría AL700 por defecto.
*/
replaceText(
  '  alcohol_device: "",',
  '  alcohol_device: "AL700",',
  "equipo AL700 por defecto"
);

/*
  2. Agregar opciones para resultado de alcoholimetría y selección de formatos.
*/
if (!content.includes("const alcoholResultOptions")) {
  replaceText(
    "function getCompanyName(form, companies) {",
    `const alcoholResultOptions = [
  "",
  "0.000",
  "0.001",
  "0.002",
  "0.003",
  "0.004",
  "0.005",
  "0.006",
  "0.007",
  "0.008",
  "0.009",
  "0.010 o mayor",
  "Pendiente confirmatoria",
  "Prueba inválida",
  "Negativa a prueba",
  "No aplica",
];

const consentFormOptions = [
  { id: "alcohol", label: "Alcoholimetría" },
  { id: "antidoping", label: "Antidoping" },
  { id: "medical", label: "Revisión médica en consultorio" },
  { id: "referral", label: "Referencia / carta compromiso" },
];

function getCompanyName(form, companies) {`,
    "opciones de resultado y formatos"
  );
}

/*
  3. Permitir imprimir uno o varios consentimientos seleccionados.
*/
replaceText(
  "${pages[type] || pages.all}",
  '${Array.isArray(type) ? type.map((item) => pages[item]).filter(Boolean).join("") : pages[type] || pages.all}',
  "buildDocument compatible con selección múltiple"
);

/*
  4. Estado para seleccionar consentimientos.
*/
if (!content.includes("selectedFormTypes")) {
  replaceText(
    "  const [form, setForm] = useState(initialForm);",
    `  const [form, setForm] = useState(initialForm);
  const [selectedFormTypes, setSelectedFormTypes] = useState([
    "alcohol",
    "antidoping",
    "medical",
    "referral",
  ]);`,
    "estado selectedFormTypes"
  );
}

/*
  5. Funciones para alternar selección e imprimir seleccionados.
*/
if (!content.includes("function toggleSelectedFormType")) {
  replaceText(
    `  function clearForm() {
    const confirmed = window.confirm("¿Limpiar todos los campos del formulario?");`,
    `  function toggleSelectedFormType(formType) {
    setSelectedFormTypes((current) => {
      if (current.includes(formType)) {
        return current.filter((item) => item !== formType);
      }

      return [...current, formType];
    });
  }

  function printSelectedConsentForms() {
    if (selectedFormTypes.length === 0) {
      alert("Selecciona al menos un consentimiento para imprimir.");
      return;
    }

    printDocument(selectedFormTypes, form, companies, plants);
  }

  function clearForm() {
    const confirmed = window.confirm("¿Limpiar todos los campos del formulario?");`,
    "funciones de selección e impresión"
  );
}

/*
  6. Cambiar equipo alcoholimetría a AL700.
*/
replaceRegex(
  /<TextInput\s+label="Equipo \/ dispositivo"\s+value=\{form\.alcohol_device\}\s+onChange=\{\(value\) => updateField\("alcohol_device", value\)\}\s+\/>/s,
  `<SelectInput
                label="Equipo / dispositivo"
                value={form.alcohol_device}
                onChange={(value) => updateField("alcohol_device", value)}
                options={["AL700"]}
              />`,
  "campo equipo alcoholimetría como AL700"
);

/*
  7. Cambiar resultado alcoholimetría a lista desplegable.
*/
replaceRegex(
  /<TextInput\s+label="Resultado registrado"\s+value=\{form\.alcohol_result\}\s+onChange=\{\(value\) => updateField\("alcohol_result", value\)\}\s+placeholder="Ej\. 0\.000 \/ 0\.009 \/ Pendiente"\s+\/>/s,
  `<SelectInput
                label="Resultado registrado"
                value={form.alcohol_result}
                onChange={(value) => updateField("alcohol_result", value)}
                options={alcoholResultOptions}
              />`,
  "resultado alcoholimetría como lista desplegable"
);

/*
  8. Reemplazar apartado de impresión por selección de consentimientos.
*/
replaceRegex(
  /<section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">\s*<h3 className="text-xl font-black text-zinc-950">\s*Imprimir formatos\s*<\/h3>[\s\S]*?<\/section>\s*<\/div>\s*\);\s*}/,
  `<section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-black text-zinc-950">
          Consentimientos a imprimir
        </h3>

        <p className="mt-2 text-sm text-zinc-500">
          Selecciona uno o varios formatos según se necesite. Puedes imprimir solo
          alcoholimetría, solo antidoping, solo revisión médica, solo referencia médica
          o cualquier combinación.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {consentFormOptions.map((option) => (
            <label
              key={option.id}
              className={\`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-black transition \${
                selectedFormTypes.includes(option.id)
                  ? "border-red-300 bg-red-50 text-red-900"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
              }\`}
            >
              <input
                type="checkbox"
                checked={selectedFormTypes.includes(option.id)}
                onChange={() => toggleSelectedFormType(option.id)}
                className="h-4 w-4"
              />
              {option.label}
            </label>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <button
            type="button"
            onClick={printSelectedConsentForms}
            className="rounded-2xl bg-red-700 px-4 py-3 text-sm font-black text-white hover:bg-red-800"
          >
            Imprimir seleccionados
          </button>

          <button
            type="button"
            onClick={() =>
              setSelectedFormTypes(consentFormOptions.map((option) => option.id))
            }
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Seleccionar todos
          </button>

          <button
            type="button"
            onClick={() => setSelectedFormTypes([])}
            className="rounded-2xl border border-zinc-300 px-4 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-50"
          >
            Limpiar selección
          </button>
        </div>

        <div className="mt-8 border-t border-zinc-200 pt-5">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.14em] text-zinc-500">
            Impresión rápida individual
          </p>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
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
          </div>
        </div>
      </section>
    </div>
  );
}`,
  "apartado de impresión por selección de consentimientos"
);

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);

console.log("");
console.log("Verificación:");
console.log("AL700:", content.includes('alcohol_device: "AL700"') ? "OK" : "NO");
console.log("alcoholResultOptions:", content.includes("const alcoholResultOptions") ? "OK" : "NO");
console.log("selectedFormTypes:", content.includes("selectedFormTypes") ? "OK" : "NO");
console.log("Imprimir seleccionados:", content.includes("Imprimir seleccionados") ? "OK" : "NO");
console.log("");
console.log("Ahora ejecuta: npm run build");
