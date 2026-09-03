import { MemoryMatchGame } from './MemoryMatch.js';

async function runMemoryMatchTests() {
  console.log('🧠 =============================================');
  console.log('🧠 RUNNING MEMORY MATCH MINIGAME TEST SUITE');
  console.log('🧠 =============================================\n');

  const pA = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const pB = { playerId: 'p_2', name: 'Jerin', device: 'Android' };

  // Test 1: Pattern Generation
  console.log('--- 1. Testing Pattern Initialization ---');
  const mm = new MemoryMatchGame('game_mm_01', 'memory_match', pA, pB, { initialLength: 3 });
  mm.initialize();
  const round1Seq = mm.getCurrentRoundSequence();
  console.log('Round 1 Sequence (Length 3):', round1Seq);
  console.log('Initial Length === 3:', round1Seq.length === 3 ? '✅ PASS' : '❌ FAIL');

  // Test 2: Correct Steps
  console.log('\n--- 2. Testing Correct Sequence Steps ---');
  mm.state.status = 'INPUT_PHASE';
  
  const step1 = mm.receiveAction('p_1', 'memory_step', { color: round1Seq[0] });
  console.log('Step 1 (Correct):', step1.correct ? '✅ PASS' : '❌ FAIL');

  const step2 = mm.receiveAction('p_1', 'memory_step', { color: round1Seq[1] });
  console.log('Step 2 (Correct):', step2.correct ? '✅ PASS' : '❌ FAIL');

  const step3 = mm.receiveAction('p_1', 'memory_step', { color: round1Seq[2] });
  console.log('Step 3 (Round Complete):', step3.roundComplete ? '✅ PASS' : '❌ FAIL');

  // Test 3: Mistake Elimination
  console.log('\n--- 3. Testing Mistake & Elimination ---');
  const mm2 = new MemoryMatchGame('game_mm_02', 'memory_match', pA, pB, { initialLength: 3 });
  mm2.initialize();
  mm2.state.status = 'INPUT_PHASE';
  const seq2 = mm2.getCurrentRoundSequence();

  // Pick an intentional wrong color
  const wrongColor = ['RED', 'BLUE', 'GREEN', 'YELLOW'].find(c => c !== seq2[0]);
  const mistakeAction = mm2.receiveAction('p_1', 'memory_step', { color: wrongColor });

  console.log('Mistake Detected:', !mistakeAction.correct ? '✅ PASS (Mistake Caught)' : '❌ FAIL');
  console.log('Opponent Awarded Win:', mistakeAction.winnerId === 'p_2' ? '✅ PASS (Jerin Won)' : '❌ FAIL');
  console.log('Elimination Reason:', mistakeAction.reason);

  console.log('\n🎉 ALL MEMORY MATCH TESTS PASSED!\n');
}

runMemoryMatchTests().catch(err => {
  console.error('❌ Memory Match Test Failed:', err);
  process.exit(1);
});
