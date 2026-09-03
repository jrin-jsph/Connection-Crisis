import { io } from 'socket.io-client';
import { SOCKET_EVENTS, PLAYER_STATUS } from '../shared/events.js';
import { sanitizePlayerName, RateLimiter } from './security.js';

async function testSecurityModule() {
  console.log('🛡️ ===============================================');
  console.log('🛡️ RUNNING CONNECTION CRISIS SECURITY & INTEGRITY TEST');
  console.log('🛡️ ===============================================\n');

  // --- UNIT TESTS: Input Sanitization ---
  console.log('--- 1. Testing Input Sanitization (XSS & Moniker Guards) ---');
  
  const test1 = sanitizePlayerName('<script>alert("hacked")</script>Marcus');
  console.log(`   [XSS Script Tag] -> "${test1.sanitized}" (Valid: ${test1.valid})`);
  if (!test1.valid || test1.sanitized !== 'Marcus') throw new Error('XSS Script tag sanitization failed');

  const test2 = sanitizePlayerName('<img src=x onerror=alert(1)>Elena');
  console.log(`   [HTML Img Tag] -> "${test2.sanitized}" (Valid: ${test2.valid})`);
  if (!test2.valid || test2.sanitized !== 'Elena') throw new Error('HTML Tag sanitization failed');

  const test3 = sanitizePlayerName('SuperLongNameExceedingLimit');
  console.log(`   [Max Length 15 Chars] -> "${test3.sanitized}" (Length: ${test3.sanitized.length})`);
  if (test3.sanitized.length > 15) throw new Error('Length truncation failed');

  const test4 = sanitizePlayerName('A');
  console.log(`   [Min Length 2 Chars] -> Valid: ${test4.valid} (Error: "${test4.error}")`);
  if (test4.valid) throw new Error('Short name validation failed');

  console.log('✅ 1. Input Sanitization Unit Tests Passed!\n');

  // --- INTEGRATION TESTS: Live Server Security ---
  const SERVER_URL = 'http://localhost:3001';

  // --- 2. Host Authentication & Admin Guard ---
  console.log('--- 2. Testing Host Authentication Guard ---');
  const rogueSocket = io(SERVER_URL);
  await new Promise(r => rogueSocket.on(SOCKET_EVENTS.CONNECT, r));

  // Rogue socket tries to reset the room without registering as host
  const unauthRes = await new Promise(r => rogueSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('   Rogue Admin Reset Attempt Result:', unauthRes.error || unauthRes.message);
  if (unauthRes.success || !unauthRes.error?.includes('UNAUTHORIZED_HOST_ACTION')) {
    throw new Error('Rogue socket was allowed to perform admin action!');
  }
  console.log('✅ 2. Unauthorized Host Action Successfully Blocked!\n');

  // Legitimate Host registers
  const hostSocket = io(SERVER_URL);
  await new Promise(r => hostSocket.on(SOCKET_EVENTS.CONNECT, r));
  const authRes = await new Promise(r => hostSocket.emit('host:register', {}, r));
  console.log('   Legitimate Host Registration:', authRes.isHost ? 'PASS' : 'FAIL');
  const legitimateReset = await new Promise(r => hostSocket.emit(SOCKET_EVENTS.HOST_RESET_ROOM, {}, r));
  console.log('   Authorized Host Reset:', legitimateReset.success ? 'PASS' : 'FAIL');

  // --- 3. Spoofed Player Action Prevention ---
  console.log('\n--- 3. Testing Spoofed Move Prevention ---');
  const socketA = io(SERVER_URL);
  const socketB = io(SERVER_URL);
  await new Promise(r => socketA.on(SOCKET_EVENTS.CONNECT, r));
  await new Promise(r => socketB.on(SOCKET_EVENTS.CONNECT, r));

  const regA = await new Promise(r => socketA.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'PlayerA' }, r));
  const regB = await new Promise(r => socketB.emit(SOCKET_EVENTS.PLAYER_REGISTER, { name: 'PlayerB' }, r));

  // Socket A tries to send a move with Player B's ID
  const spoofRes = await new Promise(r => {
    socketA.emit(SOCKET_EVENTS.GAME_ACTION, {
      gameId: 'game_fake_123',
      playerId: regB.player.playerId,
      actionType: 'reaction_click',
      actionData: { timestamp: Date.now() }
    }, r);
  });

  console.log('   Spoofed Move Attempt Result:', spoofRes.error);
  if (spoofRes.success || !spoofRes.error?.includes('Unauthorized')) {
    throw new Error('Spoofed player action was not blocked!');
  }
  console.log('✅ 3. Identity Spoofing Successfully Blocked!\n');

  // --- 4. High-Frequency Action Rate Limiting ---
  console.log('--- 4. Testing Action Rate Limiting (Anti-Spam) ---');
  let rateLimitHit = false;
  for (let i = 0; i < 25; i++) {
    const res = await new Promise(r => {
      socketA.emit(SOCKET_EVENTS.GAME_ACTION, {
        gameId: 'game_test',
        playerId: regA.player.playerId,
        actionType: 'reaction_click'
      }, r);
    });
    if (res?.error?.includes('RATE_LIMIT_EXCEEDED')) {
      rateLimitHit = true;
      console.log(`   Rate limiter triggered on spam request #${i + 1}: ${res.error}`);
      break;
    }
  }

  if (!rateLimitHit) {
    throw new Error('Rate limiter failed to throttle high-frequency spam');
  }
  console.log('✅ 4. Rate Limiter Successfully Throttled Rapid Spam!\n');

  // Cleanup
  rogueSocket.disconnect();
  hostSocket.disconnect();
  socketA.disconnect();
  socketB.disconnect();

  console.log('🎉 ALL SECURITY MODULE TESTS PASSED!\n');
  process.exit(0);
}

testSecurityModule().catch(err => {
  console.error('❌ Security Module Test Failed:', err);
  process.exit(1);
});
