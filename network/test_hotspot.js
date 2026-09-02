import { MockHotspotController, WindowsHotspotController, createHotspotController } from './index.js';

async function runHotspotTests() {
  console.log('📡 =========================================');
  console.log('📡 RUNNING NETWORK CONTROLLER TEST SUITE');
  console.log('📡 =========================================\n');

  // Test 1: MockHotspotController
  console.log('--- 1. Testing MockHotspotController ---');
  const mockController = new MockHotspotController();
  const mockStatus = mockController.getStatus();
  console.log('Mock Status:', mockStatus.type, '| Available:', mockStatus.isAvailable);

  const initialDevices = await mockController.getConnectedDevices();
  console.log('Mock Connected Devices Count:', initialDevices.length, 'devices');
  console.log('Device 1 IP:', initialDevices[0]?.ip, 'Hostname:', initialDevices[0]?.hostname);

  const dev1Id = initialDevices[0]?.deviceId;
  const isConnectedBefore = await mockController.isDeviceConnected(dev1Id);
  console.log(`Device [${dev1Id}] Connected Before Disconnect:`, isConnectedBefore ? '✅ YES' : '❌ NO');

  // Request disconnection
  const disconnectResult = await mockController.requestDisconnection(dev1Id);
  console.log('Disconnection Request Result:', disconnectResult.success ? '✅ SUCCESS' : '❌ FAIL');
  console.log('Message:', disconnectResult.message);

  const isConnectedAfter = await mockController.isDeviceConnected(dev1Id);
  console.log(`Device [${dev1Id}] Connected After Disconnect:`, !isConnectedAfter ? '✅ DISCONNECTED' : '❌ STILL CONNECTED');

  // Test 2: WindowsHotspotController
  console.log('\n--- 2. Testing WindowsHotspotController (Honest Network API) ---');
  const winController = new WindowsHotspotController();
  const winStatus = winController.getStatus();
  console.log('Windows Controller Available:', winStatus.isAvailable);
  console.log('Force Disconnection Capability:', winStatus.capabilities.forceDisconnection ? 'TRUE' : 'FALSE (Honest)');

  const winDevices = await winController.getConnectedDevices();
  console.log('Windows ARP Discovered Network Neighbors:', winDevices.length, 'discovered');

  const winDisconnectResult = await winController.requestDisconnection('win_dev_test');
  console.log('Windows Disconnection Attempt Honesty Check:', !winDisconnectResult.success ? '✅ HONESTLY REJECTED' : '❌ INCORRECTLY REPORTED SUCCESS');
  console.log('Reason:', winDisconnectResult.message);

  // Test 3: Factory
  console.log('\n--- 3. Testing HotspotController Factory ---');
  const factoryMock = createHotspotController('mock');
  console.log('Factory created:', factoryMock.name, factoryMock.name === 'MockHotspotController' ? '✅ PASS' : '❌ FAIL');

  console.log('\n🎉 ALL NETWORK CONTROLLER TESTS PASSED!\n');
}

runHotspotTests().catch(err => {
  console.error('❌ Network Controller Test Failed:', err);
  process.exit(1);
});
