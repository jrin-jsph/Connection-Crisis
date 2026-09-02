// Network module root
// Provides HotspotController interfaces and detection abstractions

export class BaseHotspotController {
  constructor() {
    this.name = 'BaseHotspotController';
  }

  async getConnectedDevices() {
    return [];
  }

  async isDeviceConnected(deviceId) {
    return false;
  }

  async requestDisconnection(deviceId) {
    return { success: false, message: 'Not implemented on base controller' };
  }

  getStatus() {
    return { isAvailable: false, type: 'base' };
  }
}

export class MockHotspotController extends BaseHotspotController {
  constructor() {
    super();
    this.name = 'MockHotspotController';
    this.simulatedDevices = new Map();
  }

  async getConnectedDevices() {
    return Array.from(this.simulatedDevices.values());
  }

  async isDeviceConnected(deviceId) {
    return this.simulatedDevices.has(deviceId);
  }

  async requestDisconnection(deviceId) {
    const existed = this.simulatedDevices.delete(deviceId);
    return { success: existed, message: existed ? 'Device disconnected in mock network' : 'Device not found' };
  }

  getStatus() {
    return { isAvailable: true, type: 'mock', deviceCount: this.simulatedDevices.size };
  }
}
