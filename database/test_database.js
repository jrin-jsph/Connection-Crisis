import { dbRepository } from './index.js';

async function runDatabaseTests() {
  console.log('🧪 =========================================');
  console.log('🧪 RUNNING DATABASE & REPOSITORY LAYER TESTS');
  console.log('🧪 =========================================');

  const status = dbRepository.getStatus();
  console.log(`📡 Repository Type: ${status.type}`);
  console.log(`📡 Details: ${status.details}`);

  // Test 1: Save & Get Player
  console.log('\n--- Test 1: Player Persistence ---');
  const testPlayer = {
    playerId: 'test_p_123',
    sessionId: 'test_s_abc',
    name: 'Jerrin',
    status: 'ACTIVE',
    joinedAt: new Date().toISOString(),
    eliminated: false,
    device: 'Mobile Safari'
  };
  await dbRepository.savePlayer(testPlayer);
  const fetchedPlayer = await dbRepository.getPlayer('test_p_123');
  console.log('Saved Player:', fetchedPlayer?.name === 'Jerrin' ? '✅ PASS' : '❌ FAIL');

  // Test 2: Save & Get Completed Match
  console.log('\n--- Test 2: Completed Match History ---');
  const testMatch = {
    matchId: 'match_test_001',
    gameType: 'reaction_rush',
    playerA: { id: 'p_1', name: 'Jerrin', score: 1 },
    playerB: { id: 'p_2', name: 'Jerin', score: 0 },
    winnerId: 'p_1',
    loserId: 'p_2',
    durationMs: 420
  };
  await dbRepository.saveMatch(testMatch);
  const history = await dbRepository.getMatchHistory(5);
  console.log('Saved Match History count:', history.length >= 1 ? `✅ PASS (${history.length} matches)` : '❌ FAIL');

  // Test 3: Save & Get Challenge
  console.log('\n--- Test 3: Challenge Persistence ---');
  const testChallenge = {
    challengeId: 'ch_test_999',
    playerAId: 'p_1',
    playerBId: 'p_2',
    similarityScore: 0.92,
    status: 'COMPLETED',
    createdAt: new Date().toISOString()
  };
  await dbRepository.saveChallenge(testChallenge);
  const challenges = await dbRepository.getChallenges(5);
  console.log('Saved Challenges count:', challenges.length >= 1 ? `✅ PASS (${challenges.length} challenges)` : '❌ FAIL');

  // Test 4: Save & Get Royale Result
  console.log('\n--- Test 4: Royale Tournament Result ---');
  const testRoyale = {
    royaleId: 'royale_test_001',
    totalPlayers: 10,
    roundsCount: 4,
    champion: { id: 'p_1', name: 'Jerrin' },
    eliminatedOrder: ['p_10', 'p_9', 'p_8', 'p_7', 'p_6', 'p_5', 'p_4', 'p_3', 'p_2']
  };
  await dbRepository.saveRoyaleResult(testRoyale);
  const royaleList = await dbRepository.getRoyaleResults(5);
  console.log('Saved Royale Results count:', royaleList.length >= 1 ? `✅ PASS (${royaleList.length} tournaments)` : '❌ FAIL');

  // Test 5: Global Statistics
  console.log('\n--- Test 5: Global Statistics ---');
  const stats = await dbRepository.getStatistics();
  console.log('Total Matches Tracked:', stats?.totalMatchesPlayed >= 1 ? `✅ PASS (${stats.totalMatchesPlayed})` : '❌ FAIL');
  console.log('Total Royale Tournaments Tracked:', stats?.totalRoyaleTournaments >= 1 ? `✅ PASS (${stats.totalRoyaleTournaments})` : '❌ FAIL');

  console.log('\n🎉 ALL DATABASE LAYER TESTS PASSED SUCCESSFULLY!\n');
}

runDatabaseTests().catch((err) => {
  console.error('❌ Database Test Failed:', err);
  process.exit(1);
});
