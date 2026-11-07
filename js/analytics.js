/**
 * Admin Analytics, KPI Dashboards & Auto-Reset Logic
 * Real-time financial counters, countdown timers, live operations stream,
 * employee performance breakdown & shift closing audit
 */

const Analytics = (function () {
  let countdownInterval = null;

  function init() {
    startDailyCountdown();
    refresh();
  }

  function refresh() {
    renderKPIs();
    renderHourlyChart();
    renderCategoryBreakdown();
    renderLiveOperationsStream();
    renderEmployeePerformance();
  }

  // --- Real-time Countdown Timer for Daily Auto-Reset ---
  function startDailyCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    function update() {
      const settings = Store.getSettings();
      const resetHourStr = settings.dailyResetHour || '00:00';
      const [rHour, rMin] = resetHourStr.split(':').map(Number);

      const now = new Date();
      const target = new Date();
      target.setHours(rHour, rMin, 0, 0);

      // If already past today's reset hour, target is tomorrow
      if (now >= target) {
        target.setDate(target.getDate() + 1);
      }

      const diff = target - now;

      if (diff <= 1000) {
        // Auto-reset triggered!
        Store.checkAutoReset();
        refresh();
        App.showToast('تم تصفير عداد اليوم آلياً وأرشفة الدورة السابقة', 'info');
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Update in header and in dashboard card
      const headerTimer = document.getElementById('header-daily-timer');
      const cardTimer = document.getElementById('dashboard-daily-timer');

      if (headerTimer) headerTimer.textContent = formatted;
      if (cardTimer) cardTimer.textContent = formatted;
    }

    update();
    countdownInterval = setInterval(update, 1000);
  }

  // --- KPI Cards Rendering ---
  function renderKPIs() {
    const stats = Store.getDashboardStats();
    const curr = stats.currency || 'ج.م';

    // Daily Sales Counter
    const dailySalesEl = document.getElementById('kpi-daily-sales');
    const dailyProfitEl = document.getElementById('kpi-daily-profit');
    const profitMarginEl = document.getElementById('kpi-profit-margin');

    if (dailySalesEl) dailySalesEl.textContent = `${stats.todaySales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${curr}`;
    if (dailyProfitEl) dailyProfitEl.textContent = `${stats.todayProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${curr}`;
    if (profitMarginEl) profitMarginEl.textContent = `هامش ربح ${stats.profitMarginPercent}%`;

    // Monthly Sales Counter
    const monthlySalesEl = document.getElementById('kpi-monthly-sales');
    if (monthlySalesEl) monthlySalesEl.textContent = `${stats.monthSales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${curr}`;

    // Invoices Count Today
    const invoicesCountEl = document.getElementById('kpi-today-invoices');
    if (invoicesCountEl) invoicesCountEl.textContent = `${stats.todayInvoices} عملية`;

    // Active Cashiers
    const activeCashiersEl = document.getElementById('kpi-active-cashiers');
    if (activeCashiersEl) activeCashiersEl.textContent = stats.activeCashiers;

    // Header sales badge
    const headerSalesBadge = document.getElementById('header-today-sales');
    if (headerSalesBadge) {
      headerSalesBadge.textContent = `${stats.todaySales.toLocaleString('ar-EG', { minimumFractionDigits: 2 })} ${curr}`;
    }
  }

  // --- Category Financial Breakdown ---
  function renderCategoryBreakdown() {
    const stats = Store.getDashboardStats();
    const curr = stats.currency || 'ج.م';
    const cb = stats.categoryBreakdown;

    const cardsEl = document.getElementById('breakdown-cards-profit');
    const walletsEl = document.getElementById('breakdown-wallets-profit');
    const accessoriesEl = document.getElementById('breakdown-accessories-profit');
    const maintenanceEl = document.getElementById('breakdown-maintenance-profit');

    if (cardsEl) cardsEl.textContent = `${cb.cards.toFixed(2)} ${curr}`;
    if (walletsEl) walletsEl.textContent = `${cb.wallets.toFixed(2)} ${curr}`;
    if (accessoriesEl) accessoriesEl.textContent = `${cb.accessories.toFixed(2)} ${curr}`;
    if (maintenanceEl) maintenanceEl.textContent = `${cb.maintenance.toFixed(2)} ${curr}`;
  }

  // --- Hourly Sales Volume Chart (SVG & Pure CSS) ---
  function renderHourlyChart() {
    const container = document.getElementById('analytics-hourly-chart');
    if (!container) return;

    const todayTx = Store.getTodayTransactions();
    // 12 slots from 10 AM to 10 PM
    const hours = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];
    const hourlyTotals = hours.map(h => {
      let sum = 0;
      todayTx.forEach(t => {
        const d = new Date(t.timestamp);
        if (d.getHours() === h) sum += (Number(t.total) || 0);
      });
      return { hour: h, total: sum };
    });

    const maxVal = Math.max(...hourlyTotals.map(h => h.total), 500); // Baseline scale

    container.innerHTML = hourlyTotals.map(item => {
      const heightPercent = Math.max(8, (item.total / maxVal) * 100);
      const isPeak = item.total > 0 && item.total === Math.max(...hourlyTotals.map(h => h.total));
      const displayHour = item.hour > 12 ? `${item.hour - 12}م` : `${item.hour}ص`;

      return `
        <div class="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
          <div class="relative w-full flex items-end justify-center h-48 bg-surface-container-low/40 rounded-xl p-1">
            <!-- Tooltip -->
            <div class="absolute -top-9 hidden group-hover:flex flex-col items-center bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded-md text-[11px] font-mono whitespace-nowrap z-20 shadow-md">
              <span>${item.total.toFixed(0)} ج.م</span>
            </div>

            <!-- Bar -->
            <div class="w-full max-w-[24px] rounded-lg transition-all duration-300 ${isPeak ? 'bg-secondary' : 'bg-primary group-hover:bg-primary-container'}"
              style="height: ${heightPercent}%;">
            </div>
          </div>
          <span class="text-[11px] text-on-surface-variant font-mono">${displayHour}</span>
        </div>
      `;
    }).join('');
  }

  // --- Live Operations Stream (سجل العمليات اللحظية) ---
  function renderLiveOperationsStream() {
    const stream = document.getElementById('analytics-live-operations-stream');
    if (!stream) return;

    const todayTx = Store.getTodayTransactions();

    if (todayTx.length === 0) {
      stream.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center text-on-surface-variant">
          <span class="material-symbols-outlined text-4xl text-outline-variant mb-2">history</span>
          <p class="font-title-md font-bold">لا توجد عمليات بيع اليوم حتى الآن</p>
          <span class="font-body-sm text-sm text-center">الموقع متصفر وجاهز لتسجيل أول فاتورة فور بدء العمل</span>
        </div>
      `;
      return;
    }

    const curr = (Store.getSettings() || {}).currency || 'ج.م';

    stream.innerHTML = todayTx.slice(0, 8).map(tx => {
      const timeStr = new Date(tx.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      const itemsCount = (tx.items || []).length;
      const firstItem = tx.items && tx.items[0] ? tx.items[0].name : 'عملية بيع';

      let methodIcon = 'payments';
      if (tx.paymentMethod === 'محفظة كاش') methodIcon = 'account_balance_wallet';
      else if (tx.paymentMethod === 'فيزا / POS') methodIcon = 'credit_card';

      return `
        <div class="flex items-center justify-between p-space-md bg-surface-container-low rounded-xl border border-transparent hover:border-outline-variant transition-all cursor-pointer"
          onclick="POS.openReceiptModal(Store.getTransactions().find(t => t.id === '${tx.id}'))"
          title="عرض الفاتورة والطباعة">
          <div class="flex items-center gap-space-md">
            <div class="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary shrink-0">
              <span class="material-symbols-outlined text-[20px]">${methodIcon}</span>
            </div>
            <div class="flex flex-col">
              <div class="flex items-center gap-2">
                <span class="font-title-md font-bold text-on-surface">${tx.invoiceNumber}</span>
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">${tx.paymentMethod}</span>
              </div>
              <span class="font-body-sm text-on-surface-variant text-xs mt-0.5">${firstItem} ${itemsCount > 1 ? `(+${itemsCount - 1} أصناف)` : ''} • الكاشير: ${tx.cashierName}</span>
            </div>
          </div>

          <div class="flex flex-col items-end">
            <span class="font-title-md font-bold text-secondary font-mono">${Number(tx.total).toFixed(2)} ${curr}</span>
            <span class="text-[11px] text-on-surface-variant font-mono mt-0.5">${timeStr}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // --- Employee Performance Breakdown Table ---
  function renderEmployeePerformance() {
    const tableBody = document.getElementById('analytics-employee-performance-table');
    if (!tableBody) return;

    const stats = Store.getDashboardStats();
    const curr = stats.currency || 'ج.م';

    tableBody.innerHTML = stats.employeePerformance.map(emp => {
      const isOnline = emp.status === 'active';
      return `
        <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs shrink-0">
                ${emp.name.substring(0, 1)}
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-on-surface text-sm">${emp.name}</span>
                <span class="text-[11px] text-on-surface-variant font-mono">${emp.id} • ${emp.shift}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${emp.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}">
              ${emp.role === 'admin' ? 'مدير عام' : 'كاشير مبيعات'}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-mono font-bold text-on-surface">
            ${emp.invoicesCount} عملية
          </td>
          <td class="py-3 px-4 text-center font-mono font-bold text-secondary">
            ${emp.totalSales.toFixed(2)} ${curr}
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-2">
              <div class="w-16 bg-surface-container rounded-full h-2 overflow-hidden">
                <div class="bg-primary h-full rounded-full" style="width: ${emp.sharePercent}%;"></div>
              </div>
              <span class="font-mono text-xs font-bold text-on-surface">${emp.sharePercent}%</span>
            </div>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${isOnline ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}">
              <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-secondary' : 'bg-outline'}"></span>
              <span>${isOnline ? 'نشط' : 'معلق'}</span>
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Manual Reset & Shift Close Modal ---
  function openResetModal() {
    const modal = document.getElementById('reset-modal');
    if (!modal) return;

    const stats = Store.getDashboardStats();
    const curr = stats.currency || 'ج.م';

    const countEl = document.getElementById('reset-modal-invoices-count');
    const totalEl = document.getElementById('reset-modal-total-sales');

    if (countEl) countEl.textContent = `${stats.todayInvoices} عملية`;
    if (totalEl) totalEl.textContent = `${stats.todaySales.toFixed(2)} ${curr}`;

    modal.classList.remove('hidden');
  }

  function closeResetModal() {
    const modal = document.getElementById('reset-modal');
    if (modal) modal.classList.add('hidden');
  }

  function confirmResetShift() {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      App.showToast('صلاحية التصفير مقتصرة على مدير النظام فقط', 'error');
      closeResetModal();
      return;
    }

    Store.manualResetShift(user);
    closeResetModal();
    refresh();
    POS.renderCashierShiftSummary();
    App.playSound('cash');
    App.showToast('تم تصفير العداد وتقفيل الوردية الحالية بنجاح!', 'success');
  }

  function printFinancialReport() {
    window.print();
  }

  return {
    init,
    refresh,
    openResetModal,
    closeResetModal,
    confirmResetShift,
    printFinancialReport
  };
})();
