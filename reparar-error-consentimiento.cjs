const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "src", "PreemploymentMedicalExamModule.jsx");

if (!fs.existsSync(filePath)) {
  console.error("No encontré src\\PreemploymentMedicalExamModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(filePath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `PreemploymentMedicalExamModule_backup_before_fix_unicode_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

const before = content;

// Corrige backticks escapados que quedaron como \`
content = content.split("\\`").join("`");

// Corrige interpolaciones escapadas que quedaron como \${...}
content = content.split("\\${").join("${");

fs.writeFileSync(filePath, content, "utf8");

console.log("");
console.log("Respaldo creado en:");
console.log(backupPath);

console.log("");
console.log("Correcciones aplicadas:");
console.log("Backticks escapados:", before.includes("\\`") ? "corregidos" : "no había");
console.log("Interpolaciones escapadas:", before.includes("\\${") ? "corregidas" : "no había");

console.log("");
console.log("Verificación:");
console.log("Aún contiene \\`:", content.includes("\\`") ? "SÍ - revisar" : "NO");
console.log("Aún contiene \\${:", content.includes("\\${") ? "SÍ - revisar" : "NO");

console.log("");
console.log("Ahora ejecuta: npm run dev");
