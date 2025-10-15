const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const { getStockPrices } = require('./services/yahooService');

const app = express();
const PORT = process.env.PORT || 3000;
const STOCKS_FILE = path.join(__dirname, 'stocks.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ==================== Helper Functions ====================

/**
 * อ่านข้อมูลหุ้นจากไฟล์
 */
async function readStocks() {
  try {
    const data = await fs.readFile(STOCKS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // ถ้าไฟล์ไม่มี ให้สร้างใหม่
    await fs.writeFile(STOCKS_FILE, '[]', 'utf8');
    return [];
  }
}

/**
 * เขียนข้อมูลหุ้นลงไฟล์
 */
async function writeStocks(stocks) {
  await fs.writeFile(STOCKS_FILE, JSON.stringify(stocks, null, 2), 'utf8');
}

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
    const stocks = await readStocks();
    
    if (stocks.length === 0) {
      console.log('📭 No stocks to update');
      return;
    }

    console.log(`\n🔄 Updating prices for ${stocks.length} stock(s)...`);
    const symbols = stocks.map(s => s.symbol);
    const prices = await getStockPrices(symbols);

    // อัปเดตราคาและคำนวณระยะ
    let updatedCount = 0;
    stocks.forEach(stock => {
      if (prices[stock.symbol]) {
        stock.lastPrice = prices[stock.symbol].price;
        stock.currency = prices[stock.symbol].currency;
        stock.marketState = prices[stock.symbol].marketState;
        stock.shortName = prices[stock.symbol].shortName;
        
        const supportInfo = calculateNearestSupport(stock.lastPrice, stock.supportLevels);
        stock.nearestSupport = supportInfo.nearestSupport;
        stock.distanceToNearestSupport = supportInfo.distance;
        stock.distancePercent = supportInfo.distancePercent;
        
        updatedCount++;
      }
    });

    await writeStocks(stocks);
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
    const stocks = await readStocks();
    
    // เรียงลำดับตาม distanceToNearestSupport (ใกล้ที่สุดอยู่บนสุด)
    stocks.sort((a, b) => {
      if (a.distanceToNearestSupport === null) return 1;
      if (b.distanceToNearestSupport === null) return -1;
      return Math.abs(a.distanceToNearestSupport) - Math.abs(b.distanceToNearestSupport);
    });

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

    const stocks = await readStocks();

    // ตรวจสอบว่ามีหุ้นนี้อยู่แล้วหรือไม่
    const existingIndex = stocks.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());
    
    if (existingIndex !== -1) {
      return res.status(400).json({
        success: false,
        error: `หุ้น ${symbol} มีอยู่ในระบบแล้ว`
      });
    }

    // ดึงราคาปัจจุบันจาก Yahoo
    const prices = await getStockPrices([symbol.toUpperCase()]);
    
    if (!prices[symbol.toUpperCase()]) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบข้อมูลหุ้น ${symbol}`
      });
    }

    const priceData = prices[symbol.toUpperCase()];
    const supportInfo = calculateNearestSupport(priceData.price, supportLevels);

    const newStock = {
      symbol: symbol.toUpperCase(),
      shortName: priceData.shortName,
      supportLevels: supportLevels.sort((a, b) => b - a), // เรียงจากมากไปน้อย
      lastPrice: priceData.price,
      currency: priceData.currency,
      marketState: priceData.marketState,
      nearestSupport: supportInfo.nearestSupport,
      distanceToNearestSupport: supportInfo.distance,
      distancePercent: supportInfo.distancePercent,
      createdAt: new Date().toISOString()
    };

    stocks.push(newStock);
    await writeStocks(stocks);

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
    const stocks = await readStocks();

    const index = stocks.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: `ไม่พบหุ้น ${symbol}`
      });
    }

    const deletedStock = stocks.splice(index, 1)[0];
    await writeStocks(stocks);

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

    if (!supportLevels || !Array.isArray(supportLevels)) {
      return res.status(400).json({
        success: false,
        error: 'กรุณาระบุ supportLevels (array)'
      });
    }

    const stocks = await readStocks();
    const stock = stocks.find(s => s.symbol.toUpperCase() === symbol.toUpperCase());

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

    await writeStocks(stocks);

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
