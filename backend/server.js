const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve Frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/pharmacies', require('./routes/pharmacies'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/auth'));
// Root - Send Frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Socket.io - Live stock updates
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  socket.on('stockUpdated', (data) => {
    io.emit('stockChanged', data);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected!');
    server.listen(process.env.PORT, () => {
      console.log(`✅ Server running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch(err => console.log('❌ MongoDB Error:', err));
  // Keep alive ping every 14 minutes
const https = require('https');
setInterval(() => {
  https.get('https://medicine-finder-gvri.onrender.com', (res) => {
    console.log('Keep alive ping sent:', res.statusCode);
  }).on('error', (err) => {
    console.log('Keep alive error:', err.message);
  });
}, 14 * 60 * 1000);