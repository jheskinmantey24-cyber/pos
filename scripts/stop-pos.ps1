$ErrorActionPreference = 'Stop'

$port = 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    foreach ($connection in $connections) {
        if ($connection.OwningProcess) {
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

$mysql = Get-Process mysqld -ErrorAction SilentlyContinue
if ($mysql) {
    Stop-Process -Id $mysql.Id -Force -ErrorAction SilentlyContinue
}

Write-Host 'JESKIN POS and MySQL were stopped.'
