import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testMemoryMatchE2E() {
  console.log('🧠 ===============================================');
  console.log('🧠 RUNNING MEMORY MATCH END-TO-END SYSTEM TEST');
  console.log('🧠 ===============================================\n');

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

  // 3. Create Memory Match Game on Server
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const createRes = await new Promise(r => {
    hostSocket.emit('game:create', {
      gameType: 'memory_match',
      playerAId: p1Reg.player.playerId,
      playerBId: p2Reg.player.playerId,
      options: { initialLength: 3 }
    }, r);
  });
  const gameId = createRes.gameId;
  const startedEvent = await gameStartPromise;
  console.log(`✅ 3. Memory Match Game Started: [${gameId}] (Type: ${startedEvent.gameType})`);

  // 4. Wait for Pattern Phase -> Input Phase
  console.log('⏳ Waiting for pattern display playback to finish (~2.8s)...');
  const inputPhasePromise = new Promise(r => {
    p1Socket.on(SOCKET_EVENTS.GAME_STATE_UPDATE, (data) => {
      if (data.state?.status === 'INPUT_PHASE') {
        r(data.state);
      }
    });
  });

  await inputPhasePromise;
  console.log('✅ 4. Input Phase Unlocked by Server Authority');

  // 5. Player 2 makes an intentional mistake with an invalid sequence step
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));

  const mistakeAction = await new Promise(r => {
    p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p2Reg.player.playerId,
      actionType: 'memory_step',
      actionData: { color: 'RED' } // If RED happens to be wrong or right, we test result
    }, r);
  });

  if (mistakeAction.completed) {
    console.log(`✅ 5. Mistake Caught on Step 1: Winner is ${mistakeAction.winnerId}`);
  } else {
    // If RED was by chance step 1, input another to guarantee error
    await new Promise(r => {
      p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId,
        playerId: p2Reg.player.playerId,
        actionType: 'memory_step',
        actionData: { color: 'YELLOW' }
      }, r);
    });
  }

  const finishData = await gameFinishedPromise;
  console.log('\n✅ 6. Authoritative GAME_FINISHED Broadcast:');
  console.log(`   - Winner: ${finishData.winnerName} (${finishData.winnerId})`);
  console.log(`   - Loser: ${finishData.loserName} (${finishData.loserId})`);
  console.log(`   - Reason: ${finishData.reason}`);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL MEMORY MATCH END-TO-END TESTS PASSED!\n');
  process.exit(0);
}

testMemoryMatchE2E().catch(err => {
  console.error('❌ E2E Memory Match Test Failed:', err);
  process.exit(1);
});
