/**
 * Inventory & Services Management Module
 * Product Catalog CRUD, Low Stock Alerts, and Machine/Wallet Balances
 */

const Inventory = (function () {
  let searchFilter = '';
  let categoryFilter = 'all';
  let stockFilter = 'all'; // 'all' | 'in_stock' | 'low_stock' | 'out_of_stock'

  function init() {
    renderWalletBalances();
    renderProductsTable();
    bindEvents();
  }

  function bindEvents() {
    const searchInput = document.getElementById('inventory-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchFilter = e.target.value;
        renderProductsTable();
      });
    }

    const catSelect = document.getElementById('inventory-category-select');
    if (catSelect) {
      catSelect.addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        renderProductsTable();
      });
    }

    const stockSelect = document.getElementById('inventory-stock-select');
    if (stockSelect) {
      stockSelect.addEventListener('change', (e) => {
        stockFilter = e.target.value;
        renderProductsTable();
      });
    }
  }

  // --- Machine & Wallet Balances ---
  function renderWalletBalances() {
    const wallets = Store.getWallets();
    const curr = (Store.getSettings() || {}).currency || 'ج.م';
    const container = document.getElementById('inventory-wallets-cards-container');
    if (!container) return;

    const keys = Object.keys(wallets);
    container.innerHTML = keys.map(k => {
      const w = wallets[k];
      const percent = Math.min(100, Math.round(((w.balance || 0) / (w.limit || 50000)) * 100));

      return `
        <div class="flex flex-col justify-between p-space-md bg-surface-container-low rounded-2xl border border-surface-container hover:border-primary-container transition-all">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span class="material-symbols-outlined text-[18px]">${w.icon || 'account_balance_wallet'}</span>
              </div>
              <span class="font-bold text-on-surface text-sm">${w.name}</span>
            </div>
            <button onclick="Inventory.openQuickWalletUpdate('${k}')" class="text-xs text-primary hover:underline font-bold" type="button">تحديث</button>
          </div>

          <div class="flex flex-col">
            <span class="font-title-md font-bold text-on-surface font-mono">${(w.balance || 0).toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${curr}</span>
            <div class="w-full bg-surface-container rounded-full h-1.5 mt-2 overflow-hidden">
              <div class="bg-primary h-full rounded-full" style="width: ${percent}%;"></div>
            </div>
            <div class="flex items-center justify-between text-[10px] text-on-surface-variant font-mono mt-1">
              <span>حد الرصيد: ${(w.limit || 50000).toLocaleString('ar-EG')}</span>
              <span>${percent}%</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Products & Services Table ---
  function renderProductsTable() {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) return;

    let products = Store.getProducts();

    // Category filter
    if (categoryFilter !== 'all') {
      products = products.filter(p => p.category === categoryFilter);
    }

    // Stock filter
    if (stockFilter === 'out_of_stock') {
      products = products.filter(p => !p.isCustomService && p.stock <= 0);
    } else if (stockFilter === 'low_stock') {
      products = products.filter(p => !p.isCustomService && p.stock > 0 && p.stock <= (p.minStock || 5));
    } else if (stockFilter === 'in_stock') {
      products = products.filter(p => p.isCustomService || p.stock > (p.minStock || 5));
    }

    // Search filter
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }

    if (products.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="9" class="py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl text-outline-variant mb-1">search_off</span>
            <p class="font-bold">لا توجد أصناف مطابقة للبحث</p>
          </td>
        </tr>
      `;
      return;
    }

    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    tableBody.innerHTML = products.map(prod => {
      const isService = prod.isCustomService;
      const profit = Math.max(0, (prod.sellingPrice || 0) - (prod.costPrice || 0));

      let stockBadge = '';
      if (isService) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-600">خدمة سحابية</span>`;
      } else if (prod.stock <= 0) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-error-container text-on-error-container">نفذت الكمية (0)</span>`;
      } else if (prod.stock <= (prod.minStock || 5)) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">رصيد منخفض (${prod.stock})</span>`;
      } else {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-xs font-bold bg-secondary/10 text-secondary">متوفر (${prod.stock})</span>`;
      }

      return `
        <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors">
          <td class="py-3 px-4 font-mono text-xs text-on-surface-variant font-bold">${prod.barcode || prod.id}</td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-2">
              <div class="w-7 h-7 rounded-lg ${prod.color || 'bg-primary/10 text-primary'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[16px]">${prod.icon || 'inventory_2'}</span>
              </div>
              <span class="font-bold text-on-surface text-sm">${prod.name}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant">
              ${prod.categoryName || prod.category}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-mono text-xs text-on-surface-variant">
            ${isService ? '-' : `${Number(prod.costPrice).toFixed(2)} ${curr}`}
          </td>
          <td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
            ${isService ? 'حسب التحويل' : `${Number(prod.sellingPrice).toFixed(2)} ${curr}`}
          </td>
          <td class="py-3 px-4 text-center font-mono text-xs font-bold text-secondary">
            ${isService ? 'عمولة متغيرة' : `+${profit.toFixed(2)} ${curr}`}
          </td>
          <td class="py-3 px-4 text-center font-mono">
            ${stockBadge}
          </td>
          <td class="py-3 px-4 text-center text-xs text-on-surface-variant">
            ${prod.lastUpdated ? new Date(prod.lastUpdated).toLocaleDateString('ar-EG') : 'اليوم'}
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              ${!isService ? `
                <button onclick="Inventory.quickAddStock('${prod.id}', 10)" class="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-container-high flex items-center justify-center text-xs font-bold text-primary" title="إضافة 10 قطع">+10</button>
              ` : ''}
              <button onclick="Inventory.openEditProductModal('${prod.id}')" class="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title="تعديل">
                <span class="material-symbols-outlined text-[18px]">edit</span>
              </button>
              <button onclick="Inventory.deleteProduct('${prod.id}')" class="w-7 h-7 rounded-lg hover:bg-error-container/20 flex items-center justify-center text-error transition-colors" title="حذف">
                <span class="material-symbols-outlined text-[18px]">delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Add / Edit Product Modal ---
  function openAddProductModal() {
    const modal = document.getElementById('product-modal');
    if (!modal) return;

    document.getElementById('product-modal-title').textContent = 'إضافة صنف / خدمة جديدة للمخزن';
    document.getElementById('product-form-id').value = '';
    document.getElementById('product-form-barcode').value = 'PRD-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('product-form-name').value = '';
    document.getElementById('product-form-category').value = 'cards';
    document.getElementById('product-form-cost').value = '0.00';
    document.getElementById('product-form-price').value = '0.00';
    document.getElementById('product-form-stock').value = '50';
    document.getElementById('product-form-minstock').value = '10';

    modal.classList.remove('hidden');
    document.getElementById('product-form-name').focus();
  }

  function openEditProductModal(id) {
    const prod = Store.getProduct(id);
    if (!prod) return;

    const modal = document.getElementById('product-modal');
    if (!modal) return;

    document.getElementById('product-modal-title').textContent = `تعديل الصنف: ${prod.name}`;
    document.getElementById('product-form-id').value = prod.id;
    document.getElementById('product-form-barcode').value = prod.barcode || '';
    document.getElementById('product-form-name').value = prod.name;
    document.getElementById('product-form-category').value = prod.category || 'cards';
    document.getElementById('product-form-cost').value = prod.costPrice || 0;
    document.getElementById('product-form-price').value = prod.sellingPrice || 0;
    document.getElementById('product-form-stock').value = prod.stock || 0;
    document.getElementById('product-form-minstock').value = prod.minStock || 5;

    modal.classList.remove('hidden');
  }

  function closeProductModal() {
    const modal = document.getElementById('product-modal');
    if (modal) modal.classList.add('hidden');
  }

  function saveProductForm() {
    const id = document.getElementById('product-form-id').value;
    const barcode = document.getElementById('product-form-barcode').value.trim();
    const name = document.getElementById('product-form-name').value.trim();
    const category = document.getElementById('product-form-category').value;
    const costPrice = parseFloat(document.getElementById('product-form-cost').value) || 0;
    const sellingPrice = parseFloat(document.getElementById('product-form-price').value) || 0;
    const stock = parseInt(document.getElementById('product-form-stock').value) || 0;
    const minStock = parseInt(document.getElementById('product-form-minstock').value) || 5;

    if (!name) {
      App.showToast('يرجى إدخال اسم الصنف', 'warning');
      return;
    }

    const catNames = {
      cards: 'كروت شحن وفكة',
      accessories: 'إكسسوارات وموبايلات',
      services: 'خدمات وتحويلات كاش',
      maintenance: 'صيانة وسوفت وير'
    };

    const isService = category === 'services';

    const productData = {
      barcode: barcode || 'PRD-' + Date.now().toString().slice(-6),
      name,
      category,
      categoryName: catNames[category] || category,
      costPrice,
      sellingPrice,
      stock: isService ? 99999 : stock,
      minStock,
      unit: category === 'cards' ? 'كارت' : (category === 'maintenance' ? 'جهاز' : 'قطعة'),
      isCustomService: isService,
      active: true
    };

    if (id) {
      productData.id = id;
    }

    Store.saveProduct(productData);
    closeProductModal();
    renderProductsTable();
    POS.renderProducts();
    App.showToast(`تم حفظ الصنف: ${name} بنجاح`, 'success');
  }

  function deleteProduct(id) {
    const prod = Store.getProduct(id);
    if (!prod) return;

    if (confirm(`هل أنت متأكد من حذف الصنف (${prod.name}) نهائياً من المخزن؟`)) {
      Store.deleteProduct(id);
      renderProductsTable();
      POS.renderProducts();
      App.showToast(`تم حذف الصنف: ${prod.name}`, 'info');
    }
  }

  function quickAddStock(id, qty = 10) {
    const prod = Store.getProduct(id);
    if (!prod) return;
    Store.updateProductStock(id, (prod.stock || 0) + qty);
    renderProductsTable();
    POS.renderProducts();
    App.showToast(`تمت إضافة ${qty} قطع إلى رصيد: ${prod.name}`, 'success');
  }

  // --- Wallet Modal ---
  function openQuickWalletUpdate(walletKey) {
    const modal = document.getElementById('wallet-modal');
    if (!modal) return;

    const wallets = Store.getWallets();
    const w = wallets[walletKey];
    if (!w) return;

    document.getElementById('wallet-modal-key').value = walletKey;
    document.getElementById('wallet-modal-name').textContent = w.name;
    document.getElementById('wallet-modal-balance-input').value = (w.balance || 0).toFixed(2);

    modal.classList.remove('hidden');
    document.getElementById('wallet-modal-balance-input').focus();
    document.getElementById('wallet-modal-balance-input').select();
  }

  function closeWalletModal() {
    const modal = document.getElementById('wallet-modal');
    if (modal) modal.classList.add('hidden');
  }

  function saveWalletBalance() {
    const key = document.getElementById('wallet-modal-key').value;
    const newBal = parseFloat(document.getElementById('wallet-modal-balance-input').value) || 0;

    const wallets = Store.getWallets();
    if (wallets[key]) {
      wallets[key].balance = newBal;
      Store.saveWallets(wallets);
      renderWalletBalances();
      closeWalletModal();
      Store.addAuditLog('تحديث رصيد محفظة/ماكينة', `تم تحديث رصيد ${wallets[key].name} إلى ${newBal.toFixed(2)} ج.م`, 'wallets', 'ADMIN', 'المدير');
      App.showToast(`تم تحديث رصيد ${wallets[key].name} بنجاح`, 'success');
    }
  }

  return {
    init,
    renderWalletBalances,
    renderProductsTable,
    openAddProductModal,
    openEditProductModal,
    closeProductModal,
    saveProductForm,
    deleteProduct,
    quickAddStock,
    openQuickWalletUpdate,
    closeWalletModal,
    saveWalletBalance
  };
})();

if (typeof window !== 'undefined') {
  window.Inventory = Inventory;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Inventory;
}
