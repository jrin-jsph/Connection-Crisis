import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Wifi, Server, Activity, ShieldCheck, Gamepad2, Users, Send } from 'lucide-react';
import { SOCKET_EVENTS } from '../../shared/events.js';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [serverInfo, setServerInfo] = useState(null);
  const [pingLatency, setPingLatency] = useState(null);
  const [lastPingSent, setLastPingSent] = useState(null);
  const [serverLog, setServerLog] = useState([]);

  useEffect(() => {
    // Connect to Socket.IO backend (proxied via Vite or direct origin)
    const socketInstance = io({
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on(SOCKET_EVENTS.CONNECT, () => {
      setIsConnected(true);
      addLog(`Connected to Game Server (Socket ID: ${socketInstance.id})`);
      // Request initial host status
      socketInstance.emit(SOCKET_EVENTS.HOST_GET_STATUS);
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      setIsConnected(false);
      addLog('Disconnected from Game Server');
    });

    socketInstance.on(SOCKET_EVENTS.PONG, (data) => {
      if (lastPingSent) {
        setPingLatency(Date.now() - lastPingSent);
      }
      addLog(`Server Handshake: ${JSON.stringify(data)}`);
    });

    socketInstance.on(SOCKET_EVENTS.HOST_STATUS_UPDATE, (data) => {
      setServerInfo(data);
      addLog(`Host status updated: ${data.playerCount} players connected`);
    });

    // Fetch initial health REST info
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setServerInfo((prev) => ({ ...prev, ...data })))
      .catch((err) => console.error('Failed to fetch health info:', err));

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setServerLog((prev) => [`[${timestamp}] ${msg}`, ...prev.slice(0, 20)]);
  };

  const handleSendPing = () => {
    if (socket && isConnected) {
      const now = Date.now();
      setLastPingSent(now);
      socket.emit(SOCKET_EVENTS.PING, { clientTimestamp: now });
      addLog('Sent ping to server...');
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Gamepad2 size={32} color="#00f2fe" />
          <span>CONNECTION CRISIS</span>
        </div>
        <div className={`badge ${isConnected ? 'badge-online' : 'badge-offline'}`}>
          <span className="ping-indicator" />
          {isConnected ? 'SERVER ONLINE' : 'DISCONNECTED'}
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid-2">
        {/* Connection & Network Status */}
        <div className="card">
          <h2 className="card-title">
            <Wifi size={22} color="#00f2fe" />
            Local Network Host Status
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Hotspot / Host IP:</span>
              <span className="code-pill">
                {serverInfo?.hostIps?.length > 0
                  ? serverInfo.hostIps.map(ip => ip.address).join(', ')
                  : '127.0.0.1 / Localhost'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Server Port:</span>
              <span className="code-pill">{serverInfo?.port || '3001'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Socket Latency:</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>
                {pingLatency !== null ? `${pingLatency} ms` : 'Active'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Socket.IO Status:</span>
              <span style={{ fontWeight: 700, color: isConnected ? '#34d399' : '#f87171' }}>
                {isConnected ? 'Real-Time Connected' : 'Waiting for connection...'}
              </span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleSendPing} style={{ marginTop: '1.5rem', width: '100%' }}>
            <Send size={18} /> Test Real-time Socket Ping
          </button>
        </div>

        {/* Project Architecture */}
        <div className="card">
          <h2 className="card-title">
            <ShieldCheck size={22} color="#ff007f" />
            Modular Architecture
          </h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">client/</span> React 18 + Vite frontend
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">server/</span> Node.js + Express + Socket.IO server authority
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">network/</span> HotspotController & device detection
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">database/</span> Repository layer & Firestore adapter
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">games/</span> GameManager & minigame engines
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="code-pill">shared/</span> Events, constants & shared contracts
            </li>
          </ul>
        </div>
      </main>

      {/* Activity Log */}
      <section className="card">
        <h2 className="card-title">
          <Activity size={22} color="#10b981" />
          Real-Time Activity Log
        </h2>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            background: 'rgba(0, 0, 0, 0.5)',
            padding: '1rem',
            borderRadius: '12px',
            minHeight: '140px',
            maxHeight: '200px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}
        >
          {serverLog.length === 0 ? (
            <span style={{ color: 'var(--text-muted)' }}>Waiting for activity...</span>
          ) : (
            serverLog.map((log, index) => (
              <div key={index} style={{ color: index === 0 ? '#34d399' : 'var(--text-muted)' }}>
                {log}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default App;
