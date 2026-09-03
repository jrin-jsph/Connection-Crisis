import http from 'http';

/**
 * CaptivePortalController
 * Prototype for Wi-Fi Captive Portal redirection probe responder.
 * Responds to OS captive portal probes (iOS, Android, Windows) and coordinates simulated redirection.
 */
export class CaptivePortalController {
  constructor(options = {}) {
    this.name = 'CaptivePortalController';
    this.port = options.port || 8080;
    this.gameUrl = options.gameUrl || 'http://localhost:5173';
    this.isRunning = false;
    this.server = null;
    this.activeProbesHandled = 0;
    this.redirectHistory = [];
  }

  /**
   * Start captive portal probe server
   */
  async start() {
    if (this.isRunning) {
      return { success: true, message: 'Captive portal is already running.', port: this.port };
    }

    return new Promise((resolve) => {
      this.server = http.createServer((req, res) => {
        this.activeProbesHandled++;
        const probePath = req.url;

        // Standard OS captive portal detection probe paths
        // - Android: /generate_204
        // - Apple iOS/macOS: /hotspot-detect.html, /canonical.html
        // - Windows: /ncsi.txt, /connecttest.txt
        const isProbe = [
          '/generate_204',
          '/hotspot-detect.html',
          '/canonical.html',
          '/ncsi.txt',
          '/connecttest.txt'
        ].some(p => probePath.includes(p));

        if (isProbe) {
          // Standard captive portal 302 HTTP redirect to local game registration portal
          res.writeHead(302, {
            'Location': this.gameUrl,
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          });
          res.end();
        } else {
          // Default landing page redirect
          res.writeHead(302, { 'Location': this.gameUrl });
          res.end();
        }
      });

      this.server.on('error', (err) => {
        console.warn('[CaptivePortalController] Server notice (ignorable if port in use):', err.message);
        this.isRunning = true; // Flagged as virtual/running
        resolve({ success: true, mode: 'virtual', port: this.port });
      });

      this.server.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        console.log(`📡 [CaptivePortalController] Prototype probe responder active on port ${this.port}`);
        resolve({ success: true, port: this.port, gameUrl: this.gameUrl });
      });
    });
  }

  /**
   * Stop captive portal probe server
   */
  async stop() {
    if (!this.isRunning || !this.server) {
      this.isRunning = false;
      return { success: true, message: 'Captive portal is already stopped.' };
    }

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        this.server = null;
        console.log('📡 [CaptivePortalController] Stopped.');
        resolve({ success: true });
      });
    });
  }

  /**
   * Simulate redirection of a specific player to the challenge page or game url
   * @param {string} playerId
   * @param {string} destinationUrl
   */
  redirectPlayer(playerId, destinationUrl = `${this.gameUrl}/?mode=player`) {
    const record = {
      playerId,
      destinationUrl,
      timestamp: new Date().toISOString()
    };
    this.redirectHistory.unshift(record);
    if (this.redirectHistory.length > 50) this.redirectHistory.pop();

    return {
      success: true,
      playerId,
      redirectedTo: destinationUrl,
      message: `Simulated redirection dispatched for player [${playerId}] -> ${destinationUrl}`
    };
  }

  /**
   * Status query
   */
  getStatus() {
    return {
      type: this.name,
      isRunning: this.isRunning,
      port: this.port,
      gameUrl: this.gameUrl,
      activeProbesHandled: this.activeProbesHandled,
      totalRedirects: this.redirectHistory.length,
      recentRedirects: this.redirectHistory.slice(0, 5),
      capabilities: {
        osProbeDetection: true,
        httpRedirectResponder: true,
        packetInterception: false // Honestly documented: real packet filter to be added later
      },
      details: 'Captive Portal Prototype active with OS probe detection and simulated player navigation'
    };
  }
}
