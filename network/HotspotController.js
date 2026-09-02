/**
 * Base Abstract HotspotController
 * Standard interface for device discovery and connection management.
 */
export class HotspotController {
  constructor(name = 'BaseHotspotController') {
    this.name = name;
  }

  /**
   * Detect and return list of currently connected devices.
   * @returns {Promise<Array<{ deviceId: string, ip: string, mac: string, hostname?: string, connectedAt: string, deviceType?: string }>>}
   */
  async getConnectedDevices() {
    throw new Error('getConnectedDevices() must be implemented by subclass');
  }

  /**
   * Get metadata for a specific device.
   * @param {string} deviceId
   * @returns {Promise<Object|null>}
   */
  async getDeviceInfo(deviceId) {
    throw new Error('getDeviceInfo() must be implemented by subclass');
  }

  /**
   * Check whether a device is currently connected.
   * @param {string} deviceId
   * @returns {Promise<boolean>}
   */
  async isDeviceConnected(deviceId) {
    throw new Error('isDeviceConnected() must be implemented by subclass');
  }

  /**
   * Request a device disconnection from the Wi-Fi network.
   * @param {string} deviceId
   * @returns {Promise<{ success: boolean, message: string, code?: string }>}
   */
  async requestDisconnection(deviceId) {
    throw new Error('requestDisconnection() must be implemented by subclass');
  }

  /**
   * Get overall network and controller status.
   * @returns {Object}
   */
  getStatus() {
    return {
      type: this.name,
      isAvailable: false,
      capabilities: {
        deviceDetection: false,
        deviceInfo: false,
        forceDisconnection: false
      }
    };
  }
}
