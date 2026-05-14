const fs = require("fs");
const path = require("path");

const mainPath = path.join(__dirname, "src", "main.jsx");
const resetPath = path.join(__dirname, "src", "ResetPasswordModule.jsx");

if (!fs.existsSync(mainPath)) {
  console.error("No encontré src\\main.jsx");
  process.exit(1);
}

if (!fs.existsSync(resetPath)) {
  console.error("No encontré src\\ResetPasswordModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(mainPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `main_backup_before_reset_password_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

if (!content.includes("ResetPasswordModule")) {
  const imports = Array.from(content.matchAll(/^import .+;$/gm));

  if (imports.length === 0) {
    console.error("No encontré imports en main.jsx");
    process.exit(1);
  }

  const lastImport = imports[imports.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;

  content =
    content.slice(0, insertAt) +
    '\nimport ResetPasswordModule from "./ResetPasswordModule.jsx";' +
    content.slice(insertAt);

  changes += 1;
}

if (!content.includes("const isResetPasswordRoute")) {
  content = content.replace(
    /ReactDOM\.createRoot\(document\.getElementById\("root"\)\)\.render\(\s*<React\.StrictMode>\s*<App\s*\/>\s*<\/React\.StrictMode>\s*\);/s,
    `const isResetPasswordRoute = window.location.pathname === "/reset-password";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isResetPasswordRoute ? <ResetPasswordModule /> : <App />}
  </React.StrictMode>
);`
  );

  if (!content.includes("const isResetPasswordRoute")) {
    console.error("No pude reemplazar el render de main.jsx. Revisa el archivo manualmente.");
    process.exit(1);
  }

  changes += 1;
}

fs.writeFileSync(mainPath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Verificación:");
console.log("ResetPasswordModule:", content.includes("ResetPasswordModule") ? "OK" : "NO");
console.log("Ruta /reset-password:", content.includes("isResetPasswordRoute") ? "OK" : "NO");
console.log("");
console.log("Ahora ejecuta: npm run dev");