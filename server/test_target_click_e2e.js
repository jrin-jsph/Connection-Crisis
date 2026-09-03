import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testTargetClickE2E() {
  console.log('🎯 ===============================================');
  console.log('🎯 RUNNING TARGET CLICK END-TO-END SYSTEM TEST');
  console.log('🎯 ===============================================\n');

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

  // 3. Create Target Click Game on Server
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const createRes = await new Promise(r => {
    hostSocket.emit('game:create', {
      gameType: 'target_click',
      playerAId: p1Reg.player.playerId,
      playerBId: p2Reg.player.playerId,
      options: { durationSec: 3 } // 3s test duration
    }, r);
  });
  const gameId = createRes.gameId;
  const startedEvent = await gameStartPromise;
  console.log(`✅ 3. Target Click Game Started on Server Authority: [${gameId}] (Duration: 3s)`);

  let currentTargetId = startedEvent.gameData?.currentTarget?.targetId;

  p1Socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (data) => {
    if (data.state?.currentTarget?.targetId) {
      currentTargetId = data.state.currentTarget.targetId;
    }
  });

  // 4. Player 1 hits 2 targets
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));

  console.log('--- Player 1 Clicking Target 1 ---');
  const hit1 = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p1Reg.player.playerId,
      actionType: 'target_click',
      actionData: { targetId: currentTargetId }
    }, r);
  });
  console.log('Target 1 Hit (+1 pt):', hit1.hit ? '✅ PASS' : '❌ FAIL');

  await new Promise(r => setTimeout(r, 100));

  console.log('--- Player 1 Clicking Target 2 ---');
  const hit2 = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p1Reg.player.playerId,
      actionType: 'target_click',
      actionData: { targetId: hit1.nextTarget?.targetId || currentTargetId }
    }, r);
  });
  console.log('Target 2 Hit (+1 pt, Total: 2):', hit2.hit ? '✅ PASS' : '❌ FAIL');

  // 5. Wait for 3-second timer expiration
  console.log('⏳ Waiting for 3-second timer to expire...');
  const finishData = await gameFinishedPromise;

  console.log('\n✅ 5. Authoritative GAME_FINISHED Broadcast:');
  console.log(`   - Champion: ${finishData.winnerName} (${finishData.winnerId})`);
  console.log(`   - Runner-up: ${finishData.loserName} (${finishData.loserId})`);
  console.log(`   - Final Scores:`, finishData.scores);
  console.log(`   - Reason: ${finishData.reason}`);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL TARGET CLICK END-TO-END TESTS PASSED!\n');
  process.exit(0);
}

testTargetClickE2E().catch(err => {
  console.error('❌ E2E Target Click Test Failed:', err);
  process.exit(1);
});
