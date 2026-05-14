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
  `index_backup_before_readability_${Date.now()}.css`
);

fs.writeFileSync(backupPath, content, "utf8");

const blockMarker = "/* SOS READABILITY SYSTEM */";

const readabilityBlock = `
/* SOS READABILITY SYSTEM */
:root {
  --sos-readable-text: 15.5px;
  --sos-readable-small: 13.5px;
  --sos-readable-label: 12.5px;
  --sos-field-height: 48px;
}

body {
  font-size: var(--sos-readable-text);
}

input,
select,
textarea,
button {
  font-size: 15.5px !important;
  line-height: 1.45 !important;
}

input,
select {
  min-height: var(--sos-field-height);
}

textarea {
  min-height: 104px;
}

.text-xs {
  font-size: var(--sos-readable-label) !important;
  line-height: 1.25rem !important;
}

.text-sm {
  font-size: var(--sos-readable-small) !important;
  line-height: 1.45rem !important;
}

section.rounded-3xl {
  padding: 1.75rem !important;
}

section.rounded-3xl h2 {
  font-size: 1.8rem !important;
  line-height: 2.15rem !important;
}

section.rounded-3xl h3 {
  font-size: 1.35rem !important;
  line-height: 1.8rem !important;
}

section.rounded-3xl .grid {
  gap: 1.1rem !important;
}

label span.uppercase {
  font-size: 12px !important;
  letter-spacing: 0.12em !important;
}

button.rounded-2xl {
  min-height: 46px;
}

aside button {
  min-height: 58px;
}

aside .text-xs {
  font-size: 12px !important;
}

aside .text-sm {
  font-size: 14px !important;
}
`;

if (content.includes(blockMarker)) {
  content = content.replace(
    /\/\* SOS READABILITY SYSTEM \*\/[\s\S]*$/m,
    readabilityBlock.trim() + "\n"
  );
  console.log("Bloque de legibilidad actualizado.");
} else {
  content = content.trimEnd() + "\n\n" + readabilityBlock.trim() + "\n";
  console.log("Bloque de legibilidad agregado.");
}

fs.writeFileSync(cssPath, content, "utf8");

console.log("");
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Ahora ejecuta: npm run build");
