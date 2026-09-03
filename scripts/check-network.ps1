<#
.SYNOPSIS
    Connection Crisis - Network Diagnostic & Port Checker
#>

Write-Host "🔍 ==========================================================" -ForegroundColor Cyan
Write-Host "🔍 CONNECTION CRISIS - NETWORK HEALTH DIAGNOSTICS" -ForegroundColor Yellow
Write-Host "🔍 ==========================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js Ports
$port3001 = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue

Write-Host "📡 Service Port Status:" -ForegroundColor White
if ($port3001) {
    Write-Host "   ✅ Backend Server (Port 3001): LISTENING" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Backend Server (Port 3001): NOT RUNNING" -ForegroundColor Red
}

if ($port5173) {
    Write-Host "   ✅ Frontend Vite (Port 5173):  LISTENING" -ForegroundColor Green
} else {
    Write-Host "   ⚠️ Frontend Vite (Port 5173):  NOT RUNNING" -ForegroundColor Red
}

Write-Host ""
Write-Host "🌐 Active IPv4 Interfaces:" -ForegroundColor White
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet" } | ForEach-Object {
    Write-Host "   - $($_.InterfaceAlias): $($_.IPAddress) (PrefixLength: $($_.PrefixLength))" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🔥 Firewall Tips:" -ForegroundColor Yellow
Write-Host "   If phones cannot load http://<IP>:5173, run in Admin PowerShell:" -ForegroundColor Gray
Write-Host "   New-NetFirewallRule -DisplayName 'Connection Crisis Vite' -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow" -ForegroundColor DarkCyan
Write-Host "   New-NetFirewallRule -DisplayName 'Connection Crisis Server' -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow" -ForegroundColor DarkCyan
Write-Host ""
