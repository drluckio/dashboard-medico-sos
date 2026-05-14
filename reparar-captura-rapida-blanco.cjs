const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");

if (!fs.existsSync(appPath)) {
  console.error("No encontré src\\App.jsx");
  process.exit(1);
}

let content = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App_backup_fix_quick_attention_blank_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

/*
  El problema más probable:
  onSaved={loadData} usa una función que no existe en App.jsx.
*/
if (content.includes("onSaved={loadData}")) {
  content = content.replace("    onSaved={loadData}\n", "");
  changes += 1;
  console.log("Eliminado onSaved={loadData}");
}

/*
  Por si quedó con espacios diferentes.
*/
content = content.replace(
  /\s+onSaved=\{loadData\}/g,
  () => {
    changes += 1;
    console.log("Eliminado onSaved={loadData} con regex");
    return "";
  }
);

fs.writeFileSync(appPath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);

console.log("");
console.log("Verificación:");
console.log("QuickAttentionModule:", content.includes("QuickAttentionModule") ? "OK" : "NO");
console.log("onSaved loadData eliminado:", !content.includes("onSaved={loadData}") ? "OK" : "NO");

console.log("");
console.log("Ahora ejecuta: npm run build");