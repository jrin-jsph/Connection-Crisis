<#
.SYNOPSIS
    Connection Crisis - Windows Mobile Hotspot & Host Network Helper
.DESCRIPTION
    Launches Windows Mobile Hotspot settings, verifies Wi-Fi network interfaces,
    and displays the direct player URL for zero-install browser connections.
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🎮 CONNECTION CRISIS - WINDOWS NETWORK & HOTSPOT SETUP" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Open Windows Mobile Hotspot Settings page directly
Write-Host "📡 Step 1: Opening Windows Mobile Hotspot Settings..." -ForegroundColor Green
try {
    Start-Process "ms-settings:network-mobilehotspot"
    Write-Host "   -> Windows Mobile Hotspot Settings opened." -ForegroundColor Gray
} catch {
    Write-Host "   -> Could not open ms-settings:network-mobilehotspot directly." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "📡 Step 2: Checking Local Network Adapters..." -ForegroundColor Green

# 2. Inspect active IPv4 network addresses
$ipAddresses = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch "Loopback|vEthernet|Pseudo" -and $_.IPAddress -ne "127.0.0.1" }

$hotspotIp = $null
$wifiIp = $null

foreach ($ip in $ipAddresses) {
    if ($ip.IPAddress -like "192.168.137.*" -or $ip.InterfaceAlias -match "Hotspot|Direct") {
        $hotspotIp = $ip.IPAddress
        Write-Host "   [🔥 HOTSPOT DETECTED] $($ip.InterfaceAlias) -> $($ip.IPAddress)" -ForegroundColor Magenta
    } elseif ($ip.InterfaceAlias -match "Wi-Fi|Wireless|WLAN") {
        $wifiIp = $ip.IPAddress
        Write-Host "   [📶 WI-FI ADAPTER]    $($ip.InterfaceAlias) -> $($ip.IPAddress)" -ForegroundColor Cyan
    } else {
        Write-Host "   [🔌 LAN ADAPTER]      $($ip.InterfaceAlias) -> $($ip.IPAddress)" -ForegroundColor White
    }
}

$chosenIp = if ($hotspotIp) { $hotspotIp } elseif ($wifiIp) { $wifiIp } else { ($ipAddresses | Select-Object -First 1).IPAddress }

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🎉 PLAYER CONNECTION URL (Share with players on the Wi-Fi):" -ForegroundColor Yellow
Write-Host ""
if ($chosenIp) {
    Write-Host "   👉 Client Web App: http://${chosenIp}:5173" -ForegroundColor Green
    Write-Host "   👉 Backend Server: http://${chosenIp}:3001" -ForegroundColor Gray
} else {
    Write-Host "   👉 Localhost Fallback: http://localhost:5173" -ForegroundColor Yellow
}
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 INSTRUCTIONS FOR PLAYERS:" -ForegroundColor White
Write-Host "1. Connect your phone to this laptop's Wi-Fi / Hotspot network." -ForegroundColor Gray
Write-Host "2. Open Safari or Chrome on your phone." -ForegroundColor Gray
Write-Host "3. Type the URL above into your phone browser." -ForegroundColor Gray
Write-Host "4. Enter your moniker to join the game instantly with NO app install!" -ForegroundColor Gray
Write-Host ""
