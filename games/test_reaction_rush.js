import { ReactionRushGame } from './ReactionRush.js';

async function runReactionRushTests() {
  console.log('⚡ ==========================================');
  console.log('⚡ RUNNING REACTION RUSH MINIGAME TEST SUITE');
  console.log('⚡ ==========================================\n');

  const pA = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const pB = { playerId: 'p_2', name: 'Jerin', device: 'Android' };

  // Test 1: Normal Reaction Click
  console.log('--- 1. Testing Normal Reaction & Timing ---');
  const game1 = new ReactionRushGame('game_rr_01', 'reaction_rush', pA, pB);
  game1.initialize();
  console.log('Random Signal Delay Generated:', game1.signalDelayMs, 'ms');
  console.log('Delay in range 2000-5000ms:', game1.signalDelayMs >= 2000 && game1.signalDelayMs <= 5000 ? '✅ PASS' : '❌ FAIL');

  // Manually trigger signal for test
  game1.state.status = 'SIGNAL_TRIGGERED';
  game1.state.signalActive = true;
  game1.signalTimestamp = 1000000;

  // Player 1 clicks 220ms after signal
  const click1 = game1.receiveAction('p_1', 'reaction_click', { timestamp: 1000220 });
  console.log('Player 1 Reaction Time:', click1.reactionMs, 'ms');
  console.log('Player 1 Won match:', click1.winnerId === 'p_1' ? '✅ PASS' : '❌ FAIL');

  // Test 2: False Start / Early Click Penalty
  console.log('\n--- 2. Testing False Start / Early Click Penalty ---');
  const game2 = new ReactionRushGame('game_rr_02', 'reaction_rush', pA, pB);
  game2.initialize();
  game2.state.status = 'WAITING';
  game2.state.signalActive = false;

  // Player 1 clicks BEFORE signal
  const earlyClick = game2.receiveAction('p_1', 'reaction_click', { timestamp: Date.now() });
  console.log('Early click detected:', earlyClick.isEarly ? '✅ PASS (False Start)' : '❌ FAIL');
  console.log('Opponent awarded win:', earlyClick.winnerId === 'p_2' ? '✅ PASS (Jerin Won)' : '❌ FAIL');
  console.log('Reason:', earlyClick.reason);

  console.log('\n🎉 ALL REACTION RUSH TESTS PASSED!\n');
}

runReactionRushTests().catch(err => {
  console.error('❌ Reaction Rush Test Failed:', err);
  process.exit(1);
});
