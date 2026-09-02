import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import HostDashboard from './components/HostDashboard.jsx';
import PlayerView from './components/PlayerView.jsx';
import { SOCKET_EVENTS } from '../../shared/events.js';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostData, setHostData] = useState(null);

  // Determine initial view mode based on URL query param (e.g. ?mode=player or ?mode=host)
  const [viewMode, setViewMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') || 'host'; // Default to host on main laptop, players use ?mode=player or default if specified
  });

  useEffect(() => {
    const socketInstance = io({
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on(SOCKET_EVENTS.CONNECT, () => {
      setIsConnected(true);
      socketInstance.emit(SOCKET_EVENTS.HOST_GET_STATUS);
    });

    socketInstance.on(SOCKET_EVENTS.DISCONNECT, () => {
      setIsConnected(false);
    });

    socketInstance.on(SOCKET_EVENTS.HOST_STATUS_UPDATE, (data) => {
      setHostData(data);
    });

    fetch('/api/host/status')
      .then((res) => res.json())
      .then((data) => setHostData(data))
      .catch((err) => console.error('Error fetching initial host status:', err));

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleRequestRefresh = () => {
    if (socket && isConnected) {
      socket.emit(SOCKET_EVENTS.HOST_GET_STATUS);
    }
  };

  const switchView = (mode) => {
    setViewMode(mode);
    const url = new URL(window.location);
    url.searchParams.set('mode', mode);
    window.history.pushState({}, '', url);
  };

  return (
    <div>
      {/* Top Floating View Switcher for easy multi-window pair testing */}
      <div style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: 'rgba(10, 11, 16, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: 30,
        padding: '4px 8px',
        display: 'flex',
        gap: 6,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <button
          onClick={() => switchView('host')}
          className={`btn ${viewMode === 'host' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', borderRadius: 20 }}
        >
          🖥️ Host View
        </button>
        <button
          onClick={() => switchView('player')}
          className={`btn ${viewMode === 'player' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '0.35rem 0.8rem', fontSize: '0.78rem', borderRadius: 20 }}
        >
          📱 Player View
        </button>
      </div>

      {viewMode === 'host' ? (
        <HostDashboard
          socket={socket}
          isConnected={isConnected}
          hostData={hostData}
          onRequestRefresh={handleRequestRefresh}
          onOpenPlayerView={() => switchView('player')}
        />
      ) : (
        <PlayerView
          socket={socket}
          isConnected={isConnected}
          onSwitchToHost={() => switchView('host')}
        />
      )}
    </div>
  );
}

export default App;
