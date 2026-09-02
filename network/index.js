export { HotspotController } from './HotspotController.js';
export { MockHotspotController } from './MockHotspotController.js';
export { WindowsHotspotController } from './WindowsHotspotController.js';

import { MockHotspotController } from './MockHotspotController.js';
import { WindowsHotspotController } from './WindowsHotspotController.js';

/**
 * Factory to create the preferred HotspotController instance.
 * Defaults to MockHotspotController as requested in Step 6.
 */
export function createHotspotController(mode = 'mock') {
  if (mode === 'windows' && process.platform === 'win32') {
    return new WindowsHotspotController();
  }
  return new MockHotspotController();
}

export const defaultHotspotController = createHotspotController('mock');
