# 📈 Stock Tracker - ระบบติดตามหุ้นเชิงเทคนิค

ระบบติดตามราคาหุ้นแบบเรียลไทม์ พร้อมการตั้งแนวรับหลายจุด และแสดงผลหุ้นที่ใกล้แนวรับที่สุด

## 🚀 คุณสมบัติ

- ✅ เพิ่ม/ลบหุ้นที่ต้องการติดตาม
- ✅ ตั้งแนวรับหลายระดับสำหรับแต่ละหุ้น
- ✅ อัปเดตราคาเรียลไทม์จาก Yahoo Finance
- ✅ คำนวณระยะห่างจากแนวรับอัตโนมัติ
- ✅ เรียงลำดับหุ้นตามความใกล้แนวรับ
- ✅ UI สวยงาม Responsive

## 📦 การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมด development
npm run dev

# รันในโหมด production
npm start
```

## 🌐 การใช้งาน

1. เปิดเว็บที่ `http://localhost:3000`
2. กรอกชื่อหุ้น (Ticker) เช่น AAPL, TSLA
3. เพิ่มแนวรับที่ต้องการติดตาม
4. คลิก "บันทึก" เพื่อเพิ่มหุ้นเข้าระบบ
5. ระบบจะอัปเดตราคาอัตโนมัติทุก 15 วินาที

## 📁 โครงสร้างโปรเจกต์

```
stock-tracker/
│
├─ backend/
│   ├─ server.js          # Express server + API routes
│   ├─ stocks.json        # เก็บข้อมูลหุ้นและแนวรับ
│   └─ services/
│       └─ yahooService.js # Yahoo Finance API service
│
├─ frontend/
│   ├─ index.html         # หน้าเว็บหลัก
│   ├─ style.css          # Styling
│   └─ app.js             # Frontend logic
│
├─ package.json
└─ README.md
```

## 🔌 API Endpoints

- `GET /stocks` - ดึงรายการหุ้นทั้งหมดพร้อมราคาปัจจุบัน
- `POST /stocks` - เพิ่มหุ้นใหม่พร้อมแนวรับ
- `DELETE /stocks/:symbol` - ลบหุ้นออกจากระบบ

## 🎯 ฟีเจอร์ในอนาคต

- 🔔 Alert เมื่อราคาใกล้/แตะแนวรับ
- 📊 Mini Chart แสดงกราฟหุ้น
- 🌙 Dark Mode
- 💾 Database (SQLite/MongoDB)
- 🔐 User Authentication
# stock_check
