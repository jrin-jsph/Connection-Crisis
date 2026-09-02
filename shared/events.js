export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Connection & Handshake
  PING: 'ping_check',
  PONG: 'pong_check',
  
  // Host events
  HOST_GET_STATUS: 'host:get_status',
  HOST_STATUS_UPDATE: 'host:status_update',
  
  // Player lifecycle
  PLAYER_REGISTER: 'player:register',
  PLAYER_REGISTERED: 'player:registered',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_RECONNECTED: 'player:reconnected',
  PLAYER_STATUS_UPDATE: 'player:status_update',
  
  // Challenge & Doppelganger
  CHALLENGE_CREATED: 'challenge:created',
  CHALLENGE_ENTER: 'challenge:enter',
  CHALLENGE_STARTED: 'challenge:started',
  CHALLENGE_TIMEOUT: 'challenge:timeout',
  
  // Minigame Engine
  GAME_SELECTED: 'game:selected',
  GAME_START: 'game:start',
  GAME_ACTION: 'game:action',
  GAME_STATE_UPDATE: 'game:state_update',
  GAME_FINISHED: 'game:finished',
  
  // Elimination & Royale
  PLAYER_ELIMINATED: 'player:eliminated',
  PLAYER_REJOIN: 'player:rejoin',
  ROYALE_STARTED: 'royale:started',
  ROYALE_ROUND_START: 'royale:round_start',
  ROYALE_ROUND_FINISH: 'royale:round_finish',
  ROYALE_FINISHED: 'royale:finished'
};

export const PLAYER_STATUS = {
  ACTIVE: 'ACTIVE',
  IN_CHALLENGE: 'IN_CHALLENGE',
  IN_GAME: 'IN_GAME',
  ELIMINATED: 'ELIMINATED',
  DISCONNECTED: 'DISCONNECTED'
};

export const CHALLENGE_STATUS = {
  CREATED: 'CREATED',
  WAITING: 'WAITING',
  COUNTDOWN: 'COUNTDOWN',
  GAME_SELECTED: 'GAME_SELECTED',
  GAME_RUNNING: 'GAME_RUNNING',
  FINISHED: 'FINISHED',
  RESULT: 'RESULT',
  COMPLETED: 'COMPLETED',
  TIMEOUT: 'TIMEOUT'
};
