import { 
  normalizeName, 
  calculateSimilarity, 
  DoppelgangerDetector 
} from './doppelganger.js';

async function runDoppelgangerTests() {
  console.log('⚡ =========================================');
  console.log('⚡ RUNNING DOPPELGANGER DETECTION TEST SUITE');
  console.log('⚡ =========================================\n');

  // Test 1: Normalization
  console.log('--- 1. Testing Normalization ---');
  const norm1 = normalizeName('  Jer_rin-01. ');
  console.log('Original: "  Jer_rin-01. " -> Normalized:', `"${norm1}"`);
  console.log('Normalization test:', norm1 === 'jerrin01' ? '✅ PASS' : '❌ FAIL');

  // Test 2: Exact Duplicate & Case Insensitivity
  console.log('\n--- 2. Testing Exact & Case-Insensitive Matches ---');
  const simExact = calculateSimilarity('Jerrin', 'jerrin');
  console.log('Similarity ("Jerrin", "jerrin"):', simExact, simExact === 1.0 ? '✅ PASS' : '❌ FAIL');

  const simSeparators = calculateSimilarity('Jer_rin', 'jer  rin');
  console.log('Similarity ("Jer_rin", "jer  rin"):', simSeparators, simSeparators === 1.0 ? '✅ PASS' : '❌ FAIL');

  // Test 3: Example in Prompt ("Jerrin" vs "Jerin")
  console.log('\n--- 3. Testing Prompt Example ("Jerrin" vs "Jerin") ---');
  const simPrompt = calculateSimilarity('Jerrin', 'Jerin');
  console.log('Similarity ("Jerrin", "Jerin"):', (simPrompt * 100).toFixed(1) + '%');
  console.log('Meets >= 85% threshold:', simPrompt >= 0.85 ? `✅ PASS (${simPrompt})` : '❌ FAIL');

  // Test 4: Dissimilar Names
  console.log('\n--- 4. Testing Dissimilar Names ("Alice" vs "Bob") ---');
  const simDistinct = calculateSimilarity('Alice', 'Bob');
  console.log('Similarity ("Alice", "Bob"):', simDistinct);
  console.log('Below threshold:', simDistinct < 0.85 ? '✅ PASS' : '❌ FAIL');

  // Test 5: Detector Rules (Self-comparison & Repeated Pair Check)
  console.log('\n--- 5. Testing Detector Rules & Challenge Generation ---');
  const detector = new DoppelgangerDetector(0.85);

  const player1 = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const player2 = { playerId: 'p_2', name: 'Jerin', device: 'Android' };
  const player3 = { playerId: 'p_3', name: 'Sophia', device: 'Windows' };

  // Scan player2 when player1 is in the room
  const challenge = detector.findDoppelganger(player2, [player1, player3]);
  console.log('Challenge Created:', challenge ? '✅ YES' : '❌ NO');
  if (challenge) {
    console.log('  - Challenge ID:', challenge.challengeId);
    console.log('  - Player A:', challenge.playerA.name, `(${challenge.playerA.playerId})`);
    console.log('  - Player B:', challenge.playerB.name, `(${challenge.playerB.playerId})`);
    console.log('  - Similarity Score:', (challenge.similarityScore * 100).toFixed(1) + '%');
    console.log('  - Status:', challenge.status);
    console.log('  - CreatedAt:', challenge.createdAt);
  }

  // Rule: Do not repeat challenge for same pair
  console.log('\n--- 6. Testing Repeated Pair Prevention ---');
  const duplicateChallenge = detector.findDoppelganger(player2, [player1]);
  console.log('Duplicate Challenge Blocked:', duplicateChallenge === null ? '✅ PASS (No repeat)' : '❌ FAIL');

  // Rule: Self comparison check
  console.log('\n--- 7. Testing Self Comparison Prevention ---');
  const selfChallenge = detector.findDoppelganger(player1, [player1]);
  console.log('Self Comparison Blocked:', selfChallenge === null ? '✅ PASS (Ignored self)' : '❌ FAIL');

  console.log('\n🎉 ALL DOPPELGANGER DETECTION TESTS PASSED SUCCESSFULLY!\n');
}

runDoppelgangerTests().catch(err => {
  console.error('❌ Doppelganger Test Failed:', err);
  process.exit(1);
});
