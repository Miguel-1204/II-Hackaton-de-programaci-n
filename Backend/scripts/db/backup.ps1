[CmdletBinding()]
param(
  [string]$Destination
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$composeFile = Join-Path $repositoryRoot 'compose.yaml'
$backupDirectory = Join-Path $repositoryRoot 'Backend\backups'
$remoteName = "kaotrace-$([guid]::NewGuid().ToString('N')).dump"
$remotePath = "/tmp/$remoteName"
$compose = @('compose', '--project-directory', $repositoryRoot, '-f', $composeFile)

if (-not $Destination) {
  New-Item -ItemType Directory -Path $backupDirectory -Force | Out-Null
  $Destination = Join-Path $backupDirectory "kaotrace-$(Get-Date -Format 'yyyyMMdd-HHmmss').dump"
}
$Destination = [IO.Path]::GetFullPath($Destination)
$destinationDirectory = Split-Path -Parent $Destination
if (-not (Test-Path -LiteralPath $destinationDirectory)) {
  New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
}
if (Test-Path -LiteralPath $Destination) {
  throw "El archivo de destino ya existe: $Destination"
}

try {
  & docker @compose exec -T postgres sh -c 'pg_dump --format=custom --no-owner --no-acl --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --file="$1"' kaotrace-backup $remotePath
  if ($LASTEXITCODE -ne 0) { throw 'pg_dump no pudo crear el respaldo.' }

  & docker @compose cp "postgres:$remotePath" $Destination
  if ($LASTEXITCODE -ne 0) { throw 'No se pudo copiar el respaldo al equipo.' }
  Write-Output "Respaldo creado: $Destination"
}
finally {
  & docker @compose exec -T postgres rm -f $remotePath 2>$null | Out-Null
}
