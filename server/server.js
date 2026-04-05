/**
 * COMMAND ZERO — Multiplayer Relay Server
 * Thin lockstep relay: generates map seed, assigns factions, forwards commands.
 * No game logic — clients simulate everything deterministically.
 *
 * Railway-compatible version:
 * - Uses a single HTTP server on process.env.PORT
 * - WebSocket server is attached to the same HTTP server
 * - /ping works on the same public port
 *
 * Usage:
 *   npm install ws
 *   node server.js [port]        (default port: 8080)
 */

const http = require('http');
const WebSocket = require('ws');

const rawPort = process.env.PORT ?? process.argv[2] ?? '8080';
const PORT = Number.parseInt(rawPort, 10);

if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error(`Invalid port: ${rawPort}`);
}

console.log(`[CZ-Server] Starting on port ${PORT}`);

// ── Rooms ────────────────────────────────────────────────────────────────────
// Each room holds exactly 2 players.
// rooms: Map<roomId, Room>
const rooms = new Map();

let nextRoomId = 1;

function createRoom() {
  const id = nextRoomId++;
  const seed = Math.floor(Math.random() * 2_000_000_000); // 31-bit random seed
  const room = {
    id,
    seed,
    players: [],   // [{ws, faction, ready}]
    tick: 0,
    startedAt: null,
    closed: false,
  };
  rooms.set(id, room);
  return room;
}

// Find a waiting room with 1 player, or create a new one
function matchRoom() {
  for (const room of rooms.values()) {
    if (room.players.length === 1 && !room.closed) return room;
  }
  return createRoom();
}

function cleanRoom(room) {
  room.closed = true;
  rooms.delete(room.id);
}

// ── Message helpers ───────────────────────────────────────────────────────────
function send(ws, obj) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcast(room, obj, exceptWs = null) {
  for (const p of room.players) {
    if (p.ws !== exceptWs) send(p.ws, obj);
  }
}

// ── Single HTTP server for both /ping and WebSocket upgrades ─────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify({
      name: 'Command Zero Server',
      port: PORT,
      waiting: [...rooms.values()].filter(r => r.players.length === 1 && !r.closed).length,
      playing: [...rooms.values()].filter(r => r.players.length === 2 && !r.closed).length,
    }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Command Zero Server is running');
});

const wss = new WebSocket.Server({ server: httpServer });

// ── WebSocket connection handler ──────────────────────────────────────────────
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[+] Connect from ${ip}`);

  let room = null;
  let myFaction = null; // 'player' | 'opponent'

  // Join matchmaking immediately
  room = matchRoom();
  const isFirst = room.players.length === 0;
  myFaction = isFirst ? 'player' : 'opponent';

  room.players.push({ ws, faction: myFaction, ready: false });
  console.log(`[Room ${room.id}] ${myFaction} joined (${room.players.length}/2)`);

  // Tell this player their faction + seed (sent now, even while waiting)
  send(ws, {
    type: 'welcome',
    faction: myFaction,
    roomId: room.id,
    seed: room.seed,
    waiting: room.players.length < 2,
  });

  // If room is now full, notify both players to start
  if (room.players.length === 2) {
    room.startedAt = Date.now();
    console.log(`[Room ${room.id}] FULL — starting game (seed=${room.seed})`);
    broadcast(room, {
      type: 'start',
      seed: room.seed,
      playerFaction: null, // each client already knows their faction from 'welcome'
    });
  }

  // ── Message handler ─────────────────────────────────────────────────────────
  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (!room || room.closed) return;

    switch (msg.type) {
      case 'ready': {
        const me = room.players.find(p => p.ws === ws);
        if (me) me.ready = true;

        const allReady = room.players.length === 2 && room.players.every(p => p.ready);
        if (allReady) {
          broadcast(room, { type: 'allReady' });
          console.log(`[Room ${room.id}] Both ready — simulation starts`);
        }
        break;
      }

      case 'cmd': {
        room.tick++;
        const relayed = {
          type: 'cmd',
          tick: room.tick,
          faction: myFaction,
          cmd: msg.cmd,
        };
        broadcast(room, relayed, ws); // send to opponent only
        break;
      }

      case 'ping': {
        send(ws, { type: 'pong', t: msg.t });
        break;
      }

      case 'surrender': {
        broadcast(room, { type: 'opponentLeft', reason: 'surrender' }, ws);
        cleanRoom(room);
        break;
      }

      default:
        break;
    }
  });

  // ── Disconnect handler ─────────────────────────────────────────────────────
  ws.on('close', () => {
    console.log(`[-] ${myFaction} disconnected from room ${room?.id}`);
    if (room && !room.closed) {
      broadcast(room, { type: 'opponentLeft', reason: 'disconnect' }, ws);
      cleanRoom(room);
    }
  });

  ws.on('error', (err) => {
    console.error(`[WS Error] ${err.message}`);
  });
});

// ── Start server ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[CZ-Server] HTTP + WS listening on port ${PORT}`);
});

// ── Graceful shutdown ────────────────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n[CZ-Server] Shutting down...');
  wss.close(() => {
    httpServer.close(() => process.exit(0));
  });
});