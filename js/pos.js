/**
 * Point of Sale (POS) Cashier Engine
 * High-speed catalog grid, barcode scanner, cart calculations,
 * custom service commissions, thermal receipt generation & audio feedback
 */

const POS = (function () {
  let cart = [];
  let currentCategory = 'all';
  let searchQuery = '';
  let activePaymentMethod = 'نقدي';
  let activeDiscount = 0; // Fixed EGP or percentage
  let isDiscountPercent = false;
  let lastCompletedTransaction = null;

  // Initialize POS listeners
  function init() {
    renderCategoryFilters();
    renderProducts();
    renderCart();
    renderCashierShiftSummary();
    bindEvents();
  }

  function bindEvents() {
    // Barcode scanner & search input
    const searchInput = document.getElementById('pos-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProducts();
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleBarcodeEnter(searchInput.value.trim());
        }
      });
    }

    // Payment method buttons
    const payBtns = document.querySelectorAll('.payment-method-pill');
    payBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        payBtns.forEach(b => {
          b.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-bold', 'border-primary');
          b.classList.add('bg-surface-container-low', 'text-on-surface-variant');
        });
        btn.classList.remove('bg-surface-container-low', 'text-on-surface-variant');
        btn.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold', 'border-primary');
        activePaymentMethod = btn.dataset.method || 'نقدي';
      });
    });

    // Discount input listener
    const discountInput = document.getElementById('pos-discount-input');
    if (discountInput) {
      discountInput.addEventListener('input', (e) => {
        activeDiscount = parseFloat(e.target.value) || 0;
        renderCartTotals();
      });
    }
  }

  function handleBarcodeEnter(code) {
    if (!code) return;
    const product = Store.getProductByBarcode(code);
    if (product) {
      if (product.isCustomService) {
        openCommissionModal(product);
      } else {
        addToCart(product.id);
        App.playSound('beep');
        App.showToast(`تمت إضافة: ${product.name}`, 'info');
      }
      const searchInput = document.getElementById('pos-search-input');
      if (searchInput) searchInput.value = '';
      searchQuery = '';
      renderProducts();
    } else {
      App.playSound('error');
      App.showToast(`لم يتم العثور على صنف بالباركود: ${code}`, 'error');
    }
  }

  // --- Category & Product Rendering ---
  function setCategory(cat) {
    currentCategory = cat;
    renderCategoryFilters();
    renderProducts();
  }

  function renderCategoryFilters() {
    const filterContainer = document.getElementById('pos-categories-container');
    if (!filterContainer) return;

    const products = Store.getProducts();
    const categories = [
      { id: 'all', label: 'الكل', icon: 'apps', count: products.length },
      { id: 'cards', label: 'كروت شحن وفكة', icon: 'contactless', count: products.filter(p => p.category === 'cards').length },
      { id: 'accessories', label: 'إكسسوارات وموبايلات', icon: 'headphones', count: products.filter(p => p.category === 'accessories').length },
      { id: 'services', label: 'خدمات وتحويلات كاش', icon: 'swap_horiz', count: products.filter(p => p.category === 'services').length },
      { id: 'maintenance', label: 'صيانة وسوفت وير', icon: 'build', count: products.filter(p => p.category === 'maintenance').length }
    ];

    filterContainer.innerHTML = categories.map(cat => {
      const isActive = currentCategory === cat.id;
      const activeClass = isActive
        ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
        : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container hover:text-on-surface';
      return `
        <button onclick="POS.setCategory('${cat.id}')"
          class="flex items-center gap-2 px-space-md py-2.5 rounded-xl font-label-md transition-all shrink-0 ${activeClass}"
          type="button">
          <span class="material-symbols-outlined text-[18px]">${cat.icon}</span>
          <span>${cat.label}</span>
          <span class="px-2 py-0.5 rounded-full text-[11px] ${isActive ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant'}">${cat.count}</span>
        </button>
      `;
    }).join('');
  }

  function renderProducts() {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;

    let products = Store.getProducts().filter(p => p.active !== false);

    // Apply category filter
    if (currentCategory !== 'all') {
      products = products.filter(p => p.category === currentCategory);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      products = products.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
      );
    }

    if (products.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full py-16 flex flex-col items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-6xl text-outline-variant mb-2">inventory_2</span>
          <p class="font-title-md font-bold">لا توجد أصناف مطابقة للبحث</p>
          <span class="font-body-sm text-sm">جرب البحث بكلمة أخرى أو تغيير الفئة المحددة</span>
        </div>
      `;
      return;
    }

    const settings = Store.getSettings();
    const curr = settings.currency || 'ج.م';

    grid.innerHTML = products.map(prod => {
      const isService = prod.isCustomService;
      const isOutOfStock = !isService && prod.stock <= 0;
      const isLowStock = !isService && prod.stock > 0 && prod.stock <= (prod.minStock || 5);

      let stockBadge = '';
      if (isService) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-600">خدمة فورية</span>`;
      } else if (isOutOfStock) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">نفذت الكمية</span>`;
      } else if (isLowStock) {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">متبقي ${prod.stock}</span>`;
      } else {
        stockBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">${prod.stock} في المخزن</span>`;
      }

      return `
        <div class="group relative flex flex-col justify-between p-space-md bg-surface-container-lowest rounded-2xl border border-transparent hover:border-primary-container shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all duration-200 ${isOutOfStock ? 'opacity-60' : ''}">
          <div>
            <div class="flex items-start justify-between gap-2 mb-3">
              <div class="w-10 h-10 rounded-xl ${prod.color || 'bg-primary/10 text-primary'} flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]">${prod.icon || 'category'}</span>
              </div>
              <div class="flex flex-col items-end">
                ${stockBadge}
                <span class="text-[11px] text-on-surface-variant font-mono mt-0.5">${prod.barcode || ''}</span>
              </div>
            </div>

            <h3 class="font-title-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 mb-1">${prod.name}</h3>
            <span class="font-label-sm text-on-surface-variant">${prod.categoryName || ''}</span>
          </div>

          <div class="pt-4 mt-2 border-t border-surface-container flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-[11px] text-on-surface-variant">السعر</span>
              <span class="font-title-md font-bold text-secondary font-mono">
                ${isService ? 'حسب التحويل' : `${Number(prod.sellingPrice).toFixed(2)} <span class="text-xs font-normal">${curr}</span>`}
              </span>
            </div>

            ${isService ? `
              <button onclick="POS.openCommissionModalById('${prod.id}')"
                class="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-xl font-label-md shadow-sm hover:bg-primary-container transition-all"
                type="button">
                <span class="material-symbols-outlined text-[16px]">tune</span>
                <span>تحديد</span>
              </button>
            ` : `
              <button onclick="POS.addToCart('${prod.id}')"
                ${isOutOfStock ? 'disabled' : ''}
                class="flex items-center justify-center w-9 h-9 rounded-xl ${isOutOfStock ? 'bg-surface-container text-on-surface-variant cursor-not-allowed' : 'bg-primary text-white hover:bg-primary-container shadow-sm active:scale-95'} transition-all"
                type="button" title="إضافة للفاتورة">
                <span class="material-symbols-outlined text-[20px]">add</span>
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Cart Management ---
  function addToCart(productId) {
    const product = Store.getProduct(productId);
    if (!product) return;

    if (!product.isCustomService && product.stock <= 0) {
      App.showToast(`عفواً، الكمية نفذت من مخزن: ${product.name}`, 'warning');
      return;
    }

    const existingIdx = cart.findIndex(item => item.productId === productId && !item.isCustomService);
    if (existingIdx !== -1) {
      // Check stock limit
      if (!product.isCustomService && cart[existingIdx].quantity >= product.stock) {
        App.showToast(`لا يمكنك إضافة المزيد، الكمية المتوفرة ${product.stock} فقط`, 'warning');
        return;
      }
      cart[existingIdx].quantity += 1;
    } else {
      cart.push({
        productId: product.id,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        costPrice: Number(product.costPrice) || 0,
        sellingPrice: Number(product.sellingPrice) || 0,
        quantity: 1,
        isCustomService: false
      });
    }

    App.playSound('beep');
    renderCart();
  }

  function addCustomServiceToCart(serviceItem) {
    cart.push({
      productId: serviceItem.productId || 'SRV-' + Date.now(),
      barcode: serviceItem.barcode || 'CUSTOM',
      name: serviceItem.name,
      category: 'services',
      costPrice: Number(serviceItem.costPrice) || Number(serviceItem.amount) || 0,
      sellingPrice: Number(serviceItem.total) || 0,
      amount: Number(serviceItem.amount) || 0,
      serviceFee: Number(serviceItem.serviceFee) || 0,
      clientNumber: serviceItem.clientNumber || '',
      walletKey: serviceItem.walletKey || 'vodafone',
      quantity: 1,
      isCustomService: true
    });

    App.playSound('beep');
    renderCart();
  }

  function updateQty(index, delta) {
    if (!cart[index]) return;
    const item = cart[index];

    if (item.isCustomService) {
      // Custom services typically have qty 1
      if (delta < 0) {
        removeFromCart(index);
      }
      return;
    }

    const product = Store.getProduct(item.productId);
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    if (product && newQty > product.stock) {
      App.showToast(`الكمية القصوى المتوفرة في المخزن هي ${product.stock}`, 'warning');
      return;
    }

    item.quantity = newQty;
    renderCart();
  }

  function removeFromCart(index) {
    if (!cart[index]) return;
    const removedName = cart[index].name;
    cart.splice(index, 1);
    renderCart();
    App.showToast(`تم حذف: ${removedName}`, 'info');
  }

  function clearCart() {
    if (cart.length === 0) return;
    cart = [];
    activeDiscount = 0;
    const discInput = document.getElementById('pos-discount-input');
    if (discInput) discInput.value = '';
    renderCart();
    App.showToast('تم إفراغ سلة الفاتورة', 'info');
  }

  function renderCart() {
    const list = document.getElementById('pos-cart-items-list');
    const emptyState = document.getElementById('pos-cart-empty-state');
    const itemsContainer = document.getElementById('pos-cart-items-container');
    const invoiceNumberEl = document.getElementById('pos-invoice-number-display');
    const checkoutBtn = document.getElementById('pos-checkout-btn');

    if (invoiceNumberEl) {
      invoiceNumberEl.textContent = Store.generateInvoiceNumber();
    }

    if (!list) return;

    if (cart.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (itemsContainer) itemsContainer.classList.add('hidden');
      if (checkoutBtn) checkoutBtn.disabled = true;
      renderCartTotals();
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (itemsContainer) itemsContainer.classList.remove('hidden');
    if (checkoutBtn) checkoutBtn.disabled = false;

    const settings = Store.getSettings();
    const curr = settings.currency || 'ج.م';

    list.innerHTML = cart.map((item, idx) => {
      const lineTotal = item.isCustomService
        ? item.sellingPrice
        : item.sellingPrice * item.quantity;

      return `
        <div class="flex items-center justify-between p-space-sm bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant transition-all">
          <div class="flex flex-col flex-1 min-w-0 pl-2">
            <span class="font-title-md font-bold text-on-surface truncate">${item.name}</span>
            <div class="flex items-center gap-2 text-[11px] text-on-surface-variant font-mono mt-0.5">
              ${item.isCustomService ? `
                <span class="text-primary font-bold">مبلغ: ${item.amount.toFixed(2)} + عمولة: ${item.serviceFee.toFixed(2)}</span>
                ${item.clientNumber ? `<span class="bg-surface-container px-1.5 py-0.5 rounded">رقم: ${item.clientNumber}</span>` : ''}
              ` : `
                <span>${item.sellingPrice.toFixed(2)} ${curr} × ${item.quantity}</span>
              `}
            </div>
          </div>

          <div class="flex items-center gap-space-sm">
            ${!item.isCustomService ? `
              <div class="flex items-center bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-0.5">
                <button onclick="POS.updateQty(${idx}, -1)" class="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-container rounded transition-colors text-sm font-bold">-</button>
                <span class="w-7 text-center font-bold text-xs font-mono">${item.quantity}</span>
                <button onclick="POS.updateQty(${idx}, 1)" class="w-6 h-6 flex items-center justify-center text-on-surface hover:bg-surface-container rounded transition-colors text-sm font-bold">+</button>
              </div>
            ` : ''}

            <span class="font-title-md font-bold text-on-surface font-mono min-w-[70px] text-left">
              ${lineTotal.toFixed(2)}
            </span>

            <button onclick="POS.removeFromCart(${idx})" class="w-7 h-7 flex items-center justify-center text-error hover:bg-error-container/20 rounded-lg transition-colors" title="حذف">
              <span class="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    renderCartTotals();
  }

  function renderCartTotals() {
    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.isCustomService ? item.sellingPrice : (item.sellingPrice * item.quantity);
    });

    const discountAmount = Math.min(subtotal, Math.max(0, activeDiscount));
    const grandTotal = Math.max(0, subtotal - discountAmount);

    const subtotalEl = document.getElementById('pos-subtotal-val');
    const discountEl = document.getElementById('pos-discount-val');
    const grandTotalEl = document.getElementById('pos-grandtotal-val');

    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    if (subtotalEl) subtotalEl.textContent = `${subtotal.toFixed(2)} ${curr}`;
    if (discountEl) discountEl.textContent = `${discountAmount.toFixed(2)} ${curr}`;
    if (grandTotalEl) grandTotalEl.textContent = `${grandTotal.toFixed(2)} ${curr}`;
  }

  // --- Cashier Personal Shift Summary Widget ---
  function renderCashierShiftSummary() {
    const user = Auth.getCurrentUser();
    if (!user) return;

    const stats = Store.getCashierPersonalStats(user.id, user.username);
    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    const nameEl = document.getElementById('pos-cashier-name');
    const shiftEl = document.getElementById('pos-cashier-shift');
    const totalEl = document.getElementById('pos-cashier-today-total');
    const countEl = document.getElementById('pos-cashier-today-count');

    if (nameEl) nameEl.textContent = `${user.name} (#${user.id})`;
    if (shiftEl) shiftEl.textContent = user.shift || 'الوردية الحالية';
    if (totalEl) totalEl.textContent = `${stats.total.toFixed(2)} ${curr}`;
    if (countEl) countEl.textContent = `${stats.count} فاتورة`;
  }

  // --- Checkout Execution ---
  function checkout() {
    if (cart.length === 0) {
      App.showToast('الفاتورة فارغة، يرجى إضافة أصناف أولاً', 'warning');
      return;
    }

    const user = Auth.getCurrentUser();
    if (!user) {
      App.showToast('انتهت الجلسة، يرجى تسجيل الدخول مجدداً', 'error');
      Auth.logout();
      return;
    }

    let subtotal = 0;
    cart.forEach(item => {
      subtotal += item.isCustomService ? item.sellingPrice : (item.sellingPrice * item.quantity);
    });

    const discount = Math.min(subtotal, Math.max(0, activeDiscount));
    const grandTotal = Math.max(0, subtotal - discount);

    const customerNameInput = document.getElementById('pos-customer-name-input');
    const customerPhoneInput = document.getElementById('pos-customer-phone-input');

    const transactionData = {
      userId: user.id,
      username: user.username,
      cashierName: user.name,
      items: JSON.parse(JSON.stringify(cart)),
      subtotal: subtotal,
      discount: discount,
      total: grandTotal,
      paymentMethod: activePaymentMethod,
      customerName: (customerNameInput && customerNameInput.value.trim()) || 'عميل نقدي',
      customerPhone: (customerPhoneInput && customerPhoneInput.value.trim()) || ''
    };

    // Save transaction in database
    const savedTx = Store.addTransaction(transactionData);
    lastCompletedTransaction = savedTx;

    // Audio & tactile feedback
    App.playSound('cash');
    App.showToast(`تم إتمام الفاتورة ${savedTx.invoiceNumber} بنجاح!`, 'success');

    // Reset current form & cart
    cart = [];
    activeDiscount = 0;
    if (customerNameInput) customerNameInput.value = '';
    if (customerPhoneInput) customerPhoneInput.value = '';
    const discInput = document.getElementById('pos-discount-input');
    if (discInput) discInput.value = '';

    renderCart();
    renderProducts();
    renderCashierShiftSummary();

    // Trigger Admin Analytics refresh if Admin is looking or in background
    if (typeof Analytics !== 'undefined' && Analytics.refresh) {
      Analytics.refresh();
    }

    // Open Thermal Receipt Modal
    openReceiptModal(savedTx);
  }

  // --- Hold Cart Feature ---
  function holdCurrentCart() {
    if (cart.length === 0) {
      App.showToast('لا توجد أصناف لتعليقها', 'warning');
      return;
    }

    const user = Auth.getCurrentUser();
    const held = Store.saveHeldCart({
      cashierName: user ? user.name : 'كاشير',
      items: cart,
      paymentMethod: activePaymentMethod,
      discount: activeDiscount
    });

    cart = [];
    activeDiscount = 0;
    renderCart();
    App.showToast(`تم تعليق الفاتورة (#${held.id}) بنجاح`, 'info');
    updateHeldCountBadge();
  }

  function updateHeldCountBadge() {
    const badge = document.getElementById('held-invoices-badge');
    const carts = Store.getHeldCarts();
    if (badge) {
      badge.textContent = carts.length;
      badge.classList.toggle('hidden', carts.length === 0);
    }
  }

  // --- Commission & Custom Service Modal ---
  function openCommissionModalById(productId) {
    const prod = Store.getProduct(productId);
    openCommissionModal(prod);
  }

  function openCommissionModal(product) {
    const modal = document.getElementById('commission-modal');
    if (!modal) return;

    const titleEl = document.getElementById('commission-service-title');
    const prodIdInput = document.getElementById('commission-product-id');
    const amountInput = document.getElementById('commission-amount-input');
    const feeInput = document.getElementById('commission-fee-input');
    const phoneInput = document.getElementById('commission-phone-input');
    const totalPreview = document.getElementById('commission-total-preview');

    if (titleEl) titleEl.textContent = product ? product.name : 'حاسبة عمولة الكاش والخدمات';
    if (prodIdInput) prodIdInput.value = product ? product.id : 'CUSTOM';
    if (amountInput) amountInput.value = '500';
    if (phoneInput) phoneInput.value = '';

    // Calculate initial fee (1.5% with min 5 EGP)
    const settings = Store.getSettings();
    const defaultRate = settings.defaultCommissionRate || 1.5;
    const minFee = settings.minCommissionFee || 5.00;
    const initialFee = Math.max(minFee, (500 * (defaultRate / 100)));

    if (feeInput) feeInput.value = initialFee.toFixed(2);
    if (totalPreview) totalPreview.textContent = (500 + initialFee).toFixed(2);

    // Bind real-time calculation in modal
    function recalc() {
      const amt = parseFloat(amountInput.value) || 0;
      const fee = parseFloat(feeInput.value) || 0;
      if (totalPreview) totalPreview.textContent = (amt + fee).toFixed(2);
    }

    amountInput.oninput = () => {
      const amt = parseFloat(amountInput.value) || 0;
      const computedFee = Math.max(minFee, (amt * (defaultRate / 100)));
      feeInput.value = computedFee.toFixed(2);
      recalc();
    };

    feeInput.oninput = recalc;

    modal.classList.remove('hidden');
    amountInput.focus();
    amountInput.select();
  }

  function closeCommissionModal() {
    const modal = document.getElementById('commission-modal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmCommissionModal() {
    const prodId = document.getElementById('commission-product-id').value;
    const amount = parseFloat(document.getElementById('commission-amount-input').value) || 0;
    const fee = parseFloat(document.getElementById('commission-fee-input').value) || 0;
    const phone = document.getElementById('commission-phone-input').value.trim();
    const serviceName = document.getElementById('commission-service-title').textContent;

    if (amount <= 0) {
      App.showToast('يرجى إدخال مبلغ صحيح للعملية', 'warning');
      return;
    }

    addCustomServiceToCart({
      productId: prodId,
      name: serviceName,
      amount: amount,
      serviceFee: fee,
      total: amount + fee,
      clientNumber: phone,
      costPrice: amount
    });

    closeCommissionModal();
    App.showToast(`تمت إضافة خدمة ${serviceName} للسلة`, 'success');
  }

  function setPresetCommission(presetFee) {
    const feeInput = document.getElementById('commission-fee-input');
    const amountInput = document.getElementById('commission-amount-input');
    const totalPreview = document.getElementById('commission-total-preview');

    if (feeInput) feeInput.value = presetFee.toFixed(2);
    const amt = parseFloat(amountInput.value) || 0;
    if (totalPreview) totalPreview.textContent = (amt + presetFee).toFixed(2);
  }

  // --- Thermal Receipt Printing Modal ---
  function openReceiptModal(tx) {
    const modal = document.getElementById('receipt-modal');
    if (!modal || !tx) return;

    const settings = Store.getSettings();
    const curr = settings.currency || 'ج.م';

    // Populate receipt template fields
    document.getElementById('receipt-store-name').textContent = settings.storeName;
    document.getElementById('receipt-store-sub').textContent = settings.storeSubtitle;
    document.getElementById('receipt-store-phone').textContent = settings.storePhone;
    document.getElementById('receipt-store-addr').textContent = settings.storeAddress;

    document.getElementById('receipt-inv-num').textContent = tx.invoiceNumber;
    document.getElementById('receipt-date-time').textContent = new Date(tx.timestamp).toLocaleString('ar-EG');
    document.getElementById('receipt-cashier-name').textContent = tx.cashierName;
    document.getElementById('receipt-pay-method').textContent = tx.paymentMethod;

    const customerRow = document.getElementById('receipt-customer-row');
    if (customerRow) {
      if (tx.customerName && tx.customerName !== 'عميل نقدي') {
        customerRow.classList.remove('hidden');
        document.getElementById('receipt-customer-name').textContent = `${tx.customerName} (${tx.customerPhone || ''})`;
      } else {
        customerRow.classList.add('hidden');
      }
    }

    const itemsContainer = document.getElementById('receipt-items-rows');
    itemsContainer.innerHTML = (tx.items || []).map(item => `
      <tr class="border-b border-dashed border-gray-300 text-xs">
        <td class="py-1 text-right font-bold">${item.name} ${item.clientNumber ? `(${item.clientNumber})` : ''}</td>
        <td class="py-1 text-center font-mono">${item.quantity || 1}</td>
        <td class="py-1 text-left font-mono">${(item.sellingPrice || 0).toFixed(2)}</td>
        <td class="py-1 text-left font-mono font-bold">${((item.sellingPrice || 0) * (item.quantity || 1)).toFixed(2)}</td>
      </tr>
    `).join('');

    document.getElementById('receipt-subtotal').textContent = `${(tx.subtotal || 0).toFixed(2)} ${curr}`;
    document.getElementById('receipt-discount').textContent = `${(tx.discount || 0).toFixed(2)} ${curr}`;
    document.getElementById('receipt-grandtotal').textContent = `${(tx.total || 0).toFixed(2)} ${curr}`;

    document.getElementById('receipt-footer-msg').textContent = settings.receiptFooter;

    modal.classList.remove('hidden');
  }

  function closeReceiptModal() {
    const modal = document.getElementById('receipt-modal');
    if (modal) modal.classList.add('hidden');
  }

  function printReceipt() {
    window.print();
  }

  function shareReceiptWhatsApp() {
    if (!lastCompletedTransaction) return;
    const tx = lastCompletedTransaction;
    const settings = Store.getSettings();

    let text = `*${settings.storeName}*\n`;
    text += `فاتورة رقم: ${tx.invoiceNumber}\n`;
    text += `التاريخ: ${new Date(tx.timestamp).toLocaleString('ar-EG')}\n`;
    text += `الكاشير: ${tx.cashierName}\n`;
    text += `--------------------------\n`;
    (tx.items || []).forEach(it => {
      text += `• ${it.name} (${it.quantity || 1}) = ${((it.sellingPrice || 0) * (it.quantity || 1)).toFixed(2)} ج.م\n`;
    });
    text += `--------------------------\n`;
    text += `*الإجمالي: ${(tx.total || 0).toFixed(2)} ${settings.currency}*\n`;
    text += `طريقة الدفع: ${tx.paymentMethod}\n`;
    text += `${settings.receiptFooter}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  return {
    init,
    setCategory,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    checkout,
    holdCurrentCart,
    openCommissionModal,
    openCommissionModalById,
    closeCommissionModal,
    confirmCommissionModal,
    setPresetCommission,
    openReceiptModal,
    closeReceiptModal,
    printReceipt,
    shareReceiptWhatsApp,
    renderCashierShiftSummary,
    renderProducts
  };
})();
