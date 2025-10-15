const YahooFinanceClass = require('yahoo-finance2').default;

/**
 * Yahoo Finance Service (Using yahoo-finance2 library)
 * ดึงข้อมูลราคาหุ้นจาก Yahoo Finance อย่างมีประสิทธิภาพ
 * ✅ Built-in rate limiting
 * ✅ Built-in error handling  
 * ✅ TypeScript support
 * ✅ No mock data - Real prices only
 */

// สร้าง Yahoo Finance instance (ปิด survey notice)
const yahooFinance = new YahooFinanceClass({
  suppressNotices: ['yahooSurvey']
});

/**
 * ดึงราคาหุ้นปัจจุบันจาก Yahoo Finance
 * @param {string[]} symbols - Array ของ ticker symbols (เช่น ['AAPL', 'TSLA'])
 * @returns {Promise<Object>} - Object ที่มี key เป็น symbol และ value เป็นราคา
 */
async function getStockPrices(symbols) {
  if (!symbols || symbols.length === 0) {
    return {};
  }

  try {
    console.log(`🔍 Fetching prices for: ${symbols.join(', ')}`);
    
    // ใช้ yahoo-finance2 quote method
    const quotes = await yahooFinance.quote(symbols);
    
    // แปลงเป็น Object { symbol: price }
    const prices = {};
    
    // ถ้าดึงหุ้นเดียว quotes จะเป็น object, ถ้าหลายตัวจะเป็น array
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes];
    
    quotesArray.forEach(quote => {
      // ใช้ regularMarketPrice หรือ preMarketPrice (ถ้ามี)
      const price = quote.regularMarketPrice || quote.preMarketPrice || quote.postMarketPrice || 0;
      
      prices[quote.symbol] = {
        price: price,
        regularMarketPrice: quote.regularMarketPrice || 0,
        preMarketPrice: quote.preMarketPrice || 0,
        postMarketPrice: quote.postMarketPrice || 0,
        currency: quote.currency || 'USD',
        marketState: quote.marketState || 'REGULAR',
        shortName: quote.shortName || quote.longName || quote.symbol,
        // ข้อมูลเพิ่มเติม
        change: quote.regularMarketChange || 0,
        changePercent: quote.regularMarketChangePercent || 0,
        dayHigh: quote.regularMarketDayHigh || 0,
        dayLow: quote.regularMarketDayLow || 0
      };
    });

    console.log(`✅ Successfully fetched ${quotesArray.length} stock(s)`);
    return prices;
    
  } catch (error) {
    console.error(`❌ Yahoo Finance Error: ${error.message}`);
    
    // แสดงข้อมูล error ที่ละเอียดขึ้น
    if (error.message.includes('Not Found') || error.message.includes('404')) {
      console.error(`💡 One or more symbols not found: ${symbols.join(', ')}`);
    } else if (error.message.includes('Too Many Requests') || error.message.includes('429')) {
      console.error(`💡 Rate limited. Try again in a few seconds.`);
    } else {
      console.error(`💡 Check your internet connection or try again later.`);
    }
    
    throw new Error(`Failed to fetch stock prices: ${error.message}`);
  }
}

/**
 * ดึงข้อมูลหุ้นแบบละเอียด (เพิ่มเติม)
 * @param {string} symbol - Ticker symbol
 * @returns {Promise<Object>} - ข้อมูลหุ้นแบบละเอียด
 */
async function getStockDetails(symbol) {
  try {
    console.log(`🔍 Fetching details for: ${symbol}`);
    
    const quote = await yahooFinance.quote(symbol);
    
    if (!quote) {
      throw new Error(`Stock symbol ${symbol} not found`);
    }

    console.log(`✅ Successfully fetched details for ${symbol}`);
    
    return {
      symbol: quote.symbol,
      shortName: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice || 0,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      dayHigh: quote.regularMarketDayHigh || 0,
      dayLow: quote.regularMarketDayLow || 0,
      volume: quote.regularMarketVolume || 0,
      marketCap: quote.marketCap || 0,
      currency: quote.currency || 'USD',
      marketState: quote.marketState || 'REGULAR'
    };
  } catch (error) {
    console.error(`❌ Error fetching details for ${symbol}: ${error.message}`);
    throw error;
  }
}

/**
 * ดึงข้อมูลประวัติราคา (Historical Data)
 * @param {string} symbol - Ticker symbol
 * @param {Object} options - Options { period1, period2, interval }
 * @returns {Promise<Object>} - ข้อมูลประวัติราคา
 */
async function getHistoricalData(symbol, options = {}) {
  try {
    const defaultOptions = {
      period1: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 วันที่แล้ว
      period2: new Date(), // วันนี้
      interval: '1d', // รายวัน
      ...options
    };
    
    const result = await yahooFinance.historical(symbol, defaultOptions);
    console.log(`✅ Fetched ${result.length} historical records for ${symbol}`);
    
    return result;
  } catch (error) {
    console.error(`❌ Error fetching historical data for ${symbol}: ${error.message}`);
    throw error;
  }
}

/**
 * ค้นหาหุ้น (Search symbols)
 * @param {string} query - คำค้นหา
 * @returns {Promise<Array>} - รายการหุ้นที่เจอ
 */
async function searchSymbols(query) {
  try {
    const result = await yahooFinance.search(query);
    console.log(`✅ Found ${result.quotes?.length || 0} results for "${query}"`);
    
    return result.quotes || [];
  } catch (error) {
    console.error(`❌ Error searching for "${query}": ${error.message}`);
    throw error;
  }
}

module.exports = {
  getStockPrices,
  getStockDetails,
  getHistoricalData,
  searchSymbols
};
