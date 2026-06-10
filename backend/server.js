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
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/medicines', require('./routes/medicines'));
app.use('/api/pharmacy', require('./routes/pharmacies'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

io.on('connection', (socket) => {
  socket.on('stockUpdated', (data) => io.emit('stockChanged', data));
});

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected!');
    server.listen(process.env.PORT || 3000, () => {
      console.log('Server running on port', process.env.PORT || 3000);
    });
  })
  .catch(err => console.log('MongoDB Error:', err));

const https = require('https');
setInterval(() => {
  https.get('https://medicine-finder-gvri.onrender.com', () => {}).on('error', () => {});
}, 14 * 60 * 1000);
