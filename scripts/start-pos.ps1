$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$mysqlBinary = 'C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe'
$mysqlBase = 'C:\Program Files\MySQL\MySQL Server 8.4'
$mysqlDataDir = Join-Path $projectRoot 'mysql-data'

if (-not (Test-Path $mysqlBinary)) {
    throw "MySQL server binary was not found at $mysqlBinary. Please check your MySQL installation."
}

$port = 3000
$existing = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($existing) {
    foreach ($connection in $existing) {
        if ($connection.OwningProcess) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

if (-not (Get-Process mysqld -ErrorAction SilentlyContinue)) {
    Start-Process -FilePath $mysqlBinary -ArgumentList @('--console', "--datadir=$mysqlDataDir", "--basedir=$mysqlBase") -NoNewWindow -WorkingDirectory $projectRoot
}

Start-Sleep -Seconds 2
Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList @((Join-Path $projectRoot 'server.js')) -WorkingDirectory $projectRoot -NoNewWindow

Write-Host 'JESKIN POS is starting...'
Write-Host "Open http://localhost:$port/login.html"
