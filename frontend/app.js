// ==================== Configuration ====================
const API_BASE_URL = 'http://localhost:3000';
const UPDATE_INTERVAL = 30000; // 30 วินาที (ลด rate limiting)

// ==================== State ====================
let updateTimer = null;
let allStocks = []; // เก็บข้อมูลหุ้นทั้งหมด
let filteredStocks = []; // เก็บข้อมูลหลังค้นหา/กรอง
let currentPage = 1;
let itemsPerPage = 10;
let currentSort = 'distance-baht'; // เริ่มต้นด้วยระยะห่างเป็นบาท
let searchQuery = '';

// ==================== DOM Elements ====================
const stocksContainer = document.getElementById('stocksContainer');
const stockCountElement = document.getElementById('stockCount');
const lastUpdateElement = document.getElementById('lastUpdate');
const refreshBtn = document.getElementById('refreshBtn');
const toast = document.getElementById('toast');

// Search & Filter
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const sortSelect = document.getElementById('sortSelect');
const perPageSelect = document.getElementById('perPageSelect');

// Pagination
const paginationContainer = document.getElementById('paginationContainer');
const firstPageBtn = document.getElementById('firstPageBtn');
const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const lastPageBtn = document.getElementById('lastPageBtn');
const pageInfo = document.getElementById('pageInfo');

// ==================== Toast Notification ====================
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ==================== Search & Filter ====================
function applyFilters() {
  // ค้นหา
  filteredStocks = allStocks.filter(stock => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      stock.symbol.toLowerCase().includes(query) ||
      stock.shortName.toLowerCase().includes(query)
    );
  });
  
  // เรียงลำดับ
  switch (currentSort) {
    case 'distance-baht':
      // เรียงตามระยะห่างเป็นบาท (เหมาะกับหุ้นราคาใกล้เคียงกัน)
      filteredStocks.sort((a, b) => {
        if (a.distanceToNearestSupport === null) return 1;
        if (b.distanceToNearestSupport === null) return -1;
        return Math.abs(a.distanceToNearestSupport) - Math.abs(b.distanceToNearestSupport);
      });
      break;
    case 'distance-percent':
      // เรียงตามระยะห่างเป็น % (เหมาะกับการเปรียบเทียบหุ้นหลายราคา)
      filteredStocks.sort((a, b) => {
        if (a.distancePercent === null || a.distancePercent === undefined) return 1;
        if (b.distancePercent === null || b.distancePercent === undefined) return -1;
        return Math.abs(parseFloat(a.distancePercent)) - Math.abs(parseFloat(b.distancePercent));
      });
      break;
    case 'symbol':
      filteredStocks.sort((a, b) => a.symbol.localeCompare(b.symbol));
      break;
    case 'price-high':
      filteredStocks.sort((a, b) => b.lastPrice - a.lastPrice);
      break;
    case 'price-low':
      filteredStocks.sort((a, b) => a.lastPrice - b.lastPrice);
      break;
  }
  
  // รีเซ็ตหน้ากลับไปหน้าแรก
  currentPage = 1;
  renderCurrentPage();
}

// ==================== Pagination ====================
function getTotalPages() {
  if (itemsPerPage === 'all') return 1;
  return Math.ceil(filteredStocks.length / itemsPerPage);
}

function getCurrentPageStocks() {
  if (itemsPerPage === 'all') return filteredStocks;
  
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return filteredStocks.slice(startIndex, endIndex);
}

function updatePaginationUI() {
  const totalPages = getTotalPages();
  
  if (totalPages <= 1 || itemsPerPage === 'all') {
    paginationContainer.style.display = 'none';
    return;
  }
  
  paginationContainer.style.display = 'flex';
  pageInfo.textContent = `หน้า ${currentPage} จาก ${totalPages}`;
  
  firstPageBtn.disabled = currentPage === 1;
  prevPageBtn.disabled = currentPage === 1;
  nextPageBtn.disabled = currentPage === totalPages;
  lastPageBtn.disabled = currentPage === totalPages;
}

function renderCurrentPage() {
  const pageStocks = getCurrentPageStocks();
  renderStocks(pageStocks);
  updatePaginationUI();
  
  // แสดงจำนวนที่กรอง
  if (searchQuery) {
    stockCountElement.textContent = `${filteredStocks.length} (จาก ${allStocks.length})`;
  } else {
    stockCountElement.textContent = allStocks.length;
  }
}

