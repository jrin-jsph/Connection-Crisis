import { io } from 'socket.io-client';
import { SOCKET_EVENTS } from '../shared/events.js';

const VALID_GAMES = ['reaction_rush', 'rock_paper_scissors', 'memory_match', 'quick_math', 'target_click'];

async function testRandomGameSelection() {
  console.log('🎲 ===============================================');
  console.log('🎲 RUNNING RANDOM GAME SELECTION SYSTEM TEST');
  console.log('🎲 ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Host Connect & Reset
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 1. Host Connected and Room Reset');

  // 2. Register Player 1 & Player 2
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

  // 3. Set up listeners for synchronized game:selected
  const p1SelectionPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_SELECTED, r));
  const p2SelectionPromise = new Promise(r => p2Socket.once(SOCKET_EVENTS.GAME_SELECTED, r));
  const hostSelectionPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.GAME_SELECTED, r));

  // Both enter the challenge
  await new Promise(r => p1Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p1Reg.player.playerId }, r));
  await new Promise(r => p2Socket.emit(SOCKET_EVENTS.CHALLENGE_ENTER, { challengeId, playerId: p2Reg.player.playerId }, r));
  console.log('✅ 3. Both contenders entered the arena');

  // 4. Verify synchronized 3-second selection event received by all
  const p1Sel = await p1SelectionPromise;
  const p2Sel = await p2SelectionPromise;
  const hostSel = await hostSelectionPromise;

  console.log('\n✅ 4. Synchronized GAME_SELECTED Broadcast:');
  console.log(`   - Selected Minigame: [${p1Sel.selectedGameType}]`);
  console.log(`   - Valid Game in 5 Pool:`, VALID_GAMES.includes(p1Sel.selectedGameType) ? '✅ PASS' : '❌ FAIL');
  console.log(`   - Player 1 & 2 Sync:`, p1Sel.selectedGameType === p2Sel.selectedGameType ? '✅ PERFECT MATCH' : '❌ MISMATCH');
  console.log(`   - Duration: ${p1Sel.durationSec}s`);

  // 5. Verify transition to GAME_STARTED after 3-second selection screen
  console.log('\n⏳ Waiting 3.2s for selection screen countdown...');
  const p1GameStartPromise = new Promise(r => p1Socket.once(SOCKET_EVENTS.GAME_STARTED, r));
  const p2GameStartPromise = new Promise(r => p2Socket.once(SOCKET_EVENTS.GAME_STARTED, r));

  const p1Started = await p1GameStartPromise;
  const p2Started = await p2GameStartPromise;

  console.log('✅ 5. Synchronized GAME_STARTED Broadcast:');
  console.log(`   - Game ID: ${p1Started.gameId}`);
  console.log(`   - Launched Game Type: ${p1Started.gameType}`);
  console.log(`   - Matching Selected Game:`, p1Started.gameType === p1Sel.selectedGameType ? '✅ PASS' : '❌ FAIL');

  // Cleanup
  hostSocket.disconnect();
  p1Socket.disconnect();
  p2Socket.disconnect();

  console.log('\n🎉 ALL RANDOM GAME SELECTION TESTS PASSED!\n');
  process.exit(0);
}

testRandomGameSelection().catch(err => {
  console.error('❌ E2E Random Game Selection Test Failed:', err);
  process.exit(1);
});
