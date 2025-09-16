const io = require('socket.io-client');
const si = require('systeminformation');
const { v4: uuidv4 } = require('uuid');

// إعدادات الاتصال (سيتم تغييرها عند النشر)
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:10000';
let deviceId = process.env.DEVICE_ID || uuidv4();
let socket = null;

// جمع معلومات النظام
async function getSystemInfo() {
    try {
        const [osInfo, cpu, mem, networkInterfaces] = await Promise.all([
            si.osInfo(),
            si.cpu(),
            si.mem(),
            si.networkInterfaces()
        ]);
        
        return {
            hostname: osInfo.hostname,
            os: `${osInfo.distro} ${osInfo.release}`,
            platform: osInfo.platform,
            arch: osInfo.arch,
            cpu: cpu.manufacturer + ' ' + cpu.brand,
            memory: Math.round(mem.total / 1024 / 1024 / 1024) + ' GB',
            ip: networkInterfaces.find(intf => intf.default)?.ip4 || 'غير معروف'
        };
    } catch (error) {
        console.error('Error getting system info:', error);
        return {
            hostname: 'unknown',
            os: 'unknown',
            platform: 'unknown',
            arch: 'unknown',
            cpu: 'unknown',
            memory: 'unknown',
            ip: 'unknown'
        };
    }
}

// الاتصال بالخادم
async function connectToServer() {
    try {
        console.log('جاري الاتصال بالخادم:', SERVER_URL);
        
        socket = io(SERVER_URL, {
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000
        });
        
        socket.on('connect', async () => {
            console.log('تم الاتصال بالخادم');
            
            // جمع معلومات النظام وإرسالها للتسجيل
            const systemInfo = await getSystemInfo();
            socket.emit('register-device', systemInfo);
        });
        
        socket.on('device-registered', (data) => {
            deviceId = data.deviceId;
            console.log('تم تسجيل الجهاز بالمعرف:', deviceId);
        });
        
        socket.on('execute-command', async (data) => {
            console.log('تم استقبال أمر:', data.command);
            
            // تنفيذ الأمر (هنا يجب إضافة التحقق من صحة الأمر لأسباب أمنية)
            const { exec } = require('child_process');
            
            exec(data.command, { timeout: 30000 }, (error, stdout, stderr) => {
                const result = {
                    commandId: data.commandId,
                    command: data.command,
                    success: !error,
                    output: stdout || stderr,
                    error: error ? error.message : null,
                    timestamp: new Date().toISOString()
                };
                
                // إرسال نتيجة التنفيذ للخادم
                socket.emit('command-result', result);
                console.log('تم إرسال نتيجة الأمر للخادم');
            });
        });
        
        socket.on('disconnect', (reason) => {
            console.log('انقطع الاتصال بالخادم:', reason);
        });
        
        socket.on('connect_error', (error) => {
            console.error('خطأ في الاتصال:', error.message);
        });
        
    } catch (error) {
        console.error('خطأ في الاتصال بالخادم:', error);
        // إعادة المحاولة بعد 10 ثواني
        setTimeout(connectToServer, 10000);
    }
}

// بدء الاتصال
connectToServer();

// إبقاء البرنامج يعمل
process.on('SIGINT', () => {
    console.log('إيقاف العميل...');
    if (socket) socket.disconnect();
    process.exit(0);
});
