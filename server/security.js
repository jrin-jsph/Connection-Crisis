/**
 * Connection Crisis - Security Module
 * Provides input sanitization, rate limiting, spoof prevention, and host authentication guards.
 */

/**
 * Sanitize player monikers to strictly prevent XSS, HTML injection, and formatting exploits.
 * @param {string} rawName 
 * @returns {{ valid: boolean, sanitized: string, error?: string }}
 */
export function sanitizePlayerName(rawName) {
  if (!rawName || typeof rawName !== 'string') {
    return { valid: false, sanitized: '', error: 'Name is required' };
  }

  // 1. Strip complete <script>...</script> and <style>...</style> blocks
  let clean = rawName
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]*>?/gm, '') // Strip remaining HTML tags
    .replace(/javascript:/gi, '')
    .replace(/[&<>"'/`=;()[\]{}]/g, '') // Strip special injection chars
    .trim();

  // 2. Collapse excessive whitespace
  clean = clean.replace(/\s+/g, ' ');

  // 3. Length Constraints (2 to 15 characters)
  if (clean.length < 2) {
    return { valid: false, sanitized: clean, error: 'Name must be at least 2 characters long' };
  }
  if (clean.length > 15) {
    clean = clean.substring(0, 15).trim();
  }

  // 4. Allowed Characters: Alpha-numeric, underscores, hyphens, and single spaces
  const validPattern = /^[a-zA-Z0-9 _-]+$/;
  if (!validPattern.test(clean)) {
    return { valid: false, sanitized: clean, error: 'Name contains invalid characters' };
  }

  return { valid: true, sanitized: clean };
}

/**
 * In-Memory Sliding Window Rate Limiter
 */
export class RateLimiter {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 1000; // 1-second window by default
    this.maxRequests = options.maxRequests || 15; // Max 15 actions per window
    this.clients = new Map(); // key -> [timestamps]

    // Periodic cleanup of stale client records every 30 seconds
    this.cleanupTimer = setInterval(() => this.cleanup(), 30000);
  }

  /**
   * Check if an action is allowed for a key (socketId or IP).
   * @param {string} key 
   * @param {number} customMax 
   * @returns {boolean} true if allowed, false if rate limited
   */
  isAllowed(key, customMax = null) {
    const max = customMax || this.maxRequests;
    const now = Date.now();
    const timestamps = this.clients.get(key) || [];

    // Filter out timestamps older than the sliding window
    const recent = timestamps.filter(t => now - t < this.windowMs);

    if (recent.length >= max) {
      this.clients.set(key, recent);
      return false; // Rate limit exceeded
    }

    recent.push(now);
    this.clients.set(key, recent);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamps] of this.clients.entries()) {
      const recent = timestamps.filter(t => now - t < this.windowMs);
      if (recent.length === 0) {
        this.clients.delete(key);
      } else {
        this.clients.set(key, recent);
      }
    }
  }

  destroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }
}

/**
 * Validates player identity and prevents spoofed actions.
 * @param {Object} socket - Socket instance
 * @param {Object} payload - Event payload
 * @param {Map} connectedSockets - Socket to player mapping
 * @param {Object} gameManager - Active GameManager instance
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePlayerAction(socket, payload, connectedSockets, gameManager) {
  const { gameId, playerId, actionType } = payload || {};

  // 1. Check basic payload structure
  if (!gameId || !playerId || !actionType) {
    return { valid: false, error: 'Malformed action payload' };
  }

  // 2. Prevent socket spoofing: socket must be bound to this playerId
  const socketMeta = connectedSockets.get(socket.id);
  if (!socketMeta || socketMeta.playerId !== playerId) {
    return { valid: false, error: 'Unauthorized: Socket does not match player identity' };
  }

  // 3. Verify game exists and is active
  const game = gameManager.getGame(gameId);
  if (!game) {
    return { valid: false, error: 'Game not found or already concluded' };
  }

  // 4. Verify player is actually a participant in this game
  const isParticipant = game.playerA?.playerId === playerId || game.playerB?.playerId === playerId;
  if (!isParticipant) {
    return { valid: false, error: 'Player is not a participant in this match' };
  }

  // 5. Verify game is not already finished
  if (game.isFinished) {
    return { valid: false, error: 'Game has already concluded' };
  }

  return { valid: true };
}

/**
 * Guards administrative host actions.
 * @param {Object} socket 
 * @param {Set<string>} hostSocketIds 
 * @returns {boolean}
 */
export function isHostAuthorized(socket, hostSocketIds) {
  if (!socket || !hostSocketIds) return false;
  return hostSocketIds.has(socket.id);
}
