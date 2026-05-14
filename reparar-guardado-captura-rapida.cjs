const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "QuickAttentionModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\QuickAttentionModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `QuickAttentionModule_backup_before_save_fix_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

/*
  1. Agregar estado de error visible.
*/
if (!content.includes("const [saveError, setSaveError] = useState")) {
  content = content.replace(
    "  const [lastSaved, setLastSaved] = useState(null);",
    `  const [lastSaved, setLastSaved] = useState(null);
  const [saveError, setSaveError] = useState("");`
  );
  changes += 1;
}

/*
  2. Reemplazar función saveQuickAttention por versión robusta.
*/
const start = content.indexOf("  async function saveQuickAttention(event) {");
const end = content.indexOf("\n  return (", start);

if (start === -1 || end === -1) {
  console.error("No pude localizar saveQuickAttention en QuickAttentionModule.jsx");
  process.exit(1);
}

const newFunction = `  async function saveQuickAttention(event) {
    event.preventDefault();

    setSaveError("");

    const errors = validateForm();

    if (errors.length > 0) {
      alert(errors.join("\\n"));
      return;
    }

    setSaving(true);

    try {
      const computedRiskLevel =
        redFlags.length > 0 && form.risk_level === "Bajo" ? "Medio" : form.risk_level;

      const payload = {
        attention_date: form.attention_date,
        company_id: form.company_id || null,
        plant_id: form.plant_id || null,

        patient_name: form.patient_name.trim(),
        employee_number: form.employee_number.trim(),
        area: form.area.trim() || null,

        diagnosis: buildDiagnosis(form),
        condition_classification: form.condition_classification || null,
        risk_level: computedRiskLevel,

        attention_minutes: Number(form.attention_minutes || 0),
        medicine_id: form.medicine_id || null,
        medicine_quantity: Number(form.medicine_quantity || 0),

        heart_rate: normalizeNumber(form.heart_rate),
        respiratory_rate: normalizeNumber(form.respiratory_rate),
        systolic_bp: normalizeNumber(form.systolic_bp),
        diastolic_bp: normalizeNumber(form.diastolic_bp),
        temperature: normalizeNumber(form.temperature),

        notes: buildNotes(form, redFlags),

        created_by_user_id: session?.user?.id || null,
        created_by_email: session?.user?.email || null,
      };

      const { error } = await supabase
        .from("attentions")
        .insert(payload);

      if (error) {
        const message =
          error.message ||
          error.details ||
          error.hint ||
          "Error desconocido al guardar la atención.";

        setSaveError(message);
        alert("No se pudo guardar la atención rápida:\\n" + message);
        setSaving(false);
        return;
      }

      setLastSaved({
        patient_name: payload.patient_name,
        attention_date: payload.attention_date,
      });

      setSaving(false);
      clearForm();
    } catch (error) {
      const message = error?.message || "Error inesperado al guardar.";
      setSaveError(message);
      alert("No se pudo guardar la atención rápida:\\n" + message);
      setSaving(false);
    }
  }
`;

content = content.slice(0, start) + newFunction + content.slice(end);
changes += 1;

/*
  3. Agregar bloque visual de error debajo de lastSaved.
*/
if (!content.includes("{saveError && (")) {
  content = content.replace(
    `        {lastSaved && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Atención rápida guardada correctamente: {lastSaved.patient_name}
          </div>
        )}`,
    `        {lastSaved && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
            Atención rápida guardada correctamente: {lastSaved.patient_name}
          </div>
        )}

        {saveError && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            Error al guardar: {saveError}
          </div>
        )}`
  );
  changes += 1;
}

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Verificación:");
console.log("saveError:", content.includes("saveError") ? "OK" : "NO");
console.log("insert sin select:", content.includes(".insert(payload);") ? "OK" : "NO");
console.log("");
console.log("Ahora ejecuta: npm run build");
