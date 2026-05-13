$path = "src\App.jsx"

if (-not (Test-Path $path)) {
  throw "No encontré src\App.jsx. Verifica que estés en C:\Users\raul_\Desktop\dashboard-medico-sos"
}

if (-not (Test-Path "src\PreemploymentMedicalExamModule.jsx")) {
  throw "No encontré src\PreemploymentMedicalExamModule.jsx."
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup = "src\App_backup_before_examen_ingreso_$timestamp.jsx"

Copy-Item $path $backup

$content = Get-Content $path -Raw

$importLine = 'import PreemploymentMedicalExamModule from "./PreemploymentMedicalExamModule.jsx";'

if ($content -notmatch 'PreemploymentMedicalExamModule') {
  $imports = [regex]::Matches($content, '(?m)^import .+;$')

  if ($imports.Count -eq 0) {
    throw "No encontré imports en App.jsx."
  }

  $lastImport = $imports[$imports.Count - 1]
  $insertAt = $lastImport.Index + $lastImport.Length
  $content = $content.Insert($insertAt, "`r`n$importLine")
}

$navItem = '  { id: "ingreso", label: "Examen ingreso", subtitle: "Historia clínica ocupacional" },'

if ($content -notmatch 'id:\s*"ingreso"') {
  $navPattern = '(const\s+navItems\s*=\s*\[\s*)'

  if ($content -notmatch $navPattern) {
    throw "No encontré const navItems = [ en App.jsx."
  }

  $content = [regex]::Replace(
    $content,
    $navPattern,
    "`$1`r`n$navItem`r`n",
    1
  )
}

$renderBlock = @'
{activeModule === "ingreso" && (
  <PreemploymentMedicalExamModule
    session={session}
    userRole={userRole}
    companies={companies}
    plants={plants}
  />
)}
'@

if ($content -notmatch 'activeModule\s*===\s*"ingreso"') {
  $anchors = @(
    '{activeModule === "antidoping" && (',
    '{activeModule === "cronicos" && (',
    '{activeModule === "inventario" && (',
    '{activeModule === "reportes" && ('
  )

  $foundAnchor = $null

  foreach ($anchor in $anchors) {
    if ($content.Contains($anchor)) {
      $foundAnchor = $anchor
      break
    }
  }

  if ($null -eq $foundAnchor) {
    throw "No encontré dónde insertar el módulo en el render de App.jsx."
  }

  $content = $content.Replace($foundAnchor, $renderBlock + "`r`n" + $foundAnchor)
}

Set-Content $path $content -Encoding UTF8

Write-Host ""
Write-Host "LISTO: Se conectó Examen ingreso en src\App.jsx"
Write-Host "RESPALDO: $backup"
Write-Host ""
Write-Host "Ahora ejecuta: npm run dev"