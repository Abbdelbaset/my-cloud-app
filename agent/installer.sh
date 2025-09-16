#!/bin/bash

# برنامج تثبيت العميل على أنظمة Linux

echo "جاري تثبيت عميل إدارة الأجهزة..."

# التحقق من وجود Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js غير مثبت. جاري التثبيت..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# إنشاء مجلد التطبيق
sudo mkdir -p /opt/device-agent
sudo chown $USER:$USER /opt/device-agent

# نسخ ملفات العميل
cp -r . /opt/device-agent/
cd /opt/device-agent

# تثبيت dependencies
npm install

# إنشاء ملف خدمة systemd
echo "[Unit]
Description=Device Management Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/device-agent
Environment=SERVER_URL=https://your-render-app.onrender.com
ExecStart=/usr/bin/node /opt/device-agent/agent.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target" | sudo tee /etc/systemd/system/device-agent.service

# إعادة تحميل systemd وتشغيل الخدمة
sudo systemctl daemon-reload
sudo systemctl enable device-agent
sudo systemctl start device-agent

echo "تم تثبيت العميل بنجاح!"
echo="لتعديل إعدادات الخادم، عدل ملف الخدمة: /etc/systemd/system/device-agent.service"
