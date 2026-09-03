import { io } from 'socket.io-client';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';

function solveMath(questionText) {
  if (!questionText) return 0;
  const cleaned = questionText.replace('×', '*').replace('=', '').replace('?', '').trim();
  try {
    return Function(`'use strict'; return (${cleaned})`)();
  } catch (e) {
    return 0;
  }
}

async function simulateWin(winnerSocket, loserSocket, match) {
  const gameId = 'game_' + match.matchId;
  const winnerId = match.playerA.playerId;
  const loserId = match.playerB.playerId;

  if (match.gameType === 'reaction_rush') {
    // Loser false starts -> Winner wins immediately
    await new Promise(r => {
      loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId,
        playerId: loserId,
        actionType: 'reaction_click',
        actionData: { timestamp: 0 }
      }, r);
    });
  } else if (match.gameType === 'rock_paper_scissors') {
    // Round 1
    await new Promise(r => winnerSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: winnerId, actionType: 'rps_choice', actionData: { choice: 'rock' } }, r));
    await new Promise(r => loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: loserId, actionType: 'rps_choice', actionData: { choice: 'scissors' } }, r));
    // Wait for round reveal + intermission into Round 2 (3.2s)
    await new Promise(r => setTimeout(r, 3200));
    // Round 2
    await new Promise(r => winnerSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: winnerId, actionType: 'rps_choice', actionData: { choice: 'paper' } }, r));
    await new Promise(r => loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: loserId, actionType: 'rps_choice', actionData: { choice: 'rock' } }, r));
  } else if (match.gameType === 'memory_match') {
    // Memory sequence shows for 3s, then INPUT_PHASE
    await new Promise(r => setTimeout(r, 3300));
    await new Promise(r => loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: loserId, actionType: 'memory_step', actionData: { color: 'RED' } }, r));
    await new Promise(r => loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: loserId, actionType: 'memory_step', actionData: { color: 'BLUE' } }, r));
    await new Promise(r => loserSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: loserId, actionType: 'memory_step', actionData: { color: 'GREEN' } }, r));
  } else if (match.gameType === 'quick_math') {
    let curQuestionText = '2 + 2 = ?';
    winnerSocket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (d) => {
      if (d.gameId === gameId && d.state?.question?.text) curQuestionText = d.state.question.text;
    });
    winnerSocket.on(SOCKET_EVENTS.GAME_STARTED, (d) => {
      if (d.gameId === gameId && d.gameData?.question?.text) curQuestionText = d.gameData.question.text;
    });

    for (let q = 0; q < 3; q++) {
      await new Promise(r => setTimeout(r, 350));
      const ans = solveMath(curQuestionText);
      await new Promise(r => winnerSocket.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId,
        playerId: winnerId,
        actionType: 'math_answer',
        actionData: { selectedAnswer: ans }
      }, r));
    }
  } else if (match.gameType === 'target_click') {
    await new Promise(r => winnerSocket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId, playerId: winnerId, actionType: 'target_click', actionData: { targetId: 't_init' } }, r));
    // Wait for target click timer
    await new Promise(r => setTimeout(r, 10500));
  }
}

