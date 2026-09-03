export { HotspotController } from './HotspotController.js';
export { MockHotspotController } from './MockHotspotController.js';
export { WindowsHotspotController } from './WindowsHotspotController.js';
export { CaptivePortalController } from './CaptivePortalController.js';

import { MockHotspotController } from './MockHotspotController.js';
import { WindowsHotspotController } from './WindowsHotspotController.js';
import { CaptivePortalController } from './CaptivePortalController.js';

export function createHotspotController(mode = 'mock') {
  if (mode === 'windows' && process.platform === 'win32') {
    return new WindowsHotspotController();
  }
  return new MockHotspotController();
}

export const defaultHotspotController = createHotspotController('mock');
export const defaultCaptivePortalController = new CaptivePortalController();
