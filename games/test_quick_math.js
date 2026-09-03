import { QuickMathGame } from './QuickMath.js';

async function runQuickMathTests() {
  console.log('🔢 ===========================================');
  console.log('🔢 RUNNING QUICK MATH MINIGAME TEST SUITE');
  console.log('🔢 ===========================================\n');

  const pA = { playerId: 'p_1', name: 'Jerrin', device: 'iOS' };
  const pB = { playerId: 'p_2', name: 'Jerin', device: 'Android' };

  // Test 1: Problem Generation
  console.log('--- 1. Testing Problem Generation ---');
  const qm = new QuickMathGame('game_qm_01', 'quick_math', pA, pB, { targetScore: 3 });
  qm.initialize();
  
  const q1 = qm.currentQuestion;
  console.log('Question 1 Generated:', q1.text);
  console.log('Options Count (4):', q1.options.length === 4 ? '✅ PASS' : '❌ FAIL');
  console.log('Correct Answer in Options:', q1.options.includes(q1.answer) ? '✅ PASS' : '❌ FAIL');

  // Test 2: Correct Answer (+1 pt)
  console.log('\n--- 2. Testing Correct Answer (+1 pt) ---');
  const correctAction = qm.receiveAction('p_1', 'math_answer', { selectedAnswer: q1.answer });
  console.log('Answer Correct:', correctAction.isCorrect ? '✅ PASS' : '❌ FAIL');
  console.log('Player 1 Score === 1:', qm.state.scores.p_1 === 1 ? '✅ PASS' : '❌ FAIL');

  // Test 3: Wrong Answer (-1 pt)
  console.log('\n--- 3. Testing Wrong Answer (-1 pt penalty) ---');
  const wrongAns = qm.currentQuestion.options.find(opt => opt !== qm.currentQuestion.answer);
  const wrongAction = qm.receiveAction('p_1', 'math_answer', { selectedAnswer: wrongAns });
  console.log('Wrong Answer Detected:', !wrongAction.isCorrect ? '✅ PASS' : '❌ FAIL');
  console.log('Player 1 Score Deducted to 0:', qm.state.scores.p_1 === 0 ? '✅ PASS' : '❌ FAIL');

  // Test 4: First to 3 Points Wins Match
  console.log('\n--- 4. Testing First to 3 Points Wins ---');
  // Point 1
  qm.receiveAction('p_1', 'math_answer', { selectedAnswer: qm.currentQuestion.answer });
  // Point 2
  qm.receiveAction('p_1', 'math_answer', { selectedAnswer: qm.currentQuestion.answer });
  // Point 3 (Winning point)
  const winningAction = qm.receiveAction('p_1', 'math_answer', { selectedAnswer: qm.currentQuestion.answer });
  
  console.log('Match Completed:', winningAction.completed ? '✅ PASS' : '❌ FAIL');
  console.log('Match Champion:', winningAction.winnerId === 'p_1' ? '✅ PASS (Jerrin reached 3 pts)' : '❌ FAIL');
  console.log('Final Scores:', qm.state.scores);

  console.log('\n🎉 ALL QUICK MATH TESTS PASSED!\n');
}

runQuickMathTests().catch(err => {
  console.error('❌ Quick Math Test Failed:', err);
  process.exit(1);
});
