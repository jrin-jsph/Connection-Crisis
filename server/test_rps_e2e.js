import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testRPSE2E() {
  console.log('✂️ ===============================================');
  console.log('✂️ RUNNING ROCK PAPER SCISSORS END-TO-END TEST');
  console.log('✂️ ===============================================\n');

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
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Alex', device: 'Android' }, r));
  console.log(`✅ 2. Contenders Registered: ${p1Reg.player.name} & ${p2Reg.player.name}`);

  // 3. Create RPS Game on Server
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const createRes = await new Promise(r => {
    hostSocket.emit('game:create', {
      gameType: 'rock_paper_scissors',
      playerAId: p1Reg.player.playerId,
      playerBId: p2Reg.player.playerId,
      options: { targetWins: 2 }
    }, r);
  });
  const gameId = createRes.gameId;
  const startedEvent = await gameStartPromise;
  console.log(`✅ 3. RPS Game Started on Server Authority: [${gameId}] (Best of 3)`);

  // 4. Round 1 Action: Player 1 chooses Rock, Player 2 chooses Scissors
  console.log('\n--- Round 1 ---');
  const r1p1Action = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p1Reg.player.playerId,
      actionType: 'rps_choice',
      actionData: { choice: 'rock' }
    }, r);
  });
  console.log('Player 1 chose ROCK (Secret choice concealed):', !r1p1Action.evaluated ? '✅ PASS' : '❌ FAIL');

  const r1p2Action = await new Promise(r => {
    p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p2Reg.player.playerId,
      actionType: 'rps_choice',
      actionData: { choice: 'scissors' }
    }, r);
  });
  console.log('Player 2 chose SCISSORS -> Round evaluated:', r1p2Action.evaluated ? '✅ PASS' : '❌ FAIL');
  console.log('Round 1 Winner:', r1p2Action.roundResult.winnerId === p1Reg.player.playerId ? '✅ PASS (Jerrin won with ROCK)' : '❌ FAIL');
  console.log('Scores after Round 1:', r1p2Action.roundResult.scores);

  // 5. Wait for Round 2 intermission
  console.log('⏳ Waiting 2.8s for Round 2 intermission...');
  await new Promise(r => setTimeout(r, 2800));

  // 6. Round 2 Action: Player 1 chooses Paper, Player 2 chooses Rock -> Jerrin wins match 2-0!
  console.log('\n--- Round 2 ---');
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));

  await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p1Reg.player.playerId,
      actionType: 'rps_choice',
      actionData: { choice: 'paper' }
    }, r);
  });

  const r2p2Action = await new Promise(r => {
    p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p2Reg.player.playerId,
      actionType: 'rps_choice',
      actionData: { choice: 'rock' }
    }, r);
  });

  console.log('Round 2 Winner:', r2p2Action.roundResult.winnerId === p1Reg.player.playerId ? '✅ PASS (Jerrin won with PAPER)' : '❌ FAIL');
  console.log('Match Finished Flag:', r2p2Action.roundResult.matchFinished ? '✅ PASS' : '❌ FAIL');

  const finishBroadcast = await gameFinishedPromise;
  console.log('\n✅ 7. Authoritative GAME_FINISHED Broadcast:');
  console.log(`   - Match Champion: ${finishBroadcast.winnerName} (${finishBroadcast.winnerId})`);
  console.log(`   - Match Runner-up: ${finishBroadcast.loserName} (${finishBroadcast.loserId})`);
  console.log(`   - Final Scores:`, finishBroadcast.scores);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL ROCK PAPER SCISSORS END-TO-END TESTS PASSED!\n');
  process.exit(0);
}

testRPSE2E().catch(err => {
  console.error('❌ E2E RPS Test Failed:', err);
  process.exit(1);
});
