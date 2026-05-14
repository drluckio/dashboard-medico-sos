const fs = require("fs");
const path = require("path");

const cssPath = path.join(__dirname, "src", "index.css");

if (!fs.existsSync(cssPath)) {
  console.error("No encontré src\\index.css");
  process.exit(1);
}

let content = fs.readFileSync(cssPath, "utf8");

const backupPath = path.join(
  __dirname,
  "src",
  `index_backup_before_scroll_fix_${Date.now()}.css`
);

fs.writeFileSync(backupPath, content, "utf8");

const marker = "/* SOS SCROLL SYSTEM */";

const scrollBlock = `
/* SOS SCROLL SYSTEM */
html,
body,
#root {
  min-height: 100%;
}

html {
  overflow-y: auto;
  overflow-x: hidden;
}

body {
  overflow-y: auto;
  overflow-x: hidden;
}

#root {
  min-height: 100vh;
}

/* Layout general */
#root > div {
  min-height: 100vh;
}

/* Sidebar con desplazamiento propio */
aside {
  max-height: 100vh;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  scrollbar-gutter: stable;
}

/* Área principal */
main {
  min-width: 0;
  overflow-x: hidden;
}

/* Cuando el layout use altura fija, permitir scroll interno */
.h-screen main,
.min-h-screen main {
  max-height: 100vh;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

/* Evita que los grids y formularios se corten */
section,
form,
div {
  min-width: 0;
}

/* Scrollbar visible y discreta */
aside::-webkit-scrollbar,
main::-webkit-scrollbar,
body::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

aside::-webkit-scrollbar-track,
main::-webkit-scrollbar-track,
body::-webkit-scrollbar-track {
  background: #f4f4f5;
}

aside::-webkit-scrollbar-thumb,
main::-webkit-scrollbar-thumb,
body::-webkit-scrollbar-thumb {
  background: #a1a1aa;
  border-radius: 999px;
  border: 2px solid #f4f4f5;
}

aside::-webkit-scrollbar-thumb:hover,
main::-webkit-scrollbar-thumb:hover,
body::-webkit-scrollbar-thumb:hover {
  background: #71717a;
}

/* Firefox */
aside,
main,
body {
  scrollbar-width: thin;
  scrollbar-color: #a1a1aa #f4f4f5;
}

/* Impresión sin scroll forzado */
@media print {
  html,
  body,
  #root,
  main,
  aside {
    overflow: visible !important;
    max-height: none !important;
    height: auto !important;
  }
}
`;

if (content.includes(marker)) {
  content = content.replace(
    /\/\* SOS SCROLL SYSTEM \*\/[\s\S]*?(?=\/\* SOS|$)/m,
    scrollBlock.trim() + "\n\n"
  );
  console.log("Bloque SOS SCROLL SYSTEM reemplazado.");
} else {
  content = content.trimEnd() + "\n\n" + scrollBlock.trim() + "\n";
  console.log("Bloque SOS SCROLL SYSTEM agregado.");
}

fs.writeFileSync(cssPath, content, "utf8");

console.log("");
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Ahora ejecuta: npm run build");
