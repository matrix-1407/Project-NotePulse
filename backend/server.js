import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer } from 'ws';
import http from 'http';
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

// Create HTTP server for potential future HTTPS/upgrade
const server = http.createServer(app);

/**
 * Setup Yjs WebSocket Server
 * This server manages real-time document collaboration via Yjs
 * For production, consider using y-websocket middleware or a dedicated service
 */
const wss = new WebSocketServer({ port: Y_WEBSOCKET_PORT });

// Store document states (in-memory for scaffold)
const docs = new Map();

wss.on('connection', (ws, req) => {
  console.log(`Y-WebSocket client connected from ${req.socket.remoteAddress}`);

  ws.on('message', (data) => {
    console.log(`Received Yjs message: ${data.length} bytes`);
    // TODO: Implement y-websocket protocol handling
    // For full implementation, use y-websocket package with persistence layer
  });

  ws.on('close', () => {
    console.log('Y-WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('Y-WebSocket error:', error);
  });
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

export { wss, docs };
