const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const modulePath = path.join(__dirname, "src", "ConsentDocumentsModule.jsx");

if (!fs.existsSync(appPath)) {
  console.error("No encontré src\\App.jsx");
  process.exit(1);
}

if (!fs.existsSync(modulePath)) {
  console.error("No encontré src\\ConsentDocumentsModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App_backup_before_consentimientos_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

if (!content.includes("ConsentDocumentsModule")) {
  const imports = Array.from(content.matchAll(/^import .+;$/gm));

  if (imports.length === 0) {
    console.error("No encontré imports en App.jsx");
    process.exit(1);
  }

  const lastImport = imports[imports.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;

  content =
    content.slice(0, insertAt) +
    '\nimport ConsentDocumentsModule from "./ConsentDocumentsModule.jsx";' +
    content.slice(insertAt);

  changes += 1;
  console.log("Import agregado.");
}

if (!content.match(/id:\s*"consentimientos"/)) {
  const ingresoItemRegex =
    /(\{\s*id:\s*"ingreso",\s*label:\s*"Examen ingreso",\s*subtitle:\s*"[^"]*"\s*\},)/;

  if (ingresoItemRegex.test(content)) {
    content = content.replace(
      ingresoItemRegex,
      `$1
  { id: "consentimientos", label: "Consentimientos", subtitle: "Formatos físicos" },`
    );
  } else {
    const navStartRegex = /(const\s+navItems\s*=\s*\[\s*)/;

    if (!navStartRegex.test(content)) {
      console.error("No encontré navItems en App.jsx");
      process.exit(1);
    }

    content = content.replace(
      navStartRegex,
      `$1
  { id: "consentimientos", label: "Consentimientos", subtitle: "Formatos físicos" },
`
    );
  }

  changes += 1;
  console.log("Pestaña agregada.");
}

if (!content.includes('activeModule === "consentimientos"')) {
  const renderBlock = `{activeModule === "consentimientos" && (
  <ConsentDocumentsModule
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
    console.error("No encontré dónde insertar el render de Consentimientos.");
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
console.log(
  "Import:",
  content.includes("ConsentDocumentsModule") ? "OK" : "NO"
);
console.log(
  "Nav:",
  content.match(/id:\s*"consentimientos"/) ? "OK" : "NO"
);
console.log(
  "Render:",
  content.includes('activeModule === "consentimientos"') ? "OK" : "NO"
);
console.log("");
console.log("Ahora ejecuta: npm run dev");