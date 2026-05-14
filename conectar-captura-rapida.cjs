const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "src", "App.jsx");
const modulePath = path.join(__dirname, "src", "QuickAttentionModule.jsx");

if (!fs.existsSync(appPath)) {
  console.error("No encontré src\\App.jsx");
  process.exit(1);
}

if (!fs.existsSync(modulePath)) {
  console.error("No encontré src\\QuickAttentionModule.jsx");
  process.exit(1);
}

let content = fs.readFileSync(appPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `App_backup_before_quick_attention_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

let changes = 0;

if (!content.includes('import QuickAttentionModule from "./QuickAttentionModule.jsx";')) {
  const imports = Array.from(content.matchAll(/^import .+;$/gm));

  if (imports.length === 0) {
    console.error("No encontré imports en App.jsx");
    process.exit(1);
  }

  const lastImport = imports[imports.length - 1];
  const insertAt = lastImport.index + lastImport[0].length;

  content =
    content.slice(0, insertAt) +
    '\nimport QuickAttentionModule from "./QuickAttentionModule.jsx";' +
    content.slice(insertAt);

  changes += 1;
  console.log("Import agregado.");
}

if (!content.match(/id:\s*"captura_rapida"/)) {
  const navItem =
    '  { id: "captura_rapida", label: "Captura rápida", subtitle: "Atención en 60 segundos" },\n';

  const atencionesRegex =
    /(\s*\{\s*id:\s*"atenciones",\s*label:\s*"Atenciones",\s*subtitle:\s*"[^"]*"\s*\},\s*)/;

  if (atencionesRegex.test(content)) {
    content = content.replace(atencionesRegex, `${navItem}$1`);
  } else {
    const navStartRegex = /(const\s+navItems\s*=\s*\[\s*)/;

    if (!navStartRegex.test(content)) {
      console.error("No encontré navItems en App.jsx");
      process.exit(1);
    }

    content = content.replace(navStartRegex, `$1\n${navItem}`);
  }

  changes += 1;
  console.log("Pestaña Captura rápida agregada.");
}

if (!content.includes('activeModule === "captura_rapida"')) {
  const renderBlock = `{activeModule === "captura_rapida" && (
  <QuickAttentionModule
    session={session}
    companies={companies}
    plants={plants}
    medicines={medicines}
    onSaved={loadData}
  />
)}
`;

  const anchors = [
    '{activeModule === "atenciones" && (',
    '{activeModule === "dashboard" && (',
    '{activeModule === "ingreso" && (',
    '{activeModule === "formatos" && (',
    '{activeModule === "antidoping" && (',
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
    console.error("No encontré dónde insertar el render de Captura rápida.");
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
console.log("Import:", content.includes("QuickAttentionModule") ? "OK" : "NO");
console.log("Nav:", content.match(/id:\s*"captura_rapida"/) ? "OK" : "NO");
console.log("Render:", content.includes('activeModule === "captura_rapida"') ? "OK" : "NO");
console.log("");
console.log("Ahora ejecuta: npm run build");