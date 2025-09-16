const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// تخزين مؤقت للأجهزة المتصلة (في production استخدم قاعدة بيانات)
const connectedDevices = new Map();

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running!', timestamp: new Date().toISOString() });
});

app.get('/api/devices', (req, res) => {
  const devices = Array.from(connectedDevices.values()).map(device => ({
    id: device.id,
    hostname: device.hostname,
    os: device.os,
    lastSeen: device.lastSeen
  }));
  res.json(devices);
});

app.post('/api/command', (req, res) => {
  const { deviceId, command } = req.body;
  
  if (!deviceId || !command) {
    return res.status(400).json({ error: 'Device ID and command are required' });
  }
  
  const deviceSocket = connectedDevices.get(deviceId)?.socket;
  if (!deviceSocket) {
    return res.status(404).json({ error: 'Device not connected' });
  }
  
  // إرسال الأمر للجهاز
  deviceSocket.emit('execute-command', {
    commandId: uuidv4(),
    command: command,
    timestamp: new Date().toISOString()
  });
  
  res.json({ message: 'Command sent to device', deviceId: deviceId });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('register-device', (deviceInfo) => {
    const deviceId = uuidv4();
    connectedDevices.set(deviceId, {
      id: deviceId,
      socket: socket,
      hostname: deviceInfo.hostname || 'Unknown',
      os: deviceInfo.os || 'Unknown',
      lastSeen: new Date().toISOString()
    });
    
    socket.emit('device-registered', { deviceId: deviceId });
    console.log('Device registered:', deviceId, deviceInfo.hostname);
  });
  
  socket.on('command-result', (data) => {
    console.log('Command result received:', data);
    // هنا يمكنك حفظ النتائج في قاعدة بيانات
  });
  
  socket.on('disconnect', () => {
    // إزالة الجهاز من القائمة عند انقطاع الاتصال
    for (let [id, device] of connectedDevices) {
      if (device.socket.id === socket.id) {
        connectedDevices.delete(id);
        console.log('Device disconnected:', id);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
