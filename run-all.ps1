$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Write-Host "Project root: $root"

# Try to start MongoDB Windows service if available
try {
    $mongoService = Get-Service | Where-Object {
        $_.Name -match 'mongo' -or $_.DisplayName -match 'Mongo'
    } | Select-Object -First 1

    if ($mongoService) {
        if ($mongoService.Status -ne 'Running') {
            Start-Service -Name $mongoService.Name
            Write-Host "Started MongoDB service: $($mongoService.Name)"
        } else {
            Write-Host "MongoDB service already running: $($mongoService.Name)"
        }
    } else {
        Write-Warning "MongoDB service not found. Start MongoDB manually if needed."
    }
} catch {
    Write-Warning "Could not start MongoDB service automatically: $($_.Exception.Message)"
}

$backendCmd = "Set-Location '$root/backend'; npm run dev"
$frontendCmd = "Set-Location '$root/frontend'; npm start"

$workspaceRoot = Split-Path $root -Parent
$venvActivate = Join-Path $workspaceRoot '.venv\Scripts\Activate.ps1'

if (Test-Path $venvActivate) {
    $yoloCmd = "Set-Location '$root/yolo-service'; & '$venvActivate'; python main.py"
} else {
    $yoloCmd = "Set-Location '$root/yolo-service'; python main.py"
}

Start-Process powershell -ArgumentList '-NoExit', '-Command', $backendCmd
Start-Process powershell -ArgumentList '-NoExit', '-Command', $frontendCmd
Start-Process powershell -ArgumentList '-NoExit', '-Command', $yoloCmd

Write-Host 'Started backend, frontend, and yolo-service in separate terminals.'
Write-Host "To run everything next time, use: .\run-all.ps1"
