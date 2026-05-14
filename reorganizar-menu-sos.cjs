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
  `App_backup_before_menu_reorder_${Date.now()}.jsx`
);

fs.writeFileSync(backupPath, content, "utf8");

const startMarker = "const navItems = [";
const start = content.indexOf(startMarker);

if (start === -1) {
  console.error("No encontré const navItems = [ en App.jsx");
  process.exit(1);
}

const end = content.indexOf("];", start);

if (end === -1) {
  console.error("No pude encontrar el cierre de navItems.");
  process.exit(1);
}

const newNavItems = `const navItems = [
  { id: "dashboard", label: "Dashboard", subtitle: "Centro de mando" },

  { id: "captura_rapida", label: "Captura rápida", subtitle: "Atención en 60 segundos" },
  { id: "atenciones", label: "Atenciones", subtitle: "Consulta in-plant" },
  { id: "pendientes", label: "Pendientes clínicos", subtitle: "Seguimiento operativo" },
  { id: "bitacora", label: "Bitácora diaria", subtitle: "Entrega y recepción" },
  { id: "checklist", label: "Checklist apertura/cierre", subtitle: "Control de consultorio" },

  { id: "ingreso", label: "Examen ingreso", subtitle: "Historia clínica ocupacional" },
  { id: "antidoping", label: "Antidoping", subtitle: "Pruebas toxicológicas" },
  { id: "cronicos", label: "Crónico-degenerativos", subtitle: "Programa preventivo" },
  { id: "incapacidades", label: "Incapacidades", subtitle: "Ausentismo médico" },
  { id: "formatos", label: "Formatos", subtitle: "Consentimientos" },

  { id: "inventario", label: "Inventario", subtitle: "Medicamentos e insumos" },
  { id: "alertas", label: "Alertas", subtitle: "Riesgos y vencimientos" },
  { id: "reportes", label: "Reportes", subtitle: "Indicadores ejecutivos" },

  { id: "empresas", label: "Empresas", subtitle: "Clientes y plantas" },
  { id: "admin", label: "Admin", subtitle: "Usuarios y alcance" },
  { id: "importar", label: "Importar Excel", subtitle: "Carga masiva" },
];`;

content = content.slice(0, start) + newNavItems + content.slice(end + 2);

fs.writeFileSync(appPath, content, "utf8");

console.log("");
console.log("Menú reorganizado.");
console.log("Respaldo creado en:");
console.log(backupPath);
console.log("");
console.log("Ahora ejecuta: npm run build");