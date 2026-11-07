/**
 * Sales Archive, Historical Financial Reports & Invoices Engine
 * Filter by date range, cashier, payment method, reprint receipts & CSV export
 */

const Archive = (function () {
  let dateFrom = '';
  let dateTo = '';
  let filterCashier = 'all';
  let filterPayment = 'all';
  let searchQuery = '';

  function init() {
    setupInitialDates();
    renderCashierFilterOptions();
    renderArchiveInvoices();
    renderHistoricalDailyArchives();
    bindEvents();
  }

  function setupInitialDates() {
    const today = new Date().toISOString().split('T')[0];
    dateFrom = today;
    dateTo = today;

    const fromInput = document.getElementById('archive-date-from');
    const toInput = document.getElementById('archive-date-to');

    if (fromInput) fromInput.value = today;
    if (toInput) toInput.value = today;
  }

  function bindEvents() {
    const fromInput = document.getElementById('archive-date-from');
    const toInput = document.getElementById('archive-date-to');
    const cashierSelect = document.getElementById('archive-cashier-select');
    const paySelect = document.getElementById('archive-payment-select');
    const searchInput = document.getElementById('archive-search-input');

    if (fromInput) {
      fromInput.addEventListener('change', (e) => {
        dateFrom = e.target.value;
        renderArchiveInvoices();
      });
    }

    if (toInput) {
      toInput.addEventListener('change', (e) => {
        dateTo = e.target.value;
        renderArchiveInvoices();
      });
    }

    if (cashierSelect) {
      cashierSelect.addEventListener('change', (e) => {
        filterCashier = e.target.value;
        renderArchiveInvoices();
      });
    }

    if (paySelect) {
      paySelect.addEventListener('change', (e) => {
        filterPayment = e.target.value;
        renderArchiveInvoices();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderArchiveInvoices();
      });
    }
  }

  function renderCashierFilterOptions() {
    const cashierSelect = document.getElementById('archive-cashier-select');
    if (!cashierSelect) return;

    const users = Store.getUsers();
    cashierSelect.innerHTML = `<option value="all">جميع الكاشيرات</option>` +
      users.map(u => `<option value="${u.username}">${u.name} (@${u.username})</option>`).join('');
  }

  function getFilteredTransactions() {
    let list = Store.getTransactions();

    // Date range filter
    if (dateFrom) {
      list = list.filter(t => (t.timestamp || '').split('T')[0] >= dateFrom);
    }
    if (dateTo) {
      list = list.filter(t => (t.timestamp || '').split('T')[0] <= dateTo);
    }

    // Cashier filter
    if (filterCashier !== 'all') {
      list = list.filter(t => t.username === filterCashier || t.cashierName === filterCashier);
    }

    // Payment method filter
    if (filterPayment !== 'all') {
      list = list.filter(t => t.paymentMethod === filterPayment);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(t =>
        (t.invoiceNumber && t.invoiceNumber.toLowerCase().includes(q)) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        (t.customerPhone && t.customerPhone.includes(q)) ||
        (t.cashierName && t.cashierName.toLowerCase().includes(q))
      );
    }

    return list;
  }

  function renderArchiveInvoices() {
    const tableBody = document.getElementById('archive-invoices-table-body');
    if (!tableBody) return;

    const list = getFilteredTransactions();
    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    // Update filter summary counters
    const filteredTotal = list.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const filteredProfit = list.reduce((sum, t) => sum + (Number(t.netProfit) || 0), 0);

    const countEl = document.getElementById('archive-summary-count');
    const totalEl = document.getElementById('archive-summary-total');
    const profitEl = document.getElementById('archive-summary-profit');

    if (countEl) countEl.textContent = `${list.length} فاتورة`;
    if (totalEl) totalEl.textContent = `${filteredTotal.toFixed(2)} ${curr}`;
    if (profitEl) profitEl.textContent = `${filteredProfit.toFixed(2)} ${curr}`;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" class="py-12 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl text-outline-variant mb-1">receipt_long</span>
            <p class="font-bold">لا توجد فواتير مطابقة لمعايير البحث المحددة</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list.map(tx => {
      const itemsCount = (tx.items || []).length;
      const firstItem = tx.items && tx.items[0] ? tx.items[0].name : 'مبيعات';

      return `
        <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors text-sm">
          <td class="py-3 px-4 font-mono font-bold text-primary">
            ${tx.invoiceNumber}
          </td>
          <td class="py-3 px-4 font-mono text-xs text-on-surface-variant">
            ${new Date(tx.timestamp).toLocaleString('ar-EG')}
          </td>
          <td class="py-3 px-4">
            <div class="flex items-center gap-1.5 font-bold text-on-surface text-xs">
              <span class="material-symbols-outlined text-[16px] text-primary">person</span>
              <span>${tx.cashierName}</span>
            </div>
          </td>
          <td class="py-3 px-4 text-xs text-on-surface-variant">
            <span class="font-bold text-on-surface">${firstItem}</span>
            ${itemsCount > 1 ? `<span class="text-[11px] bg-surface-container px-1 rounded mr-1">+${itemsCount - 1} أصناف</span>` : ''}
          </td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
              ${tx.paymentMethod}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-mono font-bold text-secondary">
            ${Number(tx.total).toFixed(2)} ${curr}
          </td>
          <td class="py-3 px-4 text-center">
            <button onclick="POS.openReceiptModal(Store.getTransactions().find(t => t.id === '${tx.id}'))"
              class="flex items-center gap-1 mx-auto px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-bold text-on-surface transition-colors"
              title="عرض وطباعة الفاتورة">
              <span class="material-symbols-outlined text-[16px]">print</span>
              <span>طباعة</span>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Historical Daily & Monthly Archives Rendering ---
  function renderHistoricalDailyArchives() {
    const tableBody = document.getElementById('archive-daily-history-table-body');
    if (!tableBody) return;

    const archives = Store.getDailyArchives();
    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    if (archives.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-3xl text-outline-variant mb-1">archive</span>
            <p class="font-bold">سجل الأرشيف نظيف حتى الآن</p>
            <span class="text-xs">يتم حفظ اليومية في الأرشيف تلقائياً عند التصفير اليومي أو اليدوي</span>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = archives.map(arch => `
      <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors text-sm">
        <td class="py-3 px-4 font-mono font-bold text-on-surface">
          ${arch.date}
        </td>
        <td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
          ${arch.invoicesCount || 0} عملية
        </td>
        <td class="py-3 px-4 text-center font-mono font-bold text-secondary">
          ${Number(arch.totalSales || 0).toFixed(2)} ${curr}
        </td>
        <td class="py-3 px-4 text-center font-mono font-bold text-primary">
          ${Number(arch.netProfit || 0).toFixed(2)} ${curr}
        </td>
        <td class="py-3 px-4 text-center text-xs text-on-surface-variant font-mono">
          ${arch.closedByType || 'تصفير دوري'} (${new Date(arch.closedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })})
        </td>
      </tr>
    `).join('');
  }

  // --- Export Filtered Transactions to CSV ---
  function exportCSV() {
    const list = getFilteredTransactions();
    if (list.length === 0) {
      App.showToast('لا توجد بيانات لتصديرها في النطاق المحدد', 'warning');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic support in Excel
    csvContent += 'رقم الفاتورة,التاريخ,الوقت,الكاشير,طريقة الدفع,الأصناف,الإجمالي,الربح الصافي,اسم العميل,هاتف العميل\n';

    list.forEach(tx => {
      const date = new Date(tx.timestamp).toLocaleDateString('ar-EG');
      const time = new Date(tx.timestamp).toLocaleTimeString('ar-EG');
      const itemsStr = (tx.items || []).map(i => `${i.name} (x${i.quantity || 1})`).join(' | ').replace(/"/g, '""');

      csvContent += `"${tx.invoiceNumber}","${date}","${time}","${tx.cashierName}","${tx.paymentMethod}","${itemsStr}",${(tx.total || 0).toFixed(2)},${(tx.netProfit || 0).toFixed(2)},"${tx.customerName || ''}","${tx.customerPhone || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `كشف_مبيعات_سنترال_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    App.showToast('تم تصدير كشف المبيعات كملف CSV بنجاح', 'success');
  }

  return {
    init,
    renderArchiveInvoices,
    renderHistoricalDailyArchives,
    exportCSV
  };
})();

if (typeof window !== 'undefined') {
  window.Archive = Archive;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Archive;
}
