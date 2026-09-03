import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Windows Network Discovery & Hotspot Manager
 */

/**
 * Detect all active network interfaces and identify the best player-facing IP.
 * Priority:
 * 1. Windows Mobile Hotspot adapter (192.168.137.x or Virtual Adapter)
 * 2. Active Local Wi-Fi (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
 * 3. Ethernet / LAN adapter
 * 4. Localhost fallback (127.0.0.1)
 */
export function detectNetworkInterfaces(port = 5173, backendPort = 3001) {
  const interfaces = os.networkInterfaces();
  const detected = [];

  for (const name of Object.keys(interfaces)) {
    const isVirtual = /virtual|vEthernet|Loopback|WSL|Pseudo/i.test(name);
    const isHotspotName = /hotspot|hosted|direct|wi-fi direct/i.test(name);

    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        const isHotspotSubnet = net.address.startsWith('192.168.137.');
        const isStandardLocal = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/.test(net.address);

        let priority = 3; // Standard LAN
        let type = 'LAN / Ethernet';

        if (isHotspotSubnet || isHotspotName) {
          priority = 1; // Top priority: Windows Mobile Hotspot
          type = 'Windows Mobile Hotspot';
        } else if (/wi-fi|wlan|wireless/i.test(name)) {
          priority = 2; // Second priority: Wi-Fi adapter
          type = 'Wi-Fi Network';
        } else if (isStandardLocal) {
          priority = 3;
          type = 'Local Network';
        }

        detected.push({
          interfaceName: name,
          ip: net.address,
          netmask: net.netmask,
          mac: net.mac,
          type,
          isHotspot: isHotspotSubnet || isHotspotName,
          isVirtual,
          priority,
          playerUrl: `http://${net.address}:${port}`,
          backendUrl: `http://${net.address}:${backendPort}`
        });
      }
    }
  }

  // Sort by priority ascending (1 = Hotspot, 2 = Wi-Fi, 3 = LAN)
  detected.sort((a, b) => a.priority - b.priority);

  const primary = detected[0] || {
    interfaceName: 'Loopback',
    ip: '127.0.0.1',
    type: 'Localhost',
    isHotspot: false,
    playerUrl: `http://localhost:${port}`,
    backendUrl: `http://localhost:${backendPort}`
  };

  return {
    primaryIp: primary.ip,
    primaryInterface: primary.interfaceName,
    primaryType: primary.type,
    isHotspotActive: primary.isHotspot || detected.some(d => d.isHotspot),
    playerUrl: primary.playerUrl,
    backendUrl: primary.backendUrl,
    interfaces: detected,
    detectedCount: detected.length,
    timestamp: new Date().toISOString()
  };
}

/**
 * Checks Windows Wi-Fi and hotspot status via netsh.
 */
export async function getWindowsWifiStatus() {
  if (process.platform !== 'win32') {
    return { platform: process.platform, supported: false };
  }

  try {
    const { stdout: wlanOut } = await execAsync('netsh wlan show interfaces');
    const { stdout: hostedOut } = await execAsync('netsh wlan show hostednetwork').catch(() => ({ stdout: '' }));

    const isConnected = /State\s*:\s*connected/i.test(wlanOut);
    const ssidMatch = wlanOut.match(/SSID\s*:\s*(.+)/i);
    const radioMatch = wlanOut.match(/Radio status\s*:\s*(.+)/i);

    return {
      platform: 'win32',
      supported: true,
      wifiConnected: isConnected,
      ssid: ssidMatch ? ssidMatch[1].trim() : 'Unknown',
      hostedNetworkSupported: !/Hosted network supported\s*:\s*No/i.test(hostedOut),
      hostedNetworkStatus: /Status\s*:\s*Started/i.test(hostedOut) ? 'Started' : 'Not Started'
    };
  } catch (err) {
    return {
      platform: 'win32',
      supported: true,
      error: err.message
    };
  }
}

/**
 * Comprehensive Setup & Fallback Guidance for Host
 */
export function getHotspotGuidance() {
  return {
    recommendedMethod: 'Windows 10/11 Mobile Hotspot',
    steps: [
      {
        title: 'Method 1: Windows Mobile Hotspot (Recommended)',
        instructions: [
          '1. Press Windows Key + I to open Windows Settings.',
          '2. Navigate to Network & internet -> Mobile hotspot.',
          '3. Toggle Mobile hotspot to ON.',
          '4. Set Network Name (SSID) to "ConnectionCrisis" and password to "crisis1234".',
          '5. Tell players to connect their phones to the "ConnectionCrisis" Wi-Fi network.',
          '6. Players open their browser and visit the displayed URL.'
        ]
      },
      {
        title: 'Method 2: Phone Hotspot Fallback (No Windows Hotspot)',
        instructions: [
          '1. Turn on Personal Hotspot on your phone (iPhone or Android).',
          '2. Connect your Windows host laptop to that phone hotspot.',
          '3. Have all other player phones connect to the same phone hotspot.',
          '4. Players open their browser and visit your laptop\'s IP address.'
        ]
      },
      {
        title: 'Method 3: Local Wi-Fi Router / Home Wi-Fi',
        instructions: [
          '1. Ensure your laptop and all player phones are on the same Wi-Fi router network.',
          '2. Players open their phone browser and type the URL shown on the Host Dashboard.'
        ]
      }
    ],
    troubleshooting: [
      'Firewall: If phones cannot open the page, allow Node.js / Port 3001 and 5173 through Windows Defender Firewall.',
      'AP Isolation: Some corporate or public Wi-Fi networks block device-to-device communication. Use a Mobile Hotspot instead.',
      'Captive Portal: If phones prompt to sign in, use the IP directly (e.g. http://192.168.137.1:5173).'
    ]
  };
}
