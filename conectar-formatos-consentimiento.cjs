const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const modulePath = path.join(__dirname, "src", "ConsentFormsModule.jsx");

if (!fs.existsSync(appPath)) {
  console.error("No encontré src\\App.jsx");
  process.exit(1);
}

if (!fs.existsSync(modulePath)) {
  console.error("No encontré src\\ConsentFormsModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App_backup_before_consent_forms_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

if (!content.includes('import ConsentFormsModule from "./ConsentFormsModule.jsx";')) {
  const imports = Array.from(content.matchAll(/^import .+;$/gm));

  if (imports.length === 0) {
    console.error("No encontré imports en App.jsx");
    process.exit(1);
  }

  const lastImport = imports[imports.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;

  content =
    content.slice(0, insertAt) +
    '\nimport ConsentFormsModule from "./ConsentFormsModule.jsx";' +
    content.slice(insertAt);

  changes += 1;
  console.log("Import agregado.");
}

if (!content.match(/id:\s*"formatos"/)) {
  const navItem =
    '  { id: "formatos", label: "Formatos", subtitle: "Consentimientos" },\n';

  const ingresoRegex =
    /(\s*\{\s*id:\s*"ingreso",\s*label:\s*"Examen ingreso",\s*subtitle:\s*"[^"]*"\s*\},\s*)/;

  if (ingresoRegex.test(content)) {
    content = content.replace(ingresoRegex, `$1${navItem}`);
  } else {
    const navStartRegex = /(const\s+navItems\s*=\s*\[\s*)/;

    if (!navStartRegex.test(content)) {
      console.error("No encontré navItems en App.jsx");
      process.exit(1);
    }

    content = content.replace(navStartRegex, `$1\n${navItem}`);
  }

  changes += 1;
  console.log("Pestaña Formatos agregada.");
}

if (!content.includes('activeModule === "formatos"')) {
  const renderBlock = `{activeModule === "formatos" && (
  <ConsentFormsModule
    companies={companies}
    plants={plants}
  />
)}
`;

  const anchors = [
    '{activeModule === "ingreso" && (',
    '{activeModule === "antidoping" && (',
    '{activeModule === "cronicos" && (',
    '{activeModule === "inventario" && (',
    '{activeModule === "reportes" && (',
  ];

  let inserted = false;

  for (const anchor of anchors) {
    if (content.includes(anchor)) {
      content = content.replace(anchor, renderBlock + "\n" + anchor);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    console.error("No encontré dónde insertar el render de Formatos.");
    process.exit(1);
  }

  changes += 1;
  console.log("Render agregado.");
}

fs.writeFileSync(appPath, content, "utf8");

console.log("");
console.log("Cambios aplicados:", changes);
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Verificación:");
console.log("Import:", content.includes("ConsentFormsModule") ? "OK" : "NO");
console.log("Nav Formatos:", content.match(/id:\s*"formatos"/) ? "OK" : "NO");
console.log("Render Formatos:", content.includes('activeModule === "formatos"') ? "OK" : "NO");
console.log("");
console.log("Ahora ejecuta: npm run build");
