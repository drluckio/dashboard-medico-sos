const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "src");

const replacements = [
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã±", "ñ"],
  ["Ã¼", "ü"],

  ["Ã", "Á"],
  ["Ã‰", "É"],
  ["Ã", "Í"],
  ["Ã“", "Ó"],
  ["Ãš", "Ú"],
  ["Ã‘", "Ñ"],
  ["Ãœ", "Ü"],

  ["Â¿", "¿"],
  ["Â¡", "¡"],
  ["Â°", "°"],
  ["Â·", "·"],
  ["Â", ""],
];

const allowedExtensions = new Set([
  ".js",
  ".jsx",
  ".css",
  ".html",
  ".json",
]);

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name).toLowerCase();

    if (!allowedExtensions.has(ext)) continue;

    let content = fs.readFileSync(fullPath, "utf8");
    const original = content;

    for (const [bad, good] of replacements) {
      content = content.split(bad).join(good);
    }

    if (content !== original) {
      fs.writeFileSync(fullPath, content, "utf8");
      console.log("Reparado:", fullPath);
    }
  }
}

if (!fs.existsSync(root)) {
  console.error("No encontré la carpeta src. Ejecuta esto dentro del proyecto.");
  process.exit(1);
}

walk(root);

console.log("");
console.log("Listo. Se repararon textos con acentos dañados dentro de src.");
