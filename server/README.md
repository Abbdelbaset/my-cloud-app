# الخادم (Server)

هذا هو الجزء الخلفي من النظام، يعمل على Node.js مع Express وSocket.IO.

## التنصيب

1. انتقل للمجلد: `cd server`
2. ثبت التبعيات: `npm install`
3. انسخ ملف البيئة: `cp .env.example .env`
4. عدل ملف `.env` بإضافة الإعدادات المناسبة
5. شغّل الخادم: `npm start` (لل production) أو `npm run dev` (لل development)

## API المتاحة

- `GET /health` - للتحقق من حالة الخادم
- `GET /api/devices` - للحصول على قائمة الأجهزة المتصلة
- `POST /api/command` - لإرسال أمر لجهاز معين
