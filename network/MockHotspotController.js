import { HotspotController } from './HotspotController.js';

export class MockHotspotController extends HotspotController {
  constructor() {
    super('MockHotspotController');
    this.devices = new Map();
    this.ssid = 'Connection-Crisis-Hotspot';
    this.initializedAt = new Date().toISOString();

    // Populate with default mock devices for testing
    this.registerMockDevice({
      deviceId: 'dev_mock_001',
      ip: '192.168.137.101',
      mac: '3A:82:14:FE:91:01',
      hostname: 'iPhone-15-Pro',
      deviceType: 'Apple iOS',
      rssi: -48
    });

    this.registerMockDevice({
      deviceId: 'dev_mock_002',
      ip: '192.168.137.102',
      mac: '5C:F9:38:A1:22:B8',
      hostname: 'Pixel-8',
      deviceType: 'Android OS',
      rssi: -54
    });
  }

  registerMockDevice(deviceInfo) {
    const deviceId = deviceInfo.deviceId || `dev_${Math.random().toString(36).substring(2, 8)}`;
    const fullDevice = {
      deviceId,
      ip: deviceInfo.ip || `192.168.137.${Math.floor(Math.random() * 150 + 100)}`,
      mac: deviceInfo.mac || this._generateMockMac(),
      hostname: deviceInfo.hostname || `Host-${deviceId.slice(-4)}`,
      deviceType: deviceInfo.deviceType || 'Mobile Device',
      connectedAt: deviceInfo.connectedAt || new Date().toISOString(),
      rssi: deviceInfo.rssi || -50,
      status: 'CONNECTED'
    };
    this.devices.set(deviceId, fullDevice);
    return fullDevice;
  }

  _generateMockMac() {
    return Array.from({ length: 6 }, () => 
      Math.floor(Math.random() * 256).toString(16).padStart(2, '0').toUpperCase()
    ).join(':');
  }

  async getConnectedDevices() {
    return Array.from(this.devices.values()).filter(d => d.status === 'CONNECTED');
  }

  async getDeviceInfo(deviceId) {
    return this.devices.get(deviceId) || null;
  }

  async isDeviceConnected(deviceId) {
    const device = this.devices.get(deviceId);
    return !!device && device.status === 'CONNECTED';
  }

  async requestDisconnection(deviceId) {
    if (!this.devices.has(deviceId)) {
      return {
        success: false,
        message: `Device [${deviceId}] not found in connected network list.`,
        code: 'DEVICE_NOT_FOUND'
      };
    }

    const device = this.devices.get(deviceId);
    device.status = 'DISCONNECTED';
    device.disconnectedAt = new Date().toISOString();

    return {
      success: true,
      message: `[MockHotspotController] Successfully disconnected ${device.hostname} (${device.ip}) from mock hotspot.`,
      device
    };
  }

  getStatus() {
    const connected = Array.from(this.devices.values()).filter(d => d.status === 'CONNECTED');
    return {
      type: 'MockHotspotController',
      isAvailable: true,
      ssid: this.ssid,
      connectedDeviceCount: connected.length,
      devices: connected,
      capabilities: {
        deviceDetection: true,
        deviceInfo: true,
        forceDisconnection: true
      },
      details: 'Mock Wi-Fi Hotspot Controller active with simulated device management'
    };
  }
}
