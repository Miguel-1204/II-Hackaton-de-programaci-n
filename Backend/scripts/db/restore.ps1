[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,

  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$composeFile = Join-Path $repositoryRoot 'compose.yaml'
$backupPath = (Resolve-Path -LiteralPath $BackupFile).Path
$remoteName = "kaotrace-restore-$([guid]::NewGuid().ToString('N')).dump"
$remotePath = "/tmp/$remoteName"
$compose = @('compose', '--project-directory', $repositoryRoot, '-f', $composeFile)

if ((Get-Item -LiteralPath $backupPath).Length -eq 0) {
  throw 'El archivo de respaldo está vacío.'
}
if (-not $Force -and -not $PSCmdlet.ShouldProcess(
  'la base de datos PostgreSQL configurada en Compose',
  "reemplazar sus objetos con el respaldo $backupPath"
)) {
  return
}

try {
  & docker @compose cp $backupPath "postgres:$remotePath"
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el respaldo al contenedor PostgreSQL.' }

  & docker @compose exec -T postgres sh -c 'pg_restore --clean --if-exists --no-owner --no-acl --single-transaction --exit-on-error --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" "$1"' kaotrace-restore $remotePath
  if ($LASTEXITCODE -ne 0) { throw 'La restauración falló; PostgreSQL revirtió la transacción.' }
  Write-Output 'Restauración completada.'
}
finally {
  & docker @compose exec -T postgres rm -f $remotePath 2>$null | Out-Null
}
