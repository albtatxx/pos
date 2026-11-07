/**
 * Tawasul Telecom POS Store & State Management
 * Persistent Relational State via LocalStorage
 * Full Arabic Telecom Central Business Logic
 */

const Store = (function () {
  const KEYS = {
    USERS: 'telecom_pos_users',
    CURRENT_USER: 'telecom_pos_current_user',
    PRODUCTS: 'telecom_pos_products',
    WALLETS: 'telecom_pos_wallets',
    TRANSACTIONS: 'telecom_pos_transactions',
    DAILY_ARCHIVES: 'telecom_pos_daily_archives',
    MONTHLY_ARCHIVES: 'telecom_pos_monthly_archives',
    SETTINGS: 'telecom_pos_settings',
    AUDIT_LOGS: 'telecom_pos_audit_logs',
    HELD_CARTS: 'telecom_pos_held_carts'
  };

  const DEFAULT_SETTINGS = {
    storeName: 'سنترال وموبايليات الأمانة',
    storeSubtitle: 'نظام البيع السحابي المتزامن • فرع التحرير',
    storePhone: '01012345678 / 01198765432',
    storeAddress: 'شارع التحرير، باب اللوق، وسط البلد، القاهرة',
    currency: 'ج.م',
    receiptHeader: 'أهلاً وسهلاً بكم في سنترال وموبايليات الأمانة',
    receiptFooter: 'شكراً لتعاملكم معنا • البضاعة المباعة ترد خلال 14 يوماً وفق قانون حماية المستهلك',
    allowPublicRegistration: true, // Toggle: Allow public registration vs Admin-only
    dailyResetHour: '00:00', // Default midnight auto-reset
    lastResetDate: new Date().toISOString().split('T')[0],
    lastResetMonth: new Date().toISOString().substring(0, 7),
    defaultCommissionRate: 1.5,
    minCommissionFee: 5.00,
    darkMode: false
  };

  const SEED_USERS = [
    {
      id: 'USR-01',
      name: 'المدير العام',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      status: 'active',
      shift: 'جميع الورديات',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    },
    {
      id: 'USR-04',
      name: 'أحمد كاشير',
      username: 'cashier1',
      password: 'cashier123',
      role: 'cashier',
      status: 'active',
      shift: 'وردية الصباح',
      createdAt: new Date().toISOString(),
      lastLogin: null
    },
    {
      id: 'USR-08',
      name: 'سارة مبيعات',
      username: 'cashier2',
      password: 'cashier123',
      role: 'cashier',
      status: 'active',
      shift: 'وردية المساء',
      createdAt: new Date().toISOString(),
      lastLogin: null
    }
  ];

  const SEED_PRODUCTS = [
    // 1. كروت شحن وفكة
    {
      id: 'PRD-101',
      barcode: '622300101001',
      name: 'كارت فودافون 50 جنيه',
      category: 'cards',
      categoryName: 'كروت شحن وفكة',
      costPrice: 48.00,
      sellingPrice: 50.00,
      stock: 75,
      minStock: 20,
      unit: 'قطعة',
      active: true,
      icon: 'contactless',
      color: 'bg-red-500/10 text-red-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-102',
      barcode: '622300101002',
      name: 'كارت أورانج 100 جنيه',
      category: 'cards',
      categoryName: 'كروت شحن وفكة',
      costPrice: 96.50,
      sellingPrice: 100.00,
      stock: 45,
      minStock: 15,
      unit: 'قطعة',
      active: true,
      icon: 'contactless',
      color: 'bg-orange-500/10 text-orange-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-103',
      barcode: '622300101003',
      name: 'كارت اتصالات 25 جنيه',
      category: 'cards',
      categoryName: 'كروت شحن وفكة',
      costPrice: 24.00,
      sellingPrice: 25.00,
      stock: 60,
      minStock: 20,
      unit: 'قطعة',
      active: true,
      icon: 'contactless',
      color: 'bg-emerald-500/10 text-emerald-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-104',
      barcode: '622300101004',
      name: 'كارت وي WE فكة 10 جنيه',
      category: 'cards',
      categoryName: 'كروت شحن وفكة',
      costPrice: 9.60,
      sellingPrice: 10.00,
      stock: 110,
      minStock: 30,
      unit: 'قطعة',
      active: true,
      icon: 'contactless',
      color: 'bg-purple-500/10 text-purple-600',
      lastUpdated: new Date().toISOString()
    },

    // 2. إكسسوارات وموبايلات
    {
      id: 'PRD-201',
      barcode: '6971203001',
      name: 'سماعة بلوتوث T03S Pro',
      category: 'accessories',
      categoryName: 'إكسسوارات وموبايلات',
      costPrice: 340.00,
      sellingPrice: 420.00,
      stock: 18,
      minStock: 5,
      unit: 'قطعة',
      active: true,
      icon: 'headphones',
      color: 'bg-blue-500/10 text-blue-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-202',
      barcode: '6971203002',
      name: 'شاحن أنكر 20W Type-C أصلي',
      category: 'accessories',
      categoryName: 'إكسسوارات وموبايلات',
      costPrice: 220.00,
      sellingPrice: 290.00,
      stock: 22,
      minStock: 6,
      unit: 'قطعة',
      active: true,
      icon: 'power',
      color: 'bg-blue-500/10 text-blue-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-203',
      barcode: '6971203003',
      name: 'اسكرينة زجاج 11D ضد الكسر',
      category: 'accessories',
      categoryName: 'إكسسوارات وموبايلات',
      costPrice: 15.00,
      sellingPrice: 45.00,
      stock: 85,
      minStock: 25,
      unit: 'قطعة',
      active: true,
      icon: 'mobile_friendly',
      color: 'bg-emerald-500/10 text-emerald-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-204',
      barcode: '6971203004',
      name: 'كابل شحن سريع Type-C إلى Type-C',
      category: 'accessories',
      categoryName: 'إكسسوارات وموبايلات',
      costPrice: 35.00,
      sellingPrice: 65.00,
      stock: 40,
      minStock: 10,
      unit: 'قطعة',
      active: true,
      icon: 'cable',
      color: 'bg-amber-500/10 text-amber-600',
      lastUpdated: new Date().toISOString()
    },

    // 3. خدمات وتحويلات
    {
      id: 'PRD-301',
      barcode: 'SRV-VF-CASH',
      name: 'تحويل / إيداع فودافون كاش',
      category: 'services',
      categoryName: 'خدمات وتحويلات كاش',
      costPrice: 0.00,
      sellingPrice: 0.00, // Dynamic amount + commission
      stock: 99999,
      minStock: 10,
      unit: 'عملية',
      active: true,
      isCustomService: true,
      icon: 'swap_horiz',
      color: 'bg-red-500/10 text-red-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-302',
      barcode: 'SRV-INSTAPAY',
      name: 'تحويل كاش إنستاباي InstaPay',
      category: 'services',
      categoryName: 'خدمات وتحويلات كاش',
      costPrice: 0.00,
      sellingPrice: 0.00,
      stock: 99999,
      minStock: 10,
      unit: 'عملية',
      active: true,
      isCustomService: true,
      icon: 'account_balance',
      color: 'bg-cyan-500/10 text-cyan-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-303',
      barcode: 'SRV-WE-BILL',
      name: 'دفع فاتورة إنترنت منزلي WE',
      category: 'services',
      categoryName: 'خدمات وتحويلات كاش',
      costPrice: 0.00,
      sellingPrice: 0.00,
      stock: 99999,
      minStock: 10,
      unit: 'عملية',
      active: true,
      isCustomService: true,
      icon: 'router',
      color: 'bg-purple-500/10 text-purple-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-304',
      barcode: 'SRV-FAWRY',
      name: 'شحن رصيد وكروت فوري ع الطاير',
      category: 'services',
      categoryName: 'خدمات وتحويلات كاش',
      costPrice: 0.00,
      sellingPrice: 0.00,
      stock: 99999,
      minStock: 10,
      unit: 'عملية',
      active: true,
      isCustomService: true,
      icon: 'bolt',
      color: 'bg-yellow-500/10 text-yellow-600',
      lastUpdated: new Date().toISOString()
    },

    // 4. صيانة وخدمات سريعة
    {
      id: 'PRD-401',
      barcode: 'MNT-SCREEN',
      name: 'تغيير شاشة موبايل / باغة كاملة',
      category: 'maintenance',
      categoryName: 'صيانة وسوفت وير',
      costPrice: 130.00,
      sellingPrice: 280.00,
      stock: 12,
      minStock: 3,
      unit: 'جهاز',
      active: true,
      icon: 'build',
      color: 'bg-indigo-500/10 text-indigo-600',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'PRD-402',
      barcode: 'MNT-SOFTWARE',
      name: 'سوفت وير وفك شفرة وضبط مصنع',
      category: 'maintenance',
      categoryName: 'صيانة وسوفت وير',
      costPrice: 10.00,
      sellingPrice: 80.00,
      stock: 999,
      minStock: 5,
      unit: 'جهاز',
      active: true,
      icon: 'terminal',
      color: 'bg-slate-500/10 text-slate-700',
      lastUpdated: new Date().toISOString()
    }
  ];

  const SEED_WALLETS = {
    vodafone: { name: 'فودافون كاش', balance: 15400.00, limit: 100000.00, icon: 'phone_android', color: 'red' },
    orange: { name: 'أورانج كاش', balance: 8250.00, limit: 100000.00, icon: 'phone_android', color: 'orange' },
    etisalat: { name: 'اتصالات كاش', balance: 6800.00, limit: 100000.00, icon: 'phone_android', color: 'emerald' },
    we: { name: 'وي باي (WE)', balance: 4100.00, limit: 100000.00, icon: 'phone_android', color: 'purple' },
    instapay: { name: 'إنستاباي InstaPay', balance: 19500.00, limit: 200000.00, icon: 'account_balance', color: 'cyan' },
    fawry: { name: 'ماكينة فوري POS', balance: 12300.00, limit: 50000.00, icon: 'point_of_sale', color: 'yellow' },
    aman: { name: 'ماكينة أمان POS', balance: 5600.00, limit: 50000.00, icon: 'point_of_sale', color: 'blue' }
  };

  // Helper storage functions
  function getRaw(key, defaultVal) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultVal;
    } catch (e) {
      console.error('Storage Read Error for key:', key, e);
      return defaultVal;
    }
  }

  function setRaw(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage Write Error for key:', key, e);
    }
  }

  // Cloud Sync Dispatcher
  function syncCloud(action, data) {
    try {
      if (typeof window !== 'undefined' && window.FirebaseSync) {
        if (action === 'saveTransaction' && window.FirebaseSync.saveTransaction) window.FirebaseSync.saveTransaction(data);
        else if (action === 'saveProduct' && window.FirebaseSync.saveProduct) window.FirebaseSync.saveProduct(data);
        else if (action === 'deleteProduct' && window.FirebaseSync.deleteProduct) window.FirebaseSync.deleteProduct(data);
        else if (action === 'saveUser' && window.FirebaseSync.saveUser) window.FirebaseSync.saveUser(data);
        else if (action === 'deleteUser' && window.FirebaseSync.deleteUser) window.FirebaseSync.deleteUser(data);
        else if (action === 'saveWallets' && window.FirebaseSync.saveWallets) window.FirebaseSync.saveWallets(data);
        else if (action === 'saveSettings' && window.FirebaseSync.saveSettings) window.FirebaseSync.saveSettings(data);
        else if (action === 'saveDailyArchive' && window.FirebaseSync.saveDailyArchive) window.FirebaseSync.saveDailyArchive(data);
        else if (action === 'saveAuditLog' && window.FirebaseSync.saveAuditLog) window.FirebaseSync.saveAuditLog(data);
      }
    } catch (e) {
      // Cloud sync failure should never disrupt POS operation
    }
  }

  // Initialization: ensure seeded database exists
  // IMPORTANT: Transactions start completely ZEROED as requested:
  // "وخليلي الموقع متصفر وجاهز للشغل علي طول واعملي حساب الادمن وابعتهولي"
  function init() {
    if (!localStorage.getItem(KEYS.USERS)) {
      setRaw(KEYS.USERS, SEED_USERS);
    }
    if (!localStorage.getItem(KEYS.PRODUCTS)) {
      setRaw(KEYS.PRODUCTS, SEED_PRODUCTS);
    }
    if (!localStorage.getItem(KEYS.WALLETS)) {
      setRaw(KEYS.WALLETS, SEED_WALLETS);
    }
    if (!localStorage.getItem(KEYS.SETTINGS)) {
      setRaw(KEYS.SETTINGS, DEFAULT_SETTINGS);
    }
    if (!localStorage.getItem(KEYS.TRANSACTIONS)) {
      setRaw(KEYS.TRANSACTIONS, []); // ZEROED & READY
    }
    if (!localStorage.getItem(KEYS.DAILY_ARCHIVES)) {
      setRaw(KEYS.DAILY_ARCHIVES, []);
    }
    if (!localStorage.getItem(KEYS.MONTHLY_ARCHIVES)) {
      setRaw(KEYS.MONTHLY_ARCHIVES, []);
    }
    if (!localStorage.getItem(KEYS.AUDIT_LOGS)) {
      setRaw(KEYS.AUDIT_LOGS, [
        {
          id: 'LOG-001',
          timestamp: new Date().toISOString(),
          userId: 'USR-01',
          username: 'admin',
          action: 'تهيئة النظام وتصفير العدادات',
          category: 'system',
          details: 'تم تثبيت النظام وتصفير المبيعات وبدء دورة العمل الجديدة بنجاح',
          status: 'success',
          ip: '127.0.0.1 (Local POS)'
        }
      ]);
    }
    if (!localStorage.getItem(KEYS.HELD_CARTS)) {
      setRaw(KEYS.HELD_CARTS, []);
    }

    // Run auto-reset verification on boot
    checkAutoReset();
  }

  // --- Auto-Reset Logic (اليومي والشهري) ---
  function checkAutoReset() {
    const settings = getSettings();
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentMonth = now.toISOString().substring(0, 7);

    let resetHappened = false;

    // 1. Check Daily Reset
    if (settings.lastResetDate && settings.lastResetDate !== currentDate) {
      // Archive previous day's sales
      const prevTransactions = getTransactionsForDate(settings.lastResetDate);
      if (prevTransactions.length > 0) {
        archiveDay(settings.lastResetDate, prevTransactions, 'آلي (منتصف الليل)');
      }
      settings.lastResetDate = currentDate;
      resetHappened = true;
      addAuditLog('تصفير يومي تلقائي', `تم تصفير عداد اليوم آلياً وأرشفة مبيعات تاريخ ${settings.lastResetDate}`, 'auto_reset', 'SYSTEM', 'النظام الآلي');
    }

    // 2. Check Monthly Reset
    if (settings.lastResetMonth && settings.lastResetMonth !== currentMonth) {
      archiveMonth(settings.lastResetMonth, 'آلي (أول الشهر)');
      settings.lastResetMonth = currentMonth;
      resetHappened = true;
      addAuditLog('تصفير شهري تلقائي', `تم تصفير عداد الشهر آلياً وأرشفة مبيعات شهر ${settings.lastResetMonth}`, 'auto_reset', 'SYSTEM', 'النظام الآلي');
    }

    if (resetHappened) {
      saveSettings(settings);
    }
  }

  function archiveDay(dateStr, transactions, closedByType = 'يدوي') {
    const archives = getDailyArchives();
    const totalSales = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const netProfit = transactions.reduce((sum, t) => sum + (Number(t.netProfit) || 0), 0);

    // Group sales by cashier
    const cashierStats = {};
    transactions.forEach(t => {
      const cName = t.cashierName || 'غير معروف';
      if (!cashierStats[cName]) cashierStats[cName] = { count: 0, total: 0 };
      cashierStats[cName].count++;
      cashierStats[cName].total += Number(t.total) || 0;
    });

    const archiveEntry = {
      id: 'ARCH-D-' + dateStr,
      date: dateStr,
      closedAt: new Date().toISOString(),
      closedByType: closedByType,
      totalSales: totalSales,
      netProfit: netProfit,
      invoicesCount: transactions.length,
      cashierBreakdown: cashierStats,
      transactionsCount: transactions.length
    };

    // Remove if already exists for same date, prepend new
    const filtered = archives.filter(a => a.date !== dateStr);
    filtered.unshift(archiveEntry);
    setRaw(KEYS.DAILY_ARCHIVES, filtered);
    syncCloud('saveDailyArchive', archiveEntry);
  }

  function archiveMonth(monthStr, closedByType = 'آلي') {
    const archives = getMonthlyArchives();
    const transactions = getTransactions().filter(t => (t.timestamp || '').startsWith(monthStr));
    const totalSales = transactions.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const netProfit = transactions.reduce((sum, t) => sum + (Number(t.netProfit) || 0), 0);

    const archiveEntry = {
      id: 'ARCH-M-' + monthStr,
      month: monthStr,
      closedAt: new Date().toISOString(),
      closedByType: closedByType,
      totalSales: totalSales,
      netProfit: netProfit,
      invoicesCount: transactions.length
    };

    const filtered = archives.filter(a => a.month !== monthStr);
    filtered.unshift(archiveEntry);
    setRaw(KEYS.MONTHLY_ARCHIVES, filtered);
  }

  // --- Transactions API ---
  function getTransactions() {
    return getRaw(KEYS.TRANSACTIONS, []);
  }

  function getTransactionsForDate(dateStr) {
    const list = getTransactions();
    return list.filter(t => (t.timestamp || '').startsWith(dateStr));
  }

  function getTodayTransactions() {
    const today = new Date().toISOString().split('T')[0];
    return getTransactionsForDate(today);
  }

  function getCurrentMonthTransactions() {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const list = getTransactions();
    return list.filter(t => (t.timestamp || '').startsWith(currentMonth));
  }

  function generateInvoiceNumber() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const prefix = `INV-${y}${m}${d}`;
    const todayCount = getTodayTransactions().length + 1;
    return `${prefix}-${String(todayCount).padStart(3, '0')}`;
  }

  function addTransaction(data) {
    const transactions = getTransactions();
    const invoiceNum = generateInvoiceNumber();

    // Calculate profit
    let totalCost = 0;
    (data.items || []).forEach(item => {
      const itemCost = Number(item.costPrice || 0) * (item.quantity || 1);
      totalCost += itemCost;
    });

    const netProfit = Math.max(0, (Number(data.total) || 0) - totalCost);

    const newTx = {
      id: 'TX-' + Date.now(),
      invoiceNumber: invoiceNum,
      userId: data.userId || 'USR-01',
      username: data.username || 'admin',
      cashierName: data.cashierName || 'المدير العام',
      timestamp: new Date().toISOString(),
      items: data.items || [],
      subtotal: Number(data.subtotal) || 0,
      discount: Number(data.discount) || 0,
      serviceFee: Number(data.serviceFee) || 0,
      total: Number(data.total) || 0,
      netProfit: netProfit,
      paymentMethod: data.paymentMethod || 'نقدي',
      customerName: data.customerName || 'عميل نقدي',
      customerPhone: data.customerPhone || '',
      notes: data.notes || '',
      status: 'completed'
    };

    transactions.unshift(newTx);
    setRaw(KEYS.TRANSACTIONS, transactions);

    // Decrement stock for inventory items sold
    (data.items || []).forEach(item => {
      if (item.productId && !item.isCustomService) {
        decrementProductStock(item.productId, item.quantity || 1);
      }
      // If cash transfer service, deduct/add from wallet
      if (item.walletKey && item.amount) {
        adjustWalletBalance(item.walletKey, -Number(item.amount));
      }
    });

    // Add Audit Log entry
    addAuditLog(
      'إتمام عملية بيع',
      `فاتورة ${invoiceNum} بإجمالي ${newTx.total.toFixed(2)} ج.م بواسطة ${newTx.cashierName}`,
      'pos_sale',
      newTx.userId,
      newTx.username
    );

    syncCloud('saveTransaction', newTx);

    return newTx;
  }

  // --- Shift Close & Manual Reset ---
  function manualResetShift(adminUser) {
    const today = new Date().toISOString().split('T')[0];
    const todayTx = getTodayTransactions();

    archiveDay(today, todayTx, `يدوي بواسطة ${adminUser.name}`);

    // Update settings last reset
    const settings = getSettings();
    settings.lastResetDate = today;
    saveSettings(settings);

    addAuditLog(
      'تصفير يدوي وتقفيل وردية',
      `قام ${adminUser.name} (${adminUser.username}) بتصفير العداد الحالي وتقفيل الدورة المالية`,
      'manual_reset',
      adminUser.id,
      adminUser.username
    );

    return true;
  }

  // --- KPI & Statistics Calculation ---
  function getDashboardStats() {
    const todayTx = getTodayTransactions();
    const monthTx = getCurrentMonthTransactions();
    const users = getUsers();
    const settings = getSettings();

    const todaySales = todayTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const todayProfit = todayTx.reduce((sum, t) => sum + (Number(t.netProfit) || 0), 0);
    const todayInvoices = todayTx.length;

    const monthSales = monthTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    const monthProfit = monthTx.reduce((sum, t) => sum + (Number(t.netProfit) || 0), 0);

    // Active Cashiers
    const activeCashiers = users.filter(u => u.status === 'active' && u.role === 'cashier').length;

    // Category Sales Breakdown for Today
    let cardsProfit = 0;
    let accessoriesProfit = 0;
    let walletCommissions = 0;
    let maintenanceProfit = 0;

    todayTx.forEach(t => {
      (t.items || []).forEach(item => {
        const cat = item.category || '';
        const itemProfit = Math.max(0, (item.sellingPrice - item.costPrice) * (item.quantity || 1));
        if (cat === 'cards') cardsProfit += itemProfit;
        else if (cat === 'accessories') accessoriesProfit += itemProfit;
        else if (cat === 'services') walletCommissions += (Number(item.serviceFee) || itemProfit);
        else if (cat === 'maintenance') maintenanceProfit += itemProfit;
      });
    });

    // Employee Performance Breakdown for Today
    const employeeStats = users.map(user => {
      const userTx = todayTx.filter(t => t.userId === user.id || t.username === user.username);
      const userTotal = userTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      return {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        shift: user.shift || 'وردية عادية',
        status: user.status,
        invoicesCount: userTx.length,
        totalSales: userTotal,
        sharePercent: todaySales > 0 ? ((userTotal / todaySales) * 100).toFixed(1) : '0'
      };
    });

    return {
      todaySales,
      todayProfit,
      todayInvoices,
      monthSales,
      monthProfit,
      activeCashiers,
      profitMarginPercent: todaySales > 0 ? ((todayProfit / todaySales) * 100).toFixed(1) : '0',
      categoryBreakdown: {
        cards: cardsProfit,
        accessories: accessoriesProfit,
        wallets: walletCommissions,
        maintenance: maintenanceProfit
      },
      employeePerformance: employeeStats,
      currency: settings.currency || 'ج.م'
    };
  }

  // Cashier Personal Stats for Current Shift/Day
  function getCashierPersonalStats(userId, username) {
    const todayTx = getTodayTransactions();
    const myTx = todayTx.filter(t => t.userId === userId || t.username === username);
    const myTotal = myTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
    return {
      count: myTx.length,
      total: myTotal,
      transactions: myTx
    };
  }

  // --- Users & RBAC API ---
  function getUsers() {
    return getRaw(KEYS.USERS, []);
  }

  function getUser(id) {
    return getUsers().find(u => u.id === id);
  }

  function getUserByUsername(username) {
    return getUsers().find(u => u.username.toLowerCase() === (username || '').toLowerCase().trim());
  }

  function saveUser(userData) {
    const users = getUsers();
    if (!userData.id) {
      userData.id = 'USR-' + String(users.length + 1).padStart(2, '0');
      userData.createdAt = new Date().toISOString();
      userData.status = userData.status || 'active';
      users.push(userData);
      addAuditLog('إنشاء حساب مستخدم', `تم إنشاء مستخدم جديد: ${userData.name} (${userData.role})`, 'security', 'ADMIN', 'المدير');
    } else {
      const idx = users.findIndex(u => u.id === userData.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...userData };
        addAuditLog('تعديل حساب مستخدم', `تم تعديل بيانات المستخدم: ${userData.name}`, 'security', 'ADMIN', 'المدير');
      }
    }
    setRaw(KEYS.USERS, users);
    syncCloud('saveUser', userData);
    return userData;
  }

  function deleteUser(id) {
    let users = getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return false;
    if (user.username === 'admin') {
      throw new Error('لا يمكن حذف حساب الأدمن الرئيسي');
    }
    users = users.filter(u => u.id !== id);
    setRaw(KEYS.USERS, users);
    addAuditLog('حذف مستخدم', `تم حذف حساب المستخدم: ${user.name} (${user.username})`, 'security', 'ADMIN', 'المدير');
    syncCloud('deleteUser', id);
    return true;
  }

  function toggleUserStatus(id) {
    const users = getUsers();
    const user = users.find(u => u.id === id);
    if (!user) return null;
    if (user.username === 'admin') return user; // Cannot deactivate superadmin
    user.status = user.status === 'active' ? 'suspended' : 'active';
    setRaw(KEYS.USERS, users);
    addAuditLog('تغيير حالة حساب', `تم تعديل حالة حساب ${user.name} إلى ${user.status}`, 'security', 'ADMIN', 'المدير');
    syncCloud('saveUser', user);
    return user;
  }

  // --- Products & Services API ---
  function getProducts() {
    let prods = getRaw(KEYS.PRODUCTS, null);
    if (!Array.isArray(prods) || prods.length === 0) {
      prods = JSON.parse(JSON.stringify(SEED_PRODUCTS));
      setRaw(KEYS.PRODUCTS, prods);
    }
    // Guarantee required fields on every product
    prods.forEach((p, idx) => {
      if (!p.id) p.id = 'PRD-' + (100 + idx);
      if (typeof p.stock !== 'number') p.stock = p.isCustomService ? 99999 : 50;
      if (typeof p.sellingPrice !== 'number') p.sellingPrice = parseFloat(p.sellingPrice) || 0;
      if (typeof p.costPrice !== 'number') p.costPrice = parseFloat(p.costPrice) || 0;
    });
    return prods;
  }

  function getProduct(id) {
    if (!id && id !== 0) return null;
    const prods = getProducts();
    const cleanId = String(id).trim();
    let found = prods.find(p => String(p.id).trim() === cleanId || String(p.barcode || '').trim() === cleanId);
    if (!found) {
      found = SEED_PRODUCTS.find(p => String(p.id).trim() === cleanId || String(p.barcode || '').trim() === cleanId);
    }
    return found || null;
  }

  function getProductByBarcode(code) {
    if (!code && code !== 0) return null;
    const clean = String(code).trim();
    const prods = getProducts();
    return prods.find(p => String(p.barcode || '').trim() === clean || String(p.id).trim() === clean) || null;
  }

  function saveProduct(productData) {
    const products = getProducts();
    if (!productData.id) {
      productData.id = 'PRD-' + Date.now().toString().slice(-4);
      productData.lastUpdated = new Date().toISOString();
      productData.active = true;
      products.push(productData);
      addAuditLog('إضافة صنف للمخزن', `تمت إضافة صنف جديد: ${productData.name}`, 'inventory', 'ADMIN', 'المدير');
    } else {
      const idx = products.findIndex(p => p.id === productData.id);
      if (idx !== -1) {
        products[idx] = { ...products[idx], ...productData, lastUpdated: new Date().toISOString() };
        addAuditLog('تحديث صنف', `تم تحديث بيانات الصنف: ${productData.name}`, 'inventory', 'ADMIN', 'المدير');
      }
    }
    setRaw(KEYS.PRODUCTS, products);
    syncCloud('saveProduct', productData);
    return productData;
  }

  function deleteProduct(id) {
    let products = getProducts();
    const product = products.find(p => p.id === id);
    if (!product) return false;
    products = products.filter(p => p.id !== id);
    setRaw(KEYS.PRODUCTS, products);
    addAuditLog('حذف صنف من المخزن', `تم حذف الصنف: ${product.name}`, 'inventory', 'ADMIN', 'المدير');
    syncCloud('deleteProduct', id);
    return true;
  }

  function decrementProductStock(id, qty = 1) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (product && typeof product.stock === 'number') {
      product.stock = Math.max(0, product.stock - qty);
      product.lastUpdated = new Date().toISOString();
      setRaw(KEYS.PRODUCTS, products);
      syncCloud('saveProduct', product);
    }
  }

  function updateProductStock(id, newStock) {
    const products = getProducts();
    const product = products.find(p => p.id === id);
    if (product) {
      product.stock = Number(newStock) || 0;
      product.lastUpdated = new Date().toISOString();
      setRaw(KEYS.PRODUCTS, products);
      syncCloud('saveProduct', product);
    }
  }

  // --- Wallets & Terminal Balances ---
  function getWallets() {
    return getRaw(KEYS.WALLETS, SEED_WALLETS);
  }

  function saveWallets(wallets) {
    setRaw(KEYS.WALLETS, wallets);
    syncCloud('saveWallets', wallets);
  }

  function adjustWalletBalance(key, delta) {
    const wallets = getWallets();
    if (wallets[key]) {
      wallets[key].balance = Math.max(0, (wallets[key].balance || 0) + delta);
      saveWallets(wallets);
    }
  }

  // --- Archives & Logs ---
  function getDailyArchives() {
    return getRaw(KEYS.DAILY_ARCHIVES, []);
  }

  function getMonthlyArchives() {
    return getRaw(KEYS.MONTHLY_ARCHIVES, []);
  }

  function getAuditLogs() {
    return getRaw(KEYS.AUDIT_LOGS, []);
  }

  function addAuditLog(action, details, category = 'general', userId = 'USR-01', username = 'system') {
    const logs = getAuditLogs();
    const newLog = {
      id: 'LOG-' + Date.now(),
      timestamp: new Date().toISOString(),
      userId,
      username,
      action,
      details,
      category,
      status: 'success',
      ip: '127.0.0.1 (Web POS)'
    };
    logs.unshift(newLog);
    // Keep last 300 logs
    if (logs.length > 300) logs.pop();
    setRaw(KEYS.AUDIT_LOGS, logs);
    syncCloud('saveAuditLog', newLog);
    return newLog;
  }

  // --- Settings ---
  function getSettings() {
    return getRaw(KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  function saveSettings(settings) {
    const current = getSettings();
    const merged = { ...current, ...settings };
    setRaw(KEYS.SETTINGS, merged);
    syncCloud('saveSettings', merged);
    return merged;
  }

  // --- Held Invoices (تعليق واستئناف الفواتير) ---
  function getHeldCarts() {
    return getRaw(KEYS.HELD_CARTS, []);
  }

  function saveHeldCart(cartData) {
    const carts = getHeldCarts();
    const heldItem = {
      id: 'HELD-' + Date.now(),
      heldAt: new Date().toISOString(),
      ...cartData
    };
    carts.unshift(heldItem);
    setRaw(KEYS.HELD_CARTS, carts);
    return heldItem;
  }

  function removeHeldCart(id) {
    let carts = getHeldCarts();
    carts = carts.filter(c => c.id !== id);
    setRaw(KEYS.HELD_CARTS, carts);
  }

  // --- Backup, Restore, Full Clean Reset ---
  function exportBackup() {
    const backup = {
      version: '4.2',
      exportedAt: new Date().toISOString(),
      settings: getSettings(),
      users: getUsers(),
      products: getProducts(),
      wallets: getWallets(),
      transactions: getTransactions(),
      dailyArchives: getDailyArchives(),
      monthlyArchives: getMonthlyArchives(),
      auditLogs: getAuditLogs()
    };
    return JSON.stringify(backup, null, 2);
  }

  function importBackup(jsonString) {
    try {
      const data = JSON.parse(jsonString);
      if (data.users) setRaw(KEYS.USERS, data.users);
      if (data.products) setRaw(KEYS.PRODUCTS, data.products);
      if (data.wallets) setRaw(KEYS.WALLETS, data.wallets);
      if (data.transactions) setRaw(KEYS.TRANSACTIONS, data.transactions);
      if (data.settings) setRaw(KEYS.SETTINGS, data.settings);
      if (data.dailyArchives) setRaw(KEYS.DAILY_ARCHIVES, data.dailyArchives);
      if (data.monthlyArchives) setRaw(KEYS.MONTHLY_ARCHIVES, data.monthlyArchives);
      if (data.auditLogs) setRaw(KEYS.AUDIT_LOGS, data.auditLogs);
      return true;
    } catch (e) {
      console.error('Import Backup Failed:', e);
      return false;
    }
  }

  // Full clean reset (keeps admin user and seed products if requested)
  function fullSystemReset(keepAdminAndProducts = true) {
    const adminUser = getUsers().find(u => u.username === 'admin') || SEED_USERS[0];
    localStorage.clear();
    setRaw(KEYS.SETTINGS, DEFAULT_SETTINGS);
    setRaw(KEYS.USERS, [adminUser, SEED_USERS[1]]);
    setRaw(KEYS.PRODUCTS, SEED_PRODUCTS);
    setRaw(KEYS.WALLETS, SEED_WALLETS);
    setRaw(KEYS.TRANSACTIONS, []); // ZERO SALES
    setRaw(KEYS.DAILY_ARCHIVES, []);
    setRaw(KEYS.MONTHLY_ARCHIVES, []);
    setRaw(KEYS.AUDIT_LOGS, [
      {
        id: 'LOG-RESET',
        timestamp: new Date().toISOString(),
        userId: adminUser.id,
        username: adminUser.username,
        action: 'تصفير شامل وضبط المصنع للنظام',
        details: 'تم تصفير جميع العمليات والمبيعات والأرشيف مع الحفاظ على حساب الأدمن',
        category: 'system',
        status: 'success',
        ip: '127.0.0.1'
      }
    ]);
    return true;
  }

  return {
    init,
    checkAutoReset,
    getTransactions,
    getTransactionsForDate,
    getTodayTransactions,
    getCurrentMonthTransactions,
    generateInvoiceNumber,
    addTransaction,
    manualResetShift,
    getDashboardStats,
    getCashierPersonalStats,
    getUsers,
    getUser,
    getUserByUsername,
    saveUser,
    deleteUser,
    toggleUserStatus,
    getProducts,
    getProduct,
    getProductByBarcode,
    saveProduct,
    deleteProduct,
    updateProductStock,
    getWallets,
    saveWallets,
    adjustWalletBalance,
    getDailyArchives,
    getMonthlyArchives,
    getAuditLogs,
    addAuditLog,
    getSettings,
    saveSettings,
    getHeldCarts,
    saveHeldCart,
    removeHeldCart,
    exportBackup,
    importBackup,
    fullSystemReset
  };
})();

// Auto initialize on script load and export
if (typeof window !== 'undefined') {
  window.Store = Store;
  Store.init();
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
