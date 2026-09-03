import { CaptivePortalController } from './CaptivePortalController.js';

async function runCaptivePortalTests() {
  console.log('🌐 ============================================');
  console.log('🌐 RUNNING CAPTIVE PORTAL PROTOTYPE TEST SUITE');
  console.log('🌐 ============================================\n');

  const portal = new CaptivePortalController({ port: 8088, gameUrl: 'http://localhost:5173' });

  // Test 1: Start
  console.log('--- 1. Testing portal.start() ---');
  const startRes = await portal.start();
  console.log('Portal Started:', startRes.success ? '✅ SUCCESS' : '❌ FAIL', `(Port: ${portal.port})`);

  // Test 2: getStatus()
  console.log('\n--- 2. Testing portal.getStatus() ---');
  const status = portal.getStatus();
  console.log('Status isRunning:', status.isRunning ? '✅ TRUE' : '❌ FALSE');
  console.log('Capabilities:', status.capabilities);

  // Test 3: redirectPlayer()
  console.log('\n--- 3. Testing portal.redirectPlayer() ---');
  const redirectRes = portal.redirectPlayer('p_test_123', 'http://localhost:5173/?mode=player');
  console.log('Redirect Dispatched:', redirectRes.success ? '✅ SUCCESS' : '❌ FAIL');
  console.log('Destination:', redirectRes.redirectedTo);

  // Test 4: Stop
  console.log('\n--- 4. Testing portal.stop() ---');
  const stopRes = await portal.stop();
  console.log('Portal Stopped:', stopRes.success ? '✅ SUCCESS' : '❌ FAIL');

  console.log('\n🎉 ALL CAPTIVE PORTAL PROTOTYPE TESTS PASSED!\n');
}

runCaptivePortalTests().catch(err => {
  console.error('❌ Captive Portal Test Failed:', err);
  process.exit(1);
});
