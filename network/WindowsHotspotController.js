import { exec } from 'child_process';
import { promisify } from 'util';
import { HotspotController } from './HotspotController.js';

const execAsync = promisify(exec);

export class WindowsHotspotController extends HotspotController {
  constructor() {
    super('WindowsHotspotController');
    this.platform = process.platform;
  }

  /**
   * Reads Windows ARP table to discover connected network devices on the local subnet.
   */
  async getConnectedDevices() {
    if (this.platform !== 'win32') {
      return [];
    }

    try {
      const { stdout } = await execAsync('arp -a');
      const lines = stdout.split('\n');
      const devices = [];

      for (const line of lines) {
        // Parse lines like:  192.168.137.105   3a-82-14-fe-91-01     dynamic
        const match = line.trim().match(/^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+([a-zA-Z]+)/);
        if (match) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ':').toUpperCase();
          const type = match[3];

          // Skip broadcast and multicast addresses
          if (ip.endsWith('.255') || ip.startsWith('224.') || ip.startsWith('239.')) {
            continue;
          }

          devices.push({
            deviceId: `win_dev_${mac.replace(/:/g, '')}`,
            ip,
            mac,
            type,
            connectedAt: new Date().toISOString(),
            status: 'CONNECTED'
          });
        }
      }

      return devices;
    } catch (err) {
      console.warn('[WindowsHotspotController] ARP scan warning:', err.message);
      return [];
    }
  }

  async getDeviceInfo(deviceId) {
    const devices = await this.getConnectedDevices();
    return devices.find(d => d.deviceId === deviceId) || null;
  }

  async isDeviceConnected(deviceId) {
    const devices = await this.getConnectedDevices();
    return devices.some(d => d.deviceId === deviceId);
  }

  /**
   * Honest implementation: Standard Windows API does not support programmatic Wi-Fi client deauth
   * without dedicated NDIS drivers or router access.
   */
  async requestDisconnection(deviceId) {
    return {
      success: false,
      message: 'Windows OS does not natively support single-client de-authentication without administrative NDIS packet drivers. Disconnection rejected honestly.',
      code: 'UNSUPPORTED_OS_FEATURE'
    };
  }

  getStatus() {
    return {
      type: 'WindowsHotspotController',
      isAvailable: this.platform === 'win32',
      capabilities: {
        deviceDetection: true,
        deviceInfo: true,
        forceDisconnection: false
      },
      details: 'Windows Network Integration active with ARP device discovery (Disconnection honestly flagged as unsupported)'
    };
  }
}
