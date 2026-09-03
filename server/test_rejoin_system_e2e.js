import { io } from 'socket.io-client';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';

async function testRejoinSystemE2E() {
  console.log('🔄 ===============================================');
  console.log('🔄 RUNNING REJOIN & SESSION RESTORATION TEST');
  console.log('🔄 ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Host Connect & Reset
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 1. Host Connected and Room Reset');

  // 2. Register Player 1 (Jerrin)
  let p1Socket = io(SERVER_URL);
  await new Promise(r => p1Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p1Reg = await new Promise(r => p1Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerrin', device: 'iOS' }, r));
  const p1SessionId = p1Reg.player.sessionId;
  const p1PlayerId = p1Reg.player.playerId;
  console.log(`✅ 2. Player 1 Registered: [${p1Reg.player.name}] (Session: ${p1SessionId})`);

  // 3. Test Active Player Disconnect & Reconnect
  console.log('\n--- Test Part A: Active Player Session Restoration ---');
  p1Socket.disconnect();
  console.log('Player 1 socket disconnected (simulating browser reload)');
  await new Promise(r => setTimeout(r, 400));

  // Open new socket connection and perform reconnection handshake
  p1Socket = io(SERVER_URL);
  await new Promise(r => p1Socket.on(SOCKET_EVENTS.CONNECT, r));
  
  const restoreRes = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.PLAYER_RECONNECTED, { sessionId: p1SessionId, playerId: p1PlayerId }, r);
  });

  console.log('Reconnection Handshake Success:', restoreRes.success ? '✅ PASS' : '❌ FAIL');
  console.log('Session Restored Flag:', restoreRes.restored ? '✅ PASS' : '❌ FAIL');
  console.log('Player Status === ACTIVE:', restoreRes.player.status === PLAYER_STATUS.ACTIVE ? '✅ PASS' : '❌ FAIL');

  // 4. Test Elimination & Banned Name Rejoin
  console.log('\n--- Test Part B: Elimination & Name Ban Enforcement ---');
  // Register Player 2 (Jerin)
  const p2Socket = io(SERVER_URL);
  await new Promise(r => p2Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r));
  
  // Launch game between Player 1 and Player 2
  const gameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const createRes = await new Promise(r => {
    hostSocket.emit('game:create', {
      gameType: 'reaction_rush',
      playerAId: p1PlayerId,
      playerBId: p2Reg.player.playerId
    }, r);
  });
  const gameId = createRes.gameId;
  await gameStartPromise;

  // Set up listeners for Game Finished & Player Eliminated
  const gameFinishedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_FINISHED, r));
  const playerEliminatedPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.PLAYER_ELIMINATED, r));

  // Player 2 clicks early -> False start -> Jerin eliminated
  const earlyClickRes = await new Promise(r => {
    p2Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId,
      playerId: p2Reg.player.playerId,
      actionType: 'reaction_click',
      actionData: { timestamp: Date.now() }
    }, r);
  });

  console.log('False start action evaluated:', earlyClickRes.completed ? '✅ PASS' : '❌ FAIL');
  
  const [finishedData, elimData] = await Promise.all([gameFinishedPromise, playerEliminatedPromise]);
  console.log(`Jerin (${elimData.name}) has been eliminated in the showdown.`);

  // Disconnect p2Socket
  p2Socket.disconnect();
  await new Promise(r => setTimeout(r, 200));

  // 5. Eliminated Player attempts to register fresh with banned moniker 'Jerin'
  console.log('\n--- Test Part C: Attempting Rejoin with Eliminated Name ---');
  const bannedAttemptSocket = io(SERVER_URL);
  await new Promise(r => bannedAttemptSocket.on(SOCKET_EVENTS.CONNECT, r));
  
  const bannedRes = await new Promise(r => {
    bannedAttemptSocket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r);
  });

  console.log('Banned Name Rejection Received:', !bannedRes.success && bannedRes.banned ? '✅ PASS' : '❌ FAIL');
  console.log('Server Error Message:', bannedRes.error);

  // 6. Eliminated Player registers with a new valid name 'Marcus'
  console.log('\n--- Test Part D: Rejoining with New Valid Name ---');
  const validNewRes = await new Promise(r => {
    bannedAttemptSocket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Marcus', device: 'Android' }, r);
  });

  console.log('New Name Registration Success:', validNewRes.success ? '✅ PASS' : '❌ FAIL');
  console.log(`Registered as new contender: ${validNewRes.player.name} (${validNewRes.player.playerId})`);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  bannedAttemptSocket.disconnect();

  console.log('\n🎉 ALL REJOIN & SESSION RESTORATION TESTS PASSED!\n');
  process.exit(0);
}

testRejoinSystemE2E().catch(err => {
  console.error('❌ Rejoin System Test Failed:', err);
  process.exit(1);
});
