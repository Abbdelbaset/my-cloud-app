const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
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

// خدمة الملفات الثابتة للعميل
app.use(express.static(path.join(__dirname, '../client')));

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>نظام إدارة الأجهزة</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          text-align: center; 
          padding: 50px; 
          background-color: #f5f5f5;
          color: #333;
        }
        .container { 
          max-width: 800px; 
          margin: 0 auto; 
          background: white;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
          color: #0066cc; 
          margin-bottom: 20px;
        }
        .btn { 
          display: inline-block; 
          padding: 12px 24px; 
          background: #0066cc; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px; 
          margin: 10px; 
          transition: background 0.3s;
        }
        .btn:hover {
          background: #0052a3;
        }
        .status {
          margin-top: 20px;
          padding: 15px;
          background: #f0f8ff;
          border-radius: 5px;
          border-left: 4px solid #0066cc;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>نظام إدارة الأجهزة يعمل بنجاح! 🚀</h1>
        <p>الخادم يعمل بشكل صحيح. لتجربة واجهة الإدارة:</p>
        <div>
          <a href="/admin" class="btn">لوحة التحكم</a>
          <a href="/health" class="btn">فحص حالة الخادم</a>
          <a href="/api/devices" class="btn">قائمة الأجهزة</a>
        </div>
        <div class="status">
          <strong>معلومات الخادم:</strong><br>
          البورت: ${process.env.PORT || 10000}<br>
          الوضع: ${process.env.NODE_ENV || 'development'}<br>
          وقت التشغيل: ${new Date().toLocaleString()}
        </div>
      </div>
    </body>
    </html>
  `);
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
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

// تخزين مؤقت للأجهزة المتصلة
const connectedDevices = new Map();

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
    
    // إعلام جميع العملاء بتحديث قائمة الأجهزة
    io.emit('device-connected', { deviceId: deviceId });
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
        
        // إعلام جميع العملاء بفصل الجهاز
        io.emit('device-disconnected', { deviceId: id });
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} in your browser`);
});
