import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testReactionRushE2E() {
  console.log('⚡ ===============================================');
  console.log('⚡ RUNNING REACTION RUSH END-TO-END SYSTEM TEST');
  console.log('⚡ ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Host Connect
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 1. Host Connected and Room Reset');

  // 2. Register Player 1 (Jerrin)
  const p1Socket = io(SERVER_URL);
  await new Promise(r => p1Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p1Reg = await new Promise(r => p1Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerrin', device: 'iOS' }, r));
  console.log(`✅ 2. Registered Player 1: ${p1Reg.player.name} (${p1Reg.player.playerId})`);

  // Setup challenge promise
  const challengePromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.CHALLENGE_CREATED, r));

  // 3. Register Player 2 (Jerin)
  const p2Socket = io(SERVER_URL);
  await new Promise(r => p2Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r));
  console.log(`✅ 3. Registered Player 2: ${p2Reg.player.name} (${p2Reg.player.playerId})`);

  // 4. Challenge created
  const chData = await challengePromise;
  const challengeId = chData.challenge.challengeId;
  console.log(`✅ 4. Doppelganger Challenge Created: ${challengeId}`);

  // 5. Both enter challenge
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  await new Promise(r => p1Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p1Reg.player.playerId }, r));
  await new Promise(r => p2Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p2Reg.player.playerId }, r));
  
  const gameStarted = await gameStartPromise;
  console.log(`✅ 5. Both entered! Game Started: [${gameStarted.gameId}] (Type: ${gameStarted.gameType})`);

  // 6. Wait for Signal Trigger (CLICK!)
  console.log('⏳ Waiting for server countdown & random delay signal...');
  const signalPromise = new Promise(r => {
    p1Socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (data) => {
      if (data.state?.status === 'SIGNAL_TRIGGERED' && data.state?.signalActive) {
        r(data.state);
      }
    });
  });

  const signalState = await signalPromise;
  console.log(`⚡ 6. Server CLICK signal fired! Timestamp: ${signalState.signalTimestamp}`);

  // 7. Player 1 sends fastest reaction click
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));
  const clickRes = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: gameStarted.gameId,
      playerId: p1Reg.player.playerId,
      actionType: 'reaction_click',
      actionData: { timestamp: signalState.signalTimestamp + 185 }
    }, r);
  });
  console.log(`✅ 7. Player 1 clicked in ${clickRes.reactionMs} ms`);

  // 8. Verify Game Finished Event
  const finishData = await gameFinishedPromise;
  console.log('✅ 8. Authoritative GAME_FINISHED Broadcast:');
  console.log(`   - Winner: ${finishData.winnerName} (${finishData.winnerId})`);
  console.log(`   - Loser: ${finishData.loserName} (${finishData.loserId})`);
  console.log(`   - Reason: ${finishData.reason}`);
  console.log(`   - Reaction Time: ${finishData.reactionMs} ms`);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL REACTION RUSH END-TO-END TESTS PASSED!\n');
  process.exit(0);
}

testReactionRushE2E().catch(err => {
  console.error('❌ E2E Reaction Rush Test Failed:', err);
  process.exit(1);
});
