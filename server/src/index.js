const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { setupSocketHandlers } = require('./socket/handlers');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
});

const clientDistPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', game: 'Last Hand Standing' });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n  🃏 Last Hand Standing Server`);
  console.log(`  ─────────────────────────`);
  console.log(`  Server running on port ${PORT}`);
  console.log(`  http://localhost:${PORT}\n`);
});
