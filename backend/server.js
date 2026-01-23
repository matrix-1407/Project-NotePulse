import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import { setupWSConnection } from 'y-websocket/bin/utils';
import docsRoutes from './routes/docs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const Y_WEBSOCKET_PORT = process.env.Y_WEBSOCKET_PORT || 1234;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('NotePulse backend running');
});

app.use('/api/docs', docsRoutes);

// Create HTTP server
const server = http.createServer(app);

/**
 * Setup Yjs WebSocket Server for real-time collaboration
 */
const wss = new WebSocketServer({ port: Y_WEBSOCKET_PORT });

wss.on('connection', (ws, req) => {
  console.log(`Yjs client connected from ${req.socket.remoteAddress}`);
  setupWSConnection(ws, req);
});

console.log(`Yjs WebSocket server listening on ws://localhost:${Y_WEBSOCKET_PORT}`);

// Start Express server
server.listen(PORT, () => {
  console.log(`NotePulse backend running on http://localhost:${PORT}`);
  console.log(`API routes available at http://localhost:${PORT}/api/docs`);
  console.log(
    `\n⚠️  Reminder: Keep .env with SUPABASE_SERVICE_ROLE_KEY out of version control`
  );
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    wss.close();
    process.exit(0);
  });
});
