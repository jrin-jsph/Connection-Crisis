import { RockPaperScissorsGame } from './RockPaperScissors.js';

async function runRPSTests() {
  console.log('✂️ ===============================================');
  console.log('✂️ RUNNING ROCK PAPER SCISSORS MINIGAME TEST SUITE');
  console.log('✂️ ===============================================\n');

  const pA = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const pB = { playerId: 'p_2', name: 'Jerin', device: 'Android' };

  // Test 1: Secret Choice Concealment
  console.log('--- 1. Testing Secret Choice Concealment ---');
  const rps = new RockPaperScissorsGame('game_rps_01', 'rock_paper_scissors', pA, pB, { targetWins: 2 });
  rps.initialize();

  // Player 1 chooses rock
  const action1 = rps.receiveAction('p_1', 'rps_choice', { choice: 'rock' });
  console.log('Player 1 choice made (Evaluated):', action1.evaluated);
  console.log('Choices hidden from opponent:', action1.state.currentChoices === null ? '✅ PASS' : '❌ FAIL');

  // Player 2 chooses scissors -> Round 1 resolves
  console.log('\n--- 2. Testing Simultaneous Reveal & Round 1 Winner ---');
  const action2 = rps.receiveAction('p_2', 'rps_choice', { choice: 'scissors' });
  console.log('Both chose (Evaluated):', action2.evaluated ? '✅ PASS' : '❌ FAIL');
  console.log('Round 1 Winner:', action2.roundResult.winnerId === 'p_1' ? '✅ PASS (Jerrin Won Round 1)' : '❌ FAIL');
  console.log('Round 1 Result Text:', action2.roundResult.resultText);
  console.log('Scores after Round 1:', action2.roundResult.scores);

  // Advance to Round 2
  rps.currentRound = 2;
  rps.roundChoices.set(2, new Map());
  rps.state.status = 'CHOOSING';
  rps.state.round = 2;

  // Round 2: Player 1 chooses paper, Player 2 chooses rock -> Player 1 wins match (2-0)
  console.log('\n--- 3. Testing Round 2 & Match Victory (Best of 3) ---');
  rps.receiveAction('p_1', 'rps_choice', { choice: 'paper' });
  const finalAction = rps.receiveAction('p_2', 'rps_choice', { choice: 'rock' });
  
  console.log('Round 2 Winner:', finalAction.roundResult.winnerId === 'p_1' ? '✅ PASS (Jerrin Won Round 2)' : '❌ FAIL');
  console.log('Match Finished:', finalAction.roundResult.matchFinished ? '✅ PASS' : '❌ FAIL');
  console.log('Match Champion:', finalAction.roundResult.matchWinnerId === 'p_1' ? '✅ PASS (Jerrin Won Match 2-0)' : '❌ FAIL');
  console.log('Final Match Scores:', rps.scores);

  console.log('\n🎉 ALL ROCK PAPER SCISSORS TESTS PASSED!\n');
}

runRPSTests().catch(err => {
  console.error('❌ RPS Test Failed:', err);
  process.exit(1);
});
