import { io } from 'socket.io-client';
import { SOCKET_EVENTS, CHALLENGE_STATUS } from '../shared/events.js';

async function test60sChallengeSystem() {
  console.log('⏱️ ================================================');
  console.log('⏱️ RUNNING 60-SECOND CHALLENGE & CRISIS TEST SUITE');
  console.log('⏱️ ================================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Connect Host Socket
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  console.log('✅ 1. Host Connected');

  // Reset room for clean test
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));

  // 2. Connect Player 1 ('Jerrin')
  const p1Socket = io(SERVER_URL);
  await new Promise(r => p1Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p1Reg = await new Promise(r => p1Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerrin', device: 'iOS' }, r));
  console.log('✅ 2. Player 1 Registered: Jerrin (', p1Reg.player.playerId, ')');

  // Setup promise for challenge creation on Player 1
  const p1ChallengePromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.CHALLENGE_CREATED, r));

  // 3. Connect Player 2 ('Jerin' -> triggers Doppelganger)
  const p2Socket = io(SERVER_URL);
  await new Promise(r => p2Socket.on(SOCKET_EVENTS.CONNECT, r));
  const p2Reg = await new Promise(r => p2Socket.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'Jerin', device: 'Android' }, r));
  console.log('✅ 3. Player 2 Registered: Jerin (', p2Reg.player.playerId, ')');

  // 4. Verify Challenge Created
  const challengeEvent = await p1ChallengePromise;
  const ch = challengeEvent.challenge;
  console.log('✅ 4. Doppelganger Challenge Triggered:');
  console.log('   - ID:', ch.challengeId);
  console.log(`   - Contenders: ${ch.playerA.name} VS ${ch.playerB.name}`);
  console.log(`   - Similarity: ${(ch.similarityScore * 100).toFixed(1)}%`);
  console.log(`   - Initial Countdown: ${ch.countdownRemaining}s`);

  // 5. Test Server Timer Tick
  const tickPromise = new Promise(r => p1Socket.once('challenge:tick', r));
  const tickData = await tickPromise;
  console.log(`✅ 5. Server Authoritative Timer Ticking: ${tickData.countdownRemaining}s remaining`);

  // 6. Player 1 Enters Challenge
  const p1Entered = await new Promise(r => {
    p1Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, {
      challengeId: ch.challengeId,
      playerId: p1Reg.player.playerId
    }, r);
  });
  console.log('✅ 6. Player 1 Entered Challenge (Entered Count: ' + p1Entered.challenge.enteredPlayers.length + '/2)');

  // 7. Player 2 Enters Challenge -> Expect game:started
  const gameStartPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const p2Entered = await new Promise(r => {
    p2Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, {
      challengeId: ch.challengeId,
      playerId: p2Reg.player.playerId
    }, r);
  });
  console.log('✅ 7. Player 2 Entered Challenge (Both Contenders Entered!)');

  const startedGame = await gameStartPromise;
  console.log('✅ 8. Authoritative Game Started Event Received:', startedGame.gameId);

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL 60-SECOND CHALLENGE & DOPPELGANGER CRISIS TESTS PASSED!\n');
  process.exit(0);
}

test60sChallengeSystem().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
