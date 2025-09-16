// الاتصال بالخادم
const socket = io();

// عناصر DOM
const devicesList = document.getElementById('devices-list');
const deviceSelect = document.getElementById('device-select');
const connectedDevicesElement = document.getElementById('connected-devices');
const sentCommandsElement = document.getElementById('sent-commands');
const commandInput = document.getElementById('command-input');
const commandResult = document.getElementById('command-result');

let devices = [];
let commandCount = 0;

// تحديث قائمة الأجهزة
function updateDevicesList(devicesArray) {
    devices = devicesArray;
    connectedDevicesElement.textContent = devicesArray.length;
    
    // تحديث قائمة العرض
    if (devicesArray.length === 0) {
        devicesList.innerHTML = '<p>لا توجد أجهزة متصلة حالياً...</p>';
    } else {
        devicesList.innerHTML = '';
        devicesArray.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = 'device-item';
            deviceElement.innerHTML = `
                <div>
                    <strong>${device.hostname}</strong> (${device.os})
                </div>
                <div>آخر اتصال: ${new Date(device.lastSeen).toLocaleString()}</div>
            `;
            devicesList.appendChild(deviceElement);
        });
    }
    
    // تحديث قائمة الاختيار
    deviceSelect.innerHTML = '<option value="">اختر الجهاز</option>';
    devicesArray.forEach(device => {
        const option = document.createElement('option');
        option.value = device.id;
        option.textContent = `${device.hostname} (${device.id})`;
        deviceSelect.appendChild(option);
    });
}

// إرسال أمر للجهاز
function sendCommand() {
    const deviceId = deviceSelect.value;
    const command = commandInput.value.trim();
    
    if (!deviceId) {
        alert('يرجى اختيار جهاز');
        return;
    }
    
    if (!command) {
        alert('يرجى إدخال أمر');
        return;
    }
    
    fetch('/api/command', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ deviceId, command })
    })
    .then(response => response.json())
    .then(data => {
        commandCount++;
        sentCommandsElement.textContent = commandCount;
        commandResult.innerHTML = `<p>تم إرسال الأمر للجهاز: ${data.message}</p>`;
        commandInput.value = '';
    })
    .catch(error => {
        console.error('Error:', error);
        commandResult.innerHTML = `<p style="color: red;">خطأ في إرسال الأمر: ${error.message}</p>`;
    });
}

// جلب قائمة الأجهزة عند تحميل الصفحة
fetch('/api/devices')
    .then(response => response.json())
    .then(devices => {
        updateDevicesList(devices);
    })
    .catch(error => {
        console.error('Error fetching devices:', error);
    });

// الاستماع لتحديثات الأجهزة من الخادم
socket.on('device-connected', (device) => {
    // عندما يتصل جهاز جديد، نحدث القائمة
    fetch('/api/devices')
        .then(response => response.json())
        .then(devices => {
            updateDevicesList(devices);
        });
});

socket.on('device-disconnected', (deviceId) => {
    // عندما ينقطع جهاز، نحدث القائمة
    fetch('/api/devices')
        .then(response => response.json())
        .then(devices => {
            updateDevicesList(devices);
        });
});
