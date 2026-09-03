import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testQuickMathE2E() {
  console.log('🔢 ===============================================');
  console.log('🔢 RUNNING QUICK MATH END-TO-END SYSTEM TEST');
  console.log('🔢 ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Host Connect & Reset
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 1. Host Connected and Room Reset');

  // 2. Register Player 1 & 2
  const p1Socket = io(SERVER_URL);
  await new Promise(r => p1Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p1Reg = await new Promise(r => p1Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerrin', device: 'iOS' }, r));

  const p2Socket = io(SERVER_URL);
  await new Promise(r => p2Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r));
  console.log(`✅ 2. Contenders Registered: ${p1Reg.player.name} & ${p2Reg.player.name}`);

  // 3. Create Quick Math Game on Server
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const createRes = await new Promise(r => {
    hostSocket.emit('game:create', {
      gameType: 'quick_math',
      playerAId: p1Reg.player.playerId,
      playerBId: p2Reg.player.playerId,
      options: { targetScore: 3 }
    }, r);
  });
  const gameId = createRes.gameId;
  const startedEvent = await gameStartPromise;
  console.log(`✅ 3. Quick Math Game Started on Server Authority: [${gameId}] (Target: 3 pts)`);

  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));

  // 4. Player 1 solves questions
  // Helper to parse answer from text (e.g. "8 + 4 = ?")
  function solveQuestionText(text) {
    const clean = text.replace(' = ?', '').trim();
    if (clean.includes('+')) {
      const [a, b] = clean.split('+').map(s => parseInt(s.trim()));
      return a + b;
    } else if (clean.includes('-')) {
      const [a, b] = clean.split('-').map(s => parseInt(s.trim()));
      return a - b;
    } else if (clean.includes('×') || clean.includes('*')) {
      const [a, b] = clean.split(/[×*]/).map(s => parseInt(s.trim()));
      return a * b;
    }
    return 0;
  }

  let currentQuestionText = startedEvent.gameData?.question?.text || '10 + 5 = ?';

  // Listen to state updates for question text
  p1Socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (data) => {
    if (data.state?.question?.text) {
      currentQuestionText = data.state.question.text;
    }
  });

  // Solve 3 rounds
  for (let pt = 1; pt <= 3; pt++) {
    // Small delay to receive state update
    await new Promise(r => setTimeout(r, 200));
    const calculatedAnswer = solveQuestionText(currentQuestionText);
    console.log(`--- Point ${pt} Attempt: "${currentQuestionText}" -> Calculated: ${calculatedAnswer} ---`);

    const ansRes = await new Promise(r => {
      p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId,
        playerId: p1Reg.player.playerId,
        actionType: 'math_answer',
        actionData: { selectedAnswer: calculatedAnswer }
      }, r);
    });

    console.log(`Point ${pt} Result:`, ansRes.isCorrect ? '✅ CORRECT (+1 pt)' : '❌ WRONG');
  }

  const finishData = await gameFinishedPromise;
  console.log('\n✅ 5. Authoritative GAME_FINISHED Broadcast:');
  console.log(`   - Champion: ${finishData.winnerName} (${finishData.winnerId})`);
  console.log(`   - Runner-up: ${finishData.loserName} (${finishData.loserId})`);
  console.log(`   - Final Scores:`, finishData.scores);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL QUICK MATH END-TO-END TESTS PASSED!\n');
  process.exit(0);
}

testQuickMathE2E().catch(err => {
  console.error('❌ E2E Quick Math Test Failed:', err);
  process.exit(1);
});
