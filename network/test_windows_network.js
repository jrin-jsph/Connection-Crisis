import { detectNetworkInterfaces, getWindowsWifiStatus, getHotspotGuidance } from './windowsNetwork.js';

async function testWindowsNetworkModule() {
  console.log('📡 ===============================================');
  console.log('📡 RUNNING WINDOWS NETWORK INTEGRATION TEST');
  console.log('📡 ===============================================\n');

  // 1. Test Network Interface Detection
  console.log('--- 1. Testing Interface Detection & Priority Sorting ---');
  const netInfo = detectNetworkInterfaces(5173, 3001);
  console.log(`   - Primary Host IP: ${netInfo.primaryIp} (${netInfo.primaryType})`);
  console.log(`   - Primary Interface: ${netInfo.primaryInterface}`);
  console.log(`   - Client Join URL: ${netInfo.playerUrl}`);
  console.log(`   - Backend Server URL: ${netInfo.backendUrl}`);
  console.log(`   - Total Active IPv4 Interfaces: ${netInfo.detectedCount}`);

  if (!netInfo.primaryIp || !netInfo.playerUrl.includes('5173')) {
    throw new Error('Network interface detection failed');
  }
  console.log('✅ 1. Network Interface Discovery Passed!\n');

  // 2. Test Wi-Fi Status Query
  console.log('--- 2. Testing Windows Wi-Fi Interface Status ---');
  const wifiStatus = await getWindowsWifiStatus();
  console.log('   - Platform:', wifiStatus.platform);
  console.log('   - Supported:', wifiStatus.supported);
  if (wifiStatus.supported) {
    console.log(`   - Wi-Fi Connected: ${wifiStatus.wifiConnected}`);
    console.log(`   - Connected SSID: ${wifiStatus.ssid}`);
    console.log(`   - Hosted Network Supported: ${wifiStatus.hostedNetworkSupported}`);
  }
  console.log('✅ 2. Wi-Fi Status Query Passed!\n');

  // 3. Test Hotspot Setup & Fallback Guidance
  console.log('--- 3. Testing Hotspot Guidance & Fallback Instructions ---');
  const guidance = getHotspotGuidance();
  console.log(`   - Recommended Method: "${guidance.recommendedMethod}"`);
  console.log(`   - Total Guidance Methods: ${guidance.steps.length}`);
  console.log(`   - Troubleshooting Items: ${guidance.troubleshooting.length}`);

  if (guidance.steps.length < 3) {
    throw new Error('Incomplete hotspot fallback instructions');
  }
  console.log('✅ 3. Hotspot Guidance Content Passed!\n');

  console.log('🎉 ALL WINDOWS NETWORK INTEGRATION TESTS PASSED!\n');
  process.exit(0);
}

testWindowsNetworkModule().catch(err => {
  console.error('❌ Windows Network Test Failed:', err);
  process.exit(1);
});
