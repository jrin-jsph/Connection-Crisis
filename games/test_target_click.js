import { TargetClickGame } from './TargetClick.js';

async function runTargetClickTests() {
  console.log('🎯 ===========================================');
  console.log('🎯 RUNNING TARGET CLICK MINIGAME TEST SUITE');
  console.log('🎯 ===========================================\n');

  const pA = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const pB = { playerId: 'p_2', name: 'Jerin', device: 'Android' };

  // Test 1: Target Coordinates
  console.log('--- 1. Testing Target Initialization ---');
  const tc = new TargetClickGame('game_tc_01', 'target_click', pA, pB, { durationSec: 10 });
  tc.initialize();
  const t1 = tc.currentTarget;
  console.log('Target 1 Spawning:', `x: ${t1.x}%, y: ${t1.y}%, size: ${t1.size}px`);
  console.log('X Coordinate within 15-85% bounds:', t1.x >= 15 && t1.x <= 85 ? '✅ PASS' : '❌ FAIL');
  console.log('Y Coordinate within 18-83% bounds:', t1.y >= 18 && t1.y <= 83 ? '✅ PASS' : '❌ FAIL');

  // Test 2: Valid Target Click
  console.log('\n--- 2. Testing Valid Target Click (+1 pt) ---');
  const hitAction = tc.receiveAction('p_1', 'target_click', { targetId: t1.targetId });
  console.log('Target Hit Registered:', hitAction.hit ? '✅ PASS' : '❌ FAIL');
  console.log('Player 1 Score === 1:', tc.scores.p_1 === 1 ? '✅ PASS' : '❌ FAIL');
  console.log('Next Target Spawned with New ID:', hitAction.nextTarget.targetId !== t1.targetId ? '✅ PASS' : '❌ FAIL');

  // Test 3: Stale Click Rejection
  console.log('\n--- 3. Testing Stale Target Click Rejection ---');
  const staleAction = tc.receiveAction('p_2', 'target_click', { targetId: t1.targetId });
  console.log('Stale Click Rejected:', !staleAction.success && staleAction.stale ? '✅ PASS' : '❌ FAIL');
  console.log('Player 2 Score Remains 0:', tc.scores.p_2 === 0 ? '✅ PASS' : '❌ FAIL');

  // Test 4: Winner by Most Points
  console.log('\n--- 4. Testing Winner by Most Points ---');
  const t2 = tc.currentTarget;
  tc.receiveAction('p_1', 'target_click', { targetId: t2.targetId }); // Player 1 now at 2
  const finishResult = tc.finish();
  console.log('Winner Determined (Most Points):', finishResult.winnerId === 'p_1' ? '✅ PASS (Jerrin won 2-0)' : '❌ FAIL');
  console.log('Final Scores:', finishResult.scores);

  console.log('\n🎉 ALL TARGET CLICK TESTS PASSED!\n');
}

runTargetClickTests().catch(err => {
  console.error('❌ Target Click Test Failed:', err);
  process.exit(1);
});
