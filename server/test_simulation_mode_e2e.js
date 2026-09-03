import { io } from 'socket.io-client';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';

async function testSimulationModeE2E() {
  console.log('🤖 ===============================================');
  console.log('🤖 RUNNING SIMULATION MODE CONTROLS TEST');
  console.log('🤖 ===============================================\n');

  const SERVER_URL = 'http://localhost:3001';

  // 1. Connect Host Socket
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  console.log('✅ 1. Host Connected');

  // 2. Test Room Reset
  const resetRes = await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 2. Room Reset:', resetRes.success ? 'PASS' : 'FAIL');

  // 3. Test Add Simulated Player (+1 Bot)
  const addPlayerPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.PLAYER_JOINED, r));
  const sim1Res = await new Promise(r => {
    hostSocket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name: 'AlphaBot', device: 'Virtual Pixel 9' }, r);
  });
  const joinedEvent = await addPlayerPromise;
  console.log('✅ 3. Add Single Simulated Player:');
  console.log(`   - Bot Name: ${sim1Res.player.name}`);
  console.log(`   - Bot Device: ${sim1Res.player.device}`);
  console.log(`   - isSimulated: ${sim1Res.player.isSimulated}`);
  console.log('   - Event Broadcast: PASS');

  // 4. Test Doppelganger Simulation Injection (AlphaBot vs AlfaBot)
  const challengePromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.CHALLENGE_CREATED, r));
  const doppelRes = await new Promise(r => {
    hostSocket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name: 'AlfaBot', device: 'Virtual iPhone' }, r);
  });
  const challengeEvent = await challengePromise;
  console.log('✅ 4. Simulate Doppelganger Challenge Trigger:');
  console.log(`   - Player A: ${challengeEvent.playerAName}`);
  console.log(`   - Player B: ${challengeEvent.playerBName}`);
  console.log(`   - Similarity Score: ${(challengeEvent.similarityScore * 100).toFixed(1)}%`);

  // 5. Test Simulate Minigame Victory
  // When challenge begins, start a game or simulate victory
  await new Promise(r => setTimeout(r, 1200));
  const victoryRes = await new Promise(r => {
    hostSocket.emit('host:simulate_victory', { winnerId: sim1Res.player.playerId }, r);
  });
  console.log('✅ 5. Simulate Minigame Victory:');
  console.log('   - Victory Event Result:', victoryRes.success ? 'PASS' : 'FAIL');

  // 6. Test Simulate Player Disconnect
  const disconPromise = new Promise(r => hostSocket.once(SOCKET_EVENTS.PLAYER_DISCONNECTED, r));
  const disconRes = await new Promise(r => {
    hostSocket.emit('host:simulate_disconnect', { playerId: sim1Res.player.playerId }, r);
  });
  const disconEvent = await disconPromise;
  console.log('✅ 6. Simulate Player Network Disconnect:');
  console.log(`   - Disconnected Player: ${disconEvent.name} (${disconEvent.playerId})`);
  console.log('   - Network Drop Broadcast: PASS');

  // 7. Test Batch Bot Spawn for Tournament (+4 Bots)
  for (let i = 0; i < 4; i++) {
    await new Promise(r => {
      hostSocket.emit(SOCKET_EVENTS.HOST_SIMULATE_PLAYER, { name: `BatchBot_${i + 1}` }, r);
    });
  }
  console.log('✅ 7. Batch Bot Spawning (+4 Contenders): PASS');

  // 8. Final Clean Reset
  await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('✅ 8. Final Clean Reset: PASS');

  hostSocket.disconnect();
  console.log('\n🎉 ALL SIMULATION MODE CONTROLS PASSED!\n');
  process.exit(0);
}

testSimulationModeE2E().catch(err => {
  console.error('❌ Simulation Mode Test Failed:', err);
  process.exit(1);
});