// ==================== Load Stocks ====================
async function loadStocks() {
  try {
    const response = await fetch(`${API_BASE_URL}/stocks`);
    const data = await response.json();
    
    if (data.success) {
      allStocks = data.data;
      filteredStocks = [...allStocks];
      lastUpdateElement.textContent = new Date(data.lastUpdate).toLocaleString('th-TH');
      
      applyFilters();
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    console.error('Error loading stocks:', error);
    stocksContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>เกิดข้อผิดพลาด</h3>
        <p>ไม่สามารถโหลดข้อมูลหุ้นได้</p>
      </div>
    `;
  }
}

// ==================== Render Stocks ====================
function renderStocks(stocks) {
  if (stocks.length === 0) {
    if (searchQuery) {
      stocksContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>ไม่พบผลลัพธ์</h3>
          <p>ไม่พบหุ้นที่ตรงกับคำค้นหา "${searchQuery}"</p>
          <button class="btn btn-primary" onclick="document.getElementById('clearSearchBtn').click()">
            ล้างการค้นหา
          </button>
        </div>
      `;
    } else {
      stocksContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📊</div>
          <h3>ยังไม่มีหุ้นที่ติดตาม</h3>
          <p>เพิ่มหุ้นแรกของคุณเพื่อเริ่มติดตามราคา</p>
          <a href="add-stock.html" class="btn btn-primary">➕ เพิ่มหุ้นใหม่</a>
        </div>
      `;
    }
    return;
  }
  
  stocksContainer.innerHTML = stocks.map(stock => {
    const distanceClass = getDistanceClass(stock.distanceToNearestSupport);
    const distanceSign = stock.distanceToNearestSupport >= 0 ? '+' : '';
    
    return `
      <div class="stock-card">
        <div class="stock-card-header">
          <div class="stock-symbol">
            <span class="symbol-code">${stock.symbol}</span>
            <span class="symbol-name">${stock.shortName || stock.symbol}</span>
          </div>
          <div class="stock-price">
            ${formatNumber(stock.lastPrice)}
            <span class="stock-currency">${stock.currency}</span>
          </div>
        </div>
        
        <div class="stock-body">
          <div class="stock-info">
            <span class="info-label">แนวรับที่ใกล้ที่สุด</span>
            <span class="info-value">${formatNumber(stock.nearestSupport)}</span>
          </div>
          
          <div class="stock-info">
            <span class="info-label">ส่วนต่าง</span>
            <span class="info-value ${distanceClass}">
              ${distanceSign}${formatNumber(stock.distanceToNearestSupport)} 
              (${distanceSign}${stock.distancePercent}%)
            </span>
          </div>
          
          <div class="stock-info">
            <span class="info-label">สถานะตลาด</span>
            <span class="info-value">${getMarketStateText(stock.marketState)}</span>
          </div>
        </div>
        
        <div class="stock-info">
          <span class="info-label">แนวรับทั้งหมด (${stock.supportLevels.length} จุด)</span>
          <div class="support-levels-display">
            ${stock.supportLevels.map(level => {
              const isNearest = level === stock.nearestSupport;
              return `<span class="support-badge ${isNearest ? 'nearest' : ''}">${formatNumber(level)}</span>`;
            }).join('')}
          </div>
        </div>
        
        <div class="stock-actions">
          <button class="btn btn-warning btn-small" onclick="editSupportLevels('${stock.symbol}', [${stock.supportLevels.join(',')}])">
            ✏️ แก้ไขแนวรับ
          </button>
          <button class="btn btn-danger btn-small" onclick="deleteStock('${stock.symbol}')">
            🗑️ ลบ
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// ==================== Edit Support Levels ====================
async function editSupportLevels(symbol, currentLevels) {
  // สร้าง modal แบบง่าย ๆ ด้วย prompt
  const levelsStr = currentLevels.join(', ');
  const newLevelsStr = prompt(
    `แก้ไขแนวรับสำหรับ ${symbol}\n\nกรอกแนวรับใหม่ (คั่นด้วยเครื่องหมายจุลภาค)\nตัวอย่าง: 150, 145, 140`,
    levelsStr
  );
  
  if (newLevelsStr === null) return; // ยกเลิก
  
  // แปลง string เป็น array of numbers
  const newLevels = newLevelsStr
    .split(',')
    .map(s => parseFloat(s.trim()))
    .filter(n => !isNaN(n) && n > 0);
  
  if (newLevels.length === 0) {
    showToast('❌ กรุณากรอกแนวรับอย่างน้อย 1 ระดับ', 'error');
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/stocks/${symbol}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        supportLevels: newLevels
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`✅ แก้ไขแนวรับของ ${symbol} สำเร็จ`, 'success');
      loadStocks();
    } else {
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error updating support levels:', error);
    showToast('❌ เกิดข้อผิดพลาดในการแก้ไขแนวรับ', 'error');
  }
}

// ==================== Delete Stock ====================
async function deleteStock(symbol) {
  if (!confirm(`ต้องการลบหุ้น ${symbol} ออกจากระบบหรือไม่?`)) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/stocks/${symbol}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`✅ ลบหุ้น ${symbol} สำเร็จ`, 'success');
      loadStocks();
    } else {
      showToast(`❌ ${data.error}`, 'error');
    }
  } catch (error) {
    console.error('Error deleting stock:', error);
    showToast('❌ เกิดข้อผิดพลาดในการลบหุ้น', 'error');
  }
}

