import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import HostDashboard from './components/HostDashboard.jsx';
import { SOCKET_EVENTS } from '../../shared/events.js';

function App() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hostData, setHostData] = useState(null);

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

    // Fetch initial status via REST
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

  return (
    <HostDashboard 
      socket={socket} 
      isConnected={isConnected} 
      hostData={hostData} 
      onRequestRefresh={handleRequestRefresh}
    />
  );
}

export default App;
