// ==================== Configuration ====================
const API_BASE_URL = 'http://localhost:3000';

// ==================== DOM Elements ====================
const addStockForm = document.getElementById('addStockForm');
const symbolInput = document.getElementById('symbol');
const supportLevelsContainer = document.getElementById('supportLevelsContainer');
const addSupportBtn = document.getElementById('addSupportBtn');
const toast = document.getElementById('toast');

// ==================== Toast Notification ====================
function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ==================== Support Levels Management ====================
addSupportBtn.addEventListener('click', () => {
  const supportItem = document.createElement('div');
  supportItem.className = 'support-level-item';
  supportItem.innerHTML = `
    <input 
      type="number" 
      step="0.01" 
      class="support-input" 
      placeholder="145.00" 
      required>
    <button type="button" class="btn-remove-support" onclick="removeSupportLevel(this)">×</button>
  `;
  supportLevelsContainer.appendChild(supportItem);
});

function removeSupportLevel(button) {
  const items = supportLevelsContainer.querySelectorAll('.support-level-item');
  if (items.length > 1) {
    button.parentElement.remove();
  } else {
    showToast('⚠️ ต้องมีอย่างน้อย 1 แนวรับ', 'warning');
  }
}

// ==================== Add Stock Form ====================
addStockForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const symbol = symbolInput.value.trim().toUpperCase();
  const supportInputs = supportLevelsContainer.querySelectorAll('.support-input');
  const supportLevels = Array.from(supportInputs)
    .map(input => parseFloat(input.value))
    .filter(val => !isNaN(val) && val > 0);
  
  if (supportLevels.length === 0) {
    showToast('❌ กรุณากรอกแนวรับอย่างน้อย 1 ระดับ', 'error');
    return;
  }
  
  // แสดง loading
  const submitBtn = addStockForm.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = '⏳ กำลังบันทึก...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_BASE_URL}/stocks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        symbol,
        supportLevels
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showToast(`✅ เพิ่มหุ้น ${symbol} สำเร็จ`, 'success');
      
      // รอ 1.5 วินาที แล้วกลับหน้าหลัก
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1500);
    } else {
      showToast(`❌ ${data.error}`, 'error');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error adding stock:', error);
    showToast('❌ เกิดข้อผิดพลาดในการเพิ่มหุ้น', 'error');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// ทำให้ removeSupportLevel เป็น global
window.removeSupportLevel = removeSupportLevel;