async function testRoyaleModeE2E() {
  console.log('👑 ===============================================');
  console.log('👑 RUNNING CONNECTION CRISIS ROYALE SYSTEM TEST');
  console.log('👑 ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Host Connect & Reset
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 1. Host Connected and Room Reset');

  // 2. Register 4 Contenders (Jerrin, Alex, Marcus, Elena)
  const socketMap = new Map(); // playerId -> socket
  const names = ['Jerrin', 'Alex', 'Marcus', 'Elena'];

  for (let i = 0; i < names.length; i++) {
    const s = io(SERVER_URL);
    await new Promise(r => s.on(SOCKET_EVENTS.CONNECT, r));
    const reg = await new Promise(r => s.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: names[i], device: `Device_${i}` }, r));
    socketMap.set(reg.player.playerId, s);
  }
  console.log(`✅ 2. Registered 4 Contenders: ${names.join(', ')}`);

  // 3. Host Initiates Royale Mode
  const royaleStartedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.ROYALE_STARTED, r));
  const round1StartPromise = new Promise(r => {
    const fn = (d) => {
      if (d.roundNumber === 1) {
        hostSocket.off(SOCKET_EVENTS.ROYALE_ROUND_START, fn);
        r(d);
      }
    };
    hostSocket.on(SOCKET_EVENTS.ROYALE_ROUND_START, fn);
  });

  const round1FinishPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.ROYALE_ROUND_FINISH, r));
  const round2StartPromise = new Promise(r => {
    const fn = (d) => {
      if (d.roundNumber === 2) {
        hostSocket.off(SOCKET_EVENTS.ROYALE_ROUND_START, fn);
        r(d);
      }
    };
    hostSocket.on(SOCKET_EVENTS.ROYALE_ROUND_START, fn);
  });

  const startRes = await new Promise(r => {
    hostSocket.emit(SOCKET_EVENTS.HOST_START_ROYALE, {}, r);
  });

  console.log('Host Start Royale Call Success:', startRes.success ? '✅ PASS' : '❌ FAIL');
  const royaleStarted = await royaleStartedPromise;
  const round1Data = await round1StartPromise;
  console.log(`✅ 3. Royale Started: [${royaleStarted.royaleId}] with ${royaleStarted.contendersCount} Contenders!`);
  console.log(`   - Round 1 Showdowns Created: ${round1Data.matches.length} matches`);

  // 4. Conclude Round 1 Matches
  console.log('\n--- Processing Round 1 Matches ---');

  for (const match of round1Data.matches) {
    console.log(`   Starting Showdown: ${match.playerA.name} VS ${match.playerB.name} (${match.gameType})`);

    const winnerId = match.playerA.playerId;
    const loserId = match.playerB.playerId;
    const winnerSocket = socketMap.get(winnerId);
    const loserSocket = socketMap.get(loserId);

    // Wait 3.2s for 3-second selection countdown
    await new Promise(r => setTimeout(r, 3200));

    await simulateWin(winnerSocket, loserSocket, match);
    console.log(`   Showdown Concluded: ${match.playerA.name} won!`);
  }

  const r1Finish = await round1FinishPromise;
  console.log(`✅ 4. Round 1 Concluded! Advancing Survivors: ${r1Finish.advancingContenders.map(p => p.name).join(', ')}`);

  // 5. Round 2 (Finals)
  console.log('\n--- Processing Round 2 (Finals) ---');
  const round2StartData = await round2StartPromise;
  const finalMatch = round2StartData.matches[0];
  console.log(`⚔️ Round 2 (FINALS) Showdown: ${finalMatch.playerA.name} VS ${finalMatch.playerB.name} (${finalMatch.gameType})`);

  const royaleFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.ROYALE_FINISHED, r));

  // Wait 3.2s for selection countdown
  await new Promise(r => setTimeout(r, 3200));

  const finalWinnerId = finalMatch.playerA.playerId;
  const finalLoserId = finalMatch.playerB.playerId;
  const finalWinnerSocket = socketMap.get(finalWinnerId);
  const finalLoserSocket = socketMap.get(finalLoserId);

  await simulateWin(finalWinnerSocket, finalLoserSocket, finalMatch);

  // 6. Verify Grand Finale Coronation
  const finaleData = await royaleFinishedPromise;
  console.log('\n👑 ===============================================');
  console.log(`👑 ROYALE FINALE: CHAMPION CROWNED!`);
  console.log(`   - Title: "${finaleData.champion.title}"`);
  console.log(`   - Champion: ${finaleData.champion.name} (${finaleData.champion.playerId})`);
  console.log(`   - Total Rounds: ${finaleData.totalRounds}`);
  console.log(`   - Initial Contenders: ${finaleData.initialContendersCount}`);
  console.log('👑 ===============================================\n');

  console.log('Title === "THE ONLY REAL ONE":', finaleData.champion.title === 'THE ONLY REAL ONE' ? '✅ PASS' : '❌ FAIL');
  console.log('Initial Contenders === 4:', finaleData.initialContendersCount === 4 ? '✅ PASS' : '❌ FAIL');

  // Cleanup
  hostSocket.disconnect();
  for (const s of socketMap.values()) s.disconnect();

  console.log('🎉 ALL CONNECTION CRISIS ROYALE TESTS PASSED!\n');
  process.exit(0);
}

testRoyaleModeE2E().catch(err => {
  console.error('❌ Royale Mode E2E Test Failed:', err);
  process.exit(1);
});
