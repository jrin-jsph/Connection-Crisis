import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

async function testRealtimeSystem() {
  console.log('⚡ =============================================');
  console.log('⚡ REAL-TIME SOCKET.IO AUTHORITATIVE TEST SUITE');
  console.log('⚡ =============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Connect Host Socket
  const hostSocket = io(SERVER_URL);
  await new Promise((resolve) => hostSocket.on(SOCKET_EVENTS.CONNECT, resolve));
  console.log('✅ 1. Host Dashboard Connected (Socket ID:', hostSocket.id, ')');

  // 2. Connect Player 1 Socket
  const player1Socket = io(SERVER_URL);
  await new Promise((resolve) => player1Socket.on(SOCKET_EVENTS.CONNECT, resolve));
  console.log('✅ 2. Player 1 Connected (Socket ID:', player1Socket.id, ')');

  // Register Player 1
  const p1Reg = await new Promise((resolve) => {
    player1Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerrin', device: 'iPhone 15' }, resolve);
  });
  console.log('✅ 3. Player 1 Registered (Authoritative ID:', p1Reg.player.playerId, ')');

  // 3. Connect Player 2 Socket
  const player2Socket = io(SERVER_URL);
  await new Promise((resolve) => player2Socket.on(SOCKET_EVENTS.CONNECT, resolve));
  
  // Register Player 2
  const p2Reg = await new Promise((resolve) => {
    player2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android Pixel' }, resolve);
  });
  console.log('✅ 4. Player 2 Registered (Authoritative ID:', p2Reg.player.playerId, ')');

  // 4. Host creates challenge
  const challengePromise = new Promise((resolve) => {
    player1Socket.once(SOCKET_EVENTS.CHALLENGE_CREATED, (data) => resolve(data.challenge));
  });

  hostSocket.emit(SOCKET_EVENTS.HOST_START_GAME);
  const createdChallenge = await challengePromise;
  console.log('✅ 5. Authoritative Challenge Created:', createdChallenge.challengeId, `(${createdChallenge.playerAName} VS ${createdChallenge.playerBName})`);

  // 5. Both players enter challenge arena
  const gameStartPromise = new Promise((resolve) => {
    hostSocket.once(SOCKET_EVENTS.GAME_STARTED, resolve);
  });

  player1Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId: createdChallenge.challengeId, playerId: p1Reg.player.playerId });
  player2Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId: createdChallenge.challengeId, playerId: p2Reg.player.playerId });

  const startedGame = await gameStartPromise;
  console.log('✅ 6. Authoritative Game Started Event Received:', startedGame.gameId);

  // 6. Player 1 sends action, server calculates score
  const scorePromise = new Promise((resolve) => {
    player2Socket.once(SOCKET_EVENTS.SCORE_UPDATED, resolve);
  });

  player1Socket.emit(SOCKET_EVENTS.GAME_ACTION, {
    gameId: startedGame.gameId,
    playerId: p1Reg.player.playerId,
    actionType: 'reaction_click',
    actionData: { clickTime: Date.now() }
  });

  const scoreData = await scorePromise;
  console.log('✅ 7. Authoritative Score Updated Broadcast Received:', scoreData);

  // 7. Test Royale Start Broadcast
  const royalePromise = new Promise((resolve) => {
    player1Socket.once(SOCKET_EVENTS.ROYALE_STARTED, resolve);
  });
  hostSocket.emit(SOCKET_EVENTS.HOST_START_ROYALE);
  const royaleData = await royalePromise;
  console.log('✅ 8. Authoritative Royale Started Event Received:', royaleData);

  // Cleanup
  hostSocket.disconnect();
  player1Socket.disconnect();
  player2Socket.disconnect();

  console.log('\n🎉 ALL REAL-TIME SOCKET.IO AUTHORITATIVE TESTS PASSED!\n');
  process.exit(0);
}

testRealtimeSystem().catch((err) => {
  console.error('❌ Real-time test error:', err);
  process.exit(1);
});