// ==================== Sort Hint ====================
function updateSortHint(sortType) {
  const sortHint = document.getElementById('sortHint');
  if (!sortHint) return;
  
  const hints = {
    'distance-baht': '💡 <strong>ระยะห่างเป็นราคา:</strong> เหมาะกับคนที่ตั้งแนวรับแบบ “เป็นราคาเป๊ะ ๆ” เช่น ซื้อเมื่อราคาลงมา 1',
    'distance-percent': '💡 <strong>ระยะห่างเป็น %:</strong> เหมาะสำหรับเปรียบเทียบหุ้นหลายตัว ที่มีราคาต่างกันมาก เห็นความใกล้จริง',
    'symbol': '',
    'price-high': '',
    'price-low': ''
  };
  
  const hint = hints[sortType];
  if (hint) {
    sortHint.innerHTML = hint;
    sortHint.style.display = 'block';
  } else {
    sortHint.style.display = 'none';
  }
}

// ==================== Helper Functions ====================
function formatNumber(num) {
  if (num === null || num === undefined) return '-';
  return parseFloat(num).toFixed(2);
}

function getDistanceClass(distance) {
  if (distance === null || distance === undefined) return '';
  if (distance < 0) return 'distance-negative';
  if (distance < 1) return 'distance-warning';
  return 'distance-positive';
}

function getMarketStateText(state) {
  const states = {
    'REGULAR': '📈 เปิดตลาด',
    'PREPRE': '🌅 ก่อนเปิด',
    'PRE': '🌄 Pre-Market',
    'POST': '🌆 After-Hours',
    'POSTPOST': '🌃 หลังปิด',
    'CLOSED': '🌙 ปิดตลาด'
  };
  return states[state] || state;
}

// ==================== Auto Update ====================
function startAutoUpdate() {
  // โหลดครั้งแรก
  loadStocks();
  
  // อัปเดตทุก 15 วินาที
  updateTimer = setInterval(() => {
    loadStocks();
  }, UPDATE_INTERVAL);
}

function stopAutoUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

// ==================== Event Listeners ====================

// Search
searchInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  clearSearchBtn.style.display = searchQuery ? 'flex' : 'none';
  applyFilters();
});

clearSearchBtn.addEventListener('click', () => {
  searchInput.value = '';
  searchQuery = '';
  clearSearchBtn.style.display = 'none';
  applyFilters();
});

// Sort
sortSelect.addEventListener('change', (e) => {
  currentSort = e.target.value;
  updateSortHint(currentSort);
  applyFilters();
});

// แสดง hint เมื่อโหลดหน้า
document.addEventListener('DOMContentLoaded', () => {
  updateSortHint(currentSort);
});

// Items per page
perPageSelect.addEventListener('change', (e) => {
  itemsPerPage = e.target.value === 'all' ? 'all' : parseInt(e.target.value);
  currentPage = 1;
  renderCurrentPage();
});

// Pagination buttons
firstPageBtn.addEventListener('click', () => {
  currentPage = 1;
  renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

prevPageBtn.addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

nextPageBtn.addEventListener('click', () => {
  if (currentPage < getTotalPages()) {
    currentPage++;
    renderCurrentPage();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

lastPageBtn.addEventListener('click', () => {
  currentPage = getTotalPages();
  renderCurrentPage();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Refresh Button
refreshBtn.addEventListener('click', () => {
  showToast('🔄 กำลังรีเฟรชข้อมูล...', 'success');
  loadStocks();
});

// ==================== Page Visibility API ====================
// หยุด auto-update เมื่อไม่ได้เปิดหน้านี้อยู่
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopAutoUpdate();
  } else {
    startAutoUpdate();
  }
});

// ==================== Initialize ====================
startAutoUpdate();

// ทำให้ functions เป็น global
window.deleteStock = deleteStock;
window.editSupportLevels = editSupportLevels;
