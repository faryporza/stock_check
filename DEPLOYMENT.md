# Stock Tracker - Koyeb Deployment Guide

## 📋 Pre-requisites

1. **MongoDB Atlas Account** - สำหรับเก็บข้อมูล (ฟรี)
2. **Koyeb Account** - สำหรับ deploy application (ฟรี)
3. **GitHub Repository** - เก็บ source code

---

## 🚀 Deployment Steps

### 1. ตั้งค่า MongoDB Atlas (ถ้ายังไม่มี)

1. ไปที่ https://www.mongodb.com/cloud/atlas/register
2. สร้าง Cluster ใหม่ (เลือก Free Tier)
3. สร้าง Database User (username/password)
4. เพิ่ม IP Address `0.0.0.0/0` ใน Network Access (เพื่อให้ Koyeb เข้าถึงได้)
5. คัดลอก Connection String

### 2. Deploy บน Koyeb

#### A. จาก GitHub (แนะนำ)

1. ไปที่ https://app.koyeb.com
2. คลิก **"Create App"**
3. เลือก **"GitHub"** เป็น source
4. เชื่อมต่อ GitHub account และเลือก repository: `faryporza/stock_check`
5. เลือก branch: `main`
6. ตั้งค่า Build & Deploy:
   - **Build command**: `npm install`
   - **Run command**: `npm start`
   - **Port**: `8000` (Koyeb จะใช้ port 8000 โดย auto)

#### B. ตั้งค่า Environment Variables

ในหน้า **"Environment Variables"** เพิ่ม:

```bash
# Required
MONGODB_URI=mongodb+srv://farypor:Opor_200956@cluster0.c8ia1mo.mongodb.net/stock-tracker?retryWrites=true&w=majority&appName=Cluster0

# Optional (Koyeb จะ set อัตโนมัติ)
PORT=8000
```

> ⚠️ **สำคัญ**: ใช้ `stock-tracker` เป็นชื่อ database (ไม่ใช่ `expense-ai`)

#### C. Deploy

7. คลิก **"Deploy"**
8. รอ 2-3 นาที ให้ build & deploy เสร็จ
9. Koyeb จะให้ URL เช่น: `https://your-app-name.koyeb.app`

---

## ✅ ตรวจสอบการ Deploy

### 1. เช็ค Logs

ใน Koyeb Dashboard → เลือก App → **"Logs"** tab

ควรเห็น:
```
✅ Connected to MongoDB successfully
🚀 Running on http://localhost:8000
```

### 2. ทดสอบ API

เปิด browser ไปที่:
```
https://your-app-name.koyeb.app
```

### 3. เพิ่มหุ้นทดสอบ

- คลิก **"เพิ่มหุ้น"**
- ใส่ `AAPL` และแนวรับ เช่น `150, 145, 140`
- คลิก **"บันทึก"**

---

## 🔧 Troubleshooting

### ❌ Error: "Failed to fetch"

**สาเหตุ**: Frontend ใช้ `http://localhost:3000` แทนที่จะใช้ URL จริง

**แก้ไข**: ตรวจสอบว่า `app.js` และ `add-stock.js` ใช้:
```javascript
const API_BASE_URL = window.location.origin;
```

### ❌ Error: "MONGODB_URI is not defined"

**สาเหตุ**: ไม่ได้ตั้งค่า Environment Variable

**แก้ไข**: 
1. ไปที่ Koyeb → App Settings → Environment Variables
2. เพิ่ม `MONGODB_URI` ด้วย connection string ของคุณ
3. Redeploy

### ❌ Error: "listen EADDRINUSE"

**สาเหตุ**: มี `app.listen()` หลายจุดใน `server.js`

**แก้ไข**: ตรวจสอบว่ามี `app.listen()` เพียงที่เดียวท้ายไฟล์

### ❌ MongoDB Connection Failed

**สาเหตุ**: IP whitelist หรือ credentials ผิด

**แก้ไข**:
1. ไปที่ MongoDB Atlas → Network Access
2. เพิ่ม IP `0.0.0.0/0` (Allow from anywhere)
3. ตรวจสอบ username/password ใน connection string

---

## 📝 Auto-Deploy

Koyeb จะ **auto-deploy** ทุกครั้งที่ push ไปที่ GitHub:

```bash
git add .
git commit -m "update features"
git push
```

Koyeb จะ detect และ deploy ใหม่อัตโนมัติภายใน 2-3 นาที

---

## 🎯 Next Steps

- [ ] เพิ่ม Custom Domain (ถ้าต้องการ)
- [ ] ตั้งค่า Health Check
- [ ] เพิ่ม Monitoring/Alerts
- [ ] Backup MongoDB data
- [ ] เพิ่ม Authentication (ถ้าต้องการ)

---

## 📚 Resources

- **Koyeb Docs**: https://www.koyeb.com/docs
- **MongoDB Atlas**: https://www.mongodb.com/docs/atlas/
- **Project Repo**: https://github.com/faryporza/stock_check

---

## 💡 Tips

1. **Free Tier Limits** (Koyeb):
   - 1 Web Service
   - 512MB RAM
   - 2GB Storage
   - 100GB Bandwidth/month

2. **Free Tier Limits** (MongoDB Atlas):
   - 512MB Storage
   - Shared RAM
   - Unlimited Bandwidth

3. **Production Best Practices**:
   - ใช้ environment variables สำหรับ secrets
   - เพิ่ม rate limiting
   - ใช้ HTTPS เสมอ
   - Backup database เป็นประจำ
