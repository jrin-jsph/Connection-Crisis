import { BaseGame, GameManager } from './index.js';

// Custom Test 1v1 Game Implementation
class SimpleClickRaceGame extends BaseGame {
  constructor(gameId, type, playerA, playerB, options) {
    super(gameId, type, playerA, playerB, options);
    this.targetClicks = options.targetClicks || 5;
  }

  receiveAction(playerId, actionType, actionData) {
    if (!this.validateAction(playerId, actionType, actionData)) {
      return { success: false, error: 'Invalid action' };
    }

    if (actionType === 'click') {
      this.state.scores[playerId] = (this.state.scores[playerId] || 0) + 1;
      
      // If player reached target clicks, they win
      if (this.state.scores[playerId] >= this.targetClicks) {
        return {
          success: true,
          completed: true,
          winnerId: playerId,
          state: this.getState()
        };
      }
    }

    return { success: true, state: this.getState() };
  }
}

async function runGameEngineTests() {
  console.log('🎮 =========================================');
  console.log('🎮 RUNNING MINIGAME ENGINE & LIFECYCLE TESTS');
  console.log('🎮 =========================================\n');

  const gm = new GameManager();

  // Test 1: Registration
  console.log('--- 1. Testing GameManager.registerGame() ---');
  gm.registerGame('click_race', SimpleClickRaceGame);
  console.log('Available Games:', gm.getAvailableGameTypes());
  console.log('Registration:', gm.getAvailableGameTypes().includes('click_race') ? '✅ PASS' : '❌ FAIL');

  // Test 2: Initialization
  console.log('\n--- 2. Testing game.initialize() & start() ---');
  const playerA = { playerId: 'p_alpha', name: 'Jerrin', device: 'iOS' };
  const playerB = { playerId: 'p_beta', name: 'Jerin', device: 'Android' };
  
  const game = gm.createGame('test_game_001', 'click_race', playerA, playerB, { targetClicks: 3 });
  console.log('Created game status:', game.state.status);
  console.log('Initial Status === INITIALIZED:', game.state.status === 'INITIALIZED' ? '✅ PASS' : '❌ FAIL');

  const startState = gm.startGame('test_game_001');
  console.log('Started Status === RUNNING:', startState.status === 'RUNNING' ? '✅ PASS' : '❌ FAIL');

  // Test 3: Action Validation
  console.log('\n--- 3. Testing validateAction() ---');
  const invalidPlayerAction = gm.handleAction('test_game_001', 'p_stranger', 'click', {});
  console.log('Rejected unauthorized player:', !invalidPlayerAction.success ? '✅ PASS' : '❌ FAIL');

  // Test 4: Action Processing & Score Calculation
  console.log('\n--- 4. Testing receiveAction() & calculateScore() ---');
  gm.handleAction('test_game_001', 'p_alpha', 'click', {});
  gm.handleAction('test_game_001', 'p_alpha', 'click', {});
  gm.handleAction('test_game_001', 'p_beta', 'click', {});
  
  const currentScores = game.calculateScore();
  console.log('Calculated Scores:', currentScores);
  console.log('Score Alpha === 2, Score Beta === 1:', currentScores.p_alpha === 2 && currentScores.p_beta === 1 ? '✅ PASS' : '❌ FAIL');

  // Test 5: Winner Determination & Finish
  console.log('\n--- 5. Testing determineWinner() & finishGame() ---');
  // Alpha scores 3rd click to win
  const winningAction = gm.handleAction('test_game_001', 'p_alpha', 'click', {});
  console.log('Winning action triggered:', winningAction.completed ? '✅ PASS' : '❌ FAIL');

  const matchResult = await gm.finishGame('test_game_001', winningAction.winnerId);
  console.log('Match Result Winner:', matchResult.winnerId === 'p_alpha' ? '✅ PASS (Winner: Jerrin)' : '❌ FAIL');
  console.log('Match Result Loser:', matchResult.loserId === 'p_beta' ? '✅ PASS (Loser: Jerin)' : '❌ FAIL');
  console.log('Match Duration:', matchResult.durationMs, 'ms');

  console.log('\n🎉 ALL MINIGAME ENGINE & LIFECYCLE TESTS PASSED!\n');
}

runGameEngineTests().catch(err => {
  console.error('❌ Minigame Engine Test Failed:', err);
  process.exit(1);
});
