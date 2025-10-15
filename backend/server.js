require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database');
const Stock = require('./models/Stock');
const { getStockPrices } = require('./services/yahooService');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB().catch(err => {
  console.error('Failed to connect to MongoDB:', err);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== Helper Functions ====================

/**
 * คำนวณระยะห่างจากแนวรับที่ใกล้ที่สุด
 */
function calculateNearestSupport(currentPrice, supportLevels) {
  if (!supportLevels || supportLevels.length === 0) {
    return { nearestSupport: null, distance: null, distancePercent: null };
  }

  // หาแนวรับที่ใกล้ที่สุด
  let nearestSupport = supportLevels[0];
  let minDistance = Math.abs(currentPrice - supportLevels[0]);

  supportLevels.forEach(level => {
    const distance = Math.abs(currentPrice - level);
    if (distance < minDistance) {
      minDistance = distance;
      nearestSupport = level;
    }
  });

  const distance = currentPrice - nearestSupport;
  const distancePercent = ((distance / nearestSupport) * 100).toFixed(2);

  return {
    nearestSupport,
    distance: parseFloat(distance.toFixed(2)),
    distancePercent: parseFloat(distancePercent)
  };
}

/**
 * อัปเดตราคาหุ้นทั้งหมด
 */
async function updateAllPrices() {
  try {
    const stocks = await Stock.find();
    
    if (stocks.length === 0) {
      console.log('📭 No stocks to update');
      return;
    }

    console.log(`\n🔄 Updating prices for ${stocks.length} stock(s)...`);
    const symbols = stocks.map(s => s.symbol);
    const prices = await getStockPrices(symbols);

    // อัปเดตราคาและคำนวณระยะ
    let updatedCount = 0;
    for (const stock of stocks) {
      if (prices[stock.symbol]) {
        stock.lastPrice = prices[stock.symbol].price;
        stock.name = prices[stock.symbol].shortName || stock.name;
        
        const supportInfo = calculateNearestSupport(stock.lastPrice, stock.supportLevels);
        stock.nearestSupport = supportInfo.nearestSupport;
        stock.distanceToNearestSupport = supportInfo.distance;
        stock.distancePercent = supportInfo.distancePercent;
        stock.lastUpdated = new Date();
        
        await stock.save();
        updatedCount++;
      }
    }

    console.log(`✅ Updated ${updatedCount}/${stocks.length} stocks successfully at ${new Date().toLocaleTimeString('th-TH')}\n`);
  } catch (error) {
    console.error(`\n❌ Failed to update prices: ${error.message}`);
    console.error('💡 Will retry on next interval...\n');
  }
}

// ==================== API Routes ====================

/**
 * GET /stocks
 * ดึงรายการหุ้นทั้งหมดพร้อมราคาปัจจุบัน
 */
app.get('/stocks', async (req, res) => {
  try {
    const stocks = await Stock.find().sort({ distanceToNearestSupport: 1 }).lean();

    res.json({
      success: true,
      data: stocks,
      count: stocks.length,
      lastUpdate: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /stocks
 * เพิ่มหุ้นใหม่พร้อมแนวรับ
 * Body: { symbol: 'AAPL', supportLevels: [150, 145, 140] }
 */
app.post('/stocks', async (req, res) => {
  try {
    const { symbol, supportLevels } = req.body;

    if (!symbol || !supportLevels || !Array.isArray(supportLevels)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ symbol และ supportLevels (array)'
      });
    }

    const symbolUpper = symbol.toUpperCase();

    // ตรวจสอบว่ามีหุ้นนี้อยู่แล้วหรือไม่
    const existingStock = await Stock.findOne({ symbol: symbolUpper });
    
    if (existingStock) {
      return res.status(400).json({
        success: false,
        error: `หุ้น ${symbol} มีอยู่ในระบบแล้ว`
      });
    }

    // ดึงราคาปัจจุบันจาก Yahoo
    const prices = await getStockPrices([symbolUpper]);
    
    if (!prices[symbolUpper]) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบข้อมูลหุ้น ${symbol}`
      });
    }

    const priceData = prices[symbolUpper];
    const supportInfo = calculateNearestSupport(priceData.price, supportLevels);

    const newStock = new Stock({
      symbol: symbolUpper,
      name: priceData.shortName,
      supportLevels: supportLevels.sort((a, b) => b - a), // เรียงจากมากไปน้อย
      lastPrice: priceData.price,
      nearestSupport: supportInfo.nearestSupport,
      distanceToNearestSupport: supportInfo.distance,
      distancePercent: supportInfo.distancePercent
    });

    await newStock.save();

    res.status(201).json({
      success: true,
      data: newStock,
      message: `เพิ่มหุ้น ${symbol} สำเร็จ`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /stocks/:symbol
 * ลบหุ้นออกจากระบบ
 */
app.delete('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const symbolUpper = symbol.toUpperCase();

    const deletedStock = await Stock.findOneAndDelete({ symbol: symbolUpper });

    if (!deletedStock) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบหุ้น ${symbol}`
      });
    }

    res.json({
      success: true,
      data: deletedStock,
      message: `ลบหุ้น ${symbol} สำเร็จ`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /stocks/:symbol
 * แก้ไขแนวรับของหุ้น
 */
app.patch('/stocks/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { supportLevels } = req.body;
    const symbolUpper = symbol.toUpperCase();

    if (!supportLevels || !Array.isArray(supportLevels)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ supportLevels (array)'
      });
    }

    const stock = await Stock.findOne({ symbol: symbolUpper });

    if (!stock) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบหุ้น ${symbol}`
      });
    }

    stock.supportLevels = supportLevels.sort((a, b) => b - a);
    const supportInfo = calculateNearestSupport(stock.lastPrice, stock.supportLevels);
    stock.nearestSupport = supportInfo.nearestSupport;
    stock.distanceToNearestSupport = supportInfo.distance;
    stock.distancePercent = supportInfo.distancePercent;

    await stock.save();

    res.json({
      success: true,
      data: stock,
      message: `แก้ไขแนวรับของ ${symbol} สำเร็จ`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==================== Auto Update ====================

// อัปเดตราคาทุก 10 วินาที (เพื่อหลีกเลี่ยง rate limiting)
setInterval(updateAllPrices, 10000);

// อัปเดตครั้งแรกเมื่อ server เริ่มทำงาน
setTimeout(updateAllPrices, 5000);

// ==================== Start Server ====================

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║  📈 Stock Tracker API Server              ║
  ║  🚀 Running on http://localhost:${PORT}     ║
  ║  📊 Auto-update every 30 seconds          ║
  ║  ✨ Powered by yahoo-finance2             ║
  ╚═══════════════════════════════════════════╝
  
  💡 Tips:
  - Open web UI at http://localhost:${PORT}
  - Add stocks like AAPL, TSLA, GOOGL, MSFT
  - Watch this terminal for real-time updates
  - Check logs for API status and errors
  `);
});

module.exports = app;
