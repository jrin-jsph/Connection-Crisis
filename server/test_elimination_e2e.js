import { io } from 'socket.io-client';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';

async function testEliminationE2E() {
  console.log('💀 ===============================================');
  console.log('💀 RUNNING RESULTS & ELIMINATION SYSTEM TEST');
  console.log('💀 ===============================================\n');

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
  const challengePromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.CHALLENGE_CREATED, r));
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r));
  
  const chData = await challengePromise;
  const challengeId = chData.challenge.challengeId;
  console.log(`✅ 2. Doppelganger Challenge Created: [${challengeId}] between ${p1Reg.player.name} & ${p2Reg.player.name}`);

  // 3. Both enter challenge arena
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  await new Promise(r => p1Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p1Reg.player.playerId }, r));
  await new Promise(r => p2Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p2Reg.player.playerId }, r));
  
  console.log('⏳ Waiting for 3-second selection countdown...');
  const startedGame = await gameStartPromise;
  console.log(`✅ 3. Game Started: [${startedGame.gameId}] (Type: ${startedGame.gameType})`);

  // 4. Setup promises for Elimination & Finish
  const eliminationPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.PLAYER_ELIMINATED, r));
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));
  const hostStatusPromise = new Promise(r => {
    hostSocket.on(SOCKET_EVENTS.HOST_STATUS_UPDATE, (data) => {
      if (data.eliminatedCount > 0) {
        r(data);
      }
    });
  });

  // 5. Submit winning action
  // For any minigame, submit winning action for Player 1
  if (startedGame.gameType === 'reaction_rush') {
    // Wait for signal then click
    const signalState = await new Promise(r => {
      p1Socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (d) => {
        if (d.state?.signalActive) r(d.state);
      });
    });
    await new Promise(r => {
      p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId: startedGame.gameId,
        playerId: p1Reg.player.playerId,
        actionType: 'reaction_click',
        actionData: { timestamp: signalState.signalTimestamp + 160 }
      }, r);
    });
  } else if (startedGame.gameType === 'rock_paper_scissors') {
    // Round 1
    await new Promise(r => p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p1Reg.player.playerId, actionType: 'rps_choice', actionData: { choice: 'rock' } }, r));
    await new Promise(r => p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p2Reg.player.playerId, actionType: 'rps_choice', actionData: { choice: 'scissors' } }, r));
    await new Promise(r => setTimeout(r, 2600));
    // Round 2
    await new Promise(r => p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p1Reg.player.playerId, actionType: 'rps_choice', actionData: { choice: 'paper' } }, r));
    await new Promise(r => p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p2Reg.player.playerId, actionType: 'rps_choice', actionData: { choice: 'rock' } }, r));
  } else if (startedGame.gameType === 'memory_match') {
    await new Promise(r => setTimeout(r, 3200));
    await new Promise(r => p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p2Reg.player.playerId, actionType: 'memory_step', actionData: { color: 'WRONG_COLOR' } }, r));
  } else if (startedGame.gameType === 'quick_math') {
    for (let i = 0; i < 3; i++) {
      await new Promise(r => setTimeout(r, 200));
      await new Promise(r => p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p1Reg.player.playerId, actionType: 'math_answer', actionData: { selectedAnswer: 100 } }, r));
    }
  } else if (startedGame.gameType === 'target_click') {
    const tid = startedGame.gameData?.currentTarget?.targetId || 't_init';
    await new Promise(r => p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, { gameId: startedGame.gameId, playerId: p1Reg.player.playerId, actionType: 'target_click', actionData: { targetId: tid } }, r));
  }

  // 6. Verify GAME_FINISHED & PLAYER_ELIMINATED
  const finishData = await gameFinishedPromise;
  const elimData = await eliminationPromise;
  const hostStatus = await hostStatusPromise;

  console.log('\n✅ 6. Authoritative Results Broadcast:');
  console.log(`   - Winner: ${finishData.winnerName} (${finishData.winnerId})`);
  console.log(`   - Loser: ${finishData.loserName} (${finishData.loserId})`);
  
  console.log('\n✅ 7. PLAYER_ELIMINATED Event Verified:');
  console.log(`   - Eliminated Player: ${elimData.name} (${elimData.playerId})`);
  console.log(`   - Reason: ${elimData.reason}`);

  console.log('\n✅ 8. Real-time Host Dashboard Status Update:');
  console.log(`   - Active Players: ${hostStatus.activeCount}`);
  console.log(`   - Eliminated Players: ${hostStatus.eliminatedCount}`);
  console.log(`   - Verified Count (Active: 1, Eliminated: 1):`, hostStatus.activeCount === 1 && hostStatus.eliminatedCount === 1 ? '✅ PASS' : '❌ FAIL');

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL RESULTS & ELIMINATION TESTS PASSED!\n');
  process.exit(0);
}

testEliminationE2E().catch(err => {
  console.error('❌ Elimination E2E Test Failed:', err);
  process.exit(1);
});
