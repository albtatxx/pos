/**
 * Main Application Coordinator & Router
 * Hash-based Single Page Architecture, Audio Synthesizer,
 * Toast Notifications, Hotkeys & Global View Navigation
 */

const App = (function () {
  let audioCtx = null;

  function init() {
    // Check authentication first
    const currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      navigateTo('auth');
    } else {
      setupAppChrome(currentUser);
      // Listen to hash changes
      window.addEventListener('hashchange', handleRoute);
      handleRoute();
    }

    bindGlobalHotkeys();
    setupDarkMode();
    bindAuthForms();
  }

  // --- Audio Feedback (Web Audio API Synthesizer) ---
  function playSound(type = 'beep') {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      if (type === 'beep') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'cash') {
        // High register chime
        const freqs = [523.25, 659.25, 783.99, 1046.50];
        freqs.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          gain.gain.setValueAtTime(0.18, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.25);
        });
      } else if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(160, now + 0.1);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      }
    } catch (e) {
      // Audio might be blocked by browser policy prior to user interaction
    }
  }

  // --- Toast Notification System ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    else if (type === 'error') icon = 'error';
    else if (type === 'warning') icon = 'warning';

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px]">${icon}</span>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  // --- Routing & Navigation Engine ---
  function handleRoute() {
    const user = Auth.getCurrentUser();
    if (!user) {
      showAuthScreen();
      return;
    }

    const hash = window.location.hash.replace('#', '') || 'pos-cashier';

    if (hash === 'auth') {
      showAuthScreen();
      return;
    }

    // RBAC Route Guard
    if (!Auth.canAccess(hash)) {
      showToast('عفواً، هذه الصفحة مخصصة لمدير النظام فقط', 'warning');
      navigateTo('pos-cashier');
      return;
    }

    navigateTo(hash);
  }

  function navigateTo(path) {
    const user = Auth.getCurrentUser();

    if (path === 'auth' || !user) {
      showAuthScreen();
      return;
    }

    hideAuthScreen();

    // Hide all view sections
    const views = document.querySelectorAll('.view-section');
    views.forEach(v => v.classList.add('hidden'));

    // Show target view
    const target = document.getElementById(`view-${path}`);
    if (target) {
      target.classList.remove('hidden');
    } else {
      // Fallback to POS
      const fallback = document.getElementById('view-pos-cashier');
      if (fallback) fallback.classList.remove('hidden');
      path = 'pos-cashier';
    }

    // Update active nav links in sidebar
    const navLinks = document.querySelectorAll('aside nav a');
    navLinks.forEach(link => {
      const linkPath = link.getAttribute('data-path');
      if (linkPath === path) {
        link.classList.add('bg-primary-container', 'text-on-primary-container', 'font-bold', 'shadow-sm');
        link.classList.remove('text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-on-surface');
        link.setAttribute('aria-current', 'page');
      } else {
        link.classList.remove('bg-primary-container', 'text-on-primary-container', 'font-bold', 'shadow-sm');
        link.classList.add('text-on-surface-variant', 'hover:bg-surface-container', 'hover:text-on-surface');
        link.removeAttribute('aria-current');
      }
    });

    // Update URL hash without re-triggering reload
    if (window.location.hash !== `#${path}`) {
      window.location.hash = `#${path}`;
    }

    // Trigger view-specific refreshes
    if (path === 'pos-cashier') {
      POS.renderCashierShiftSummary();
      POS.renderProducts();
    } else if (path === 'admin-analytics') {
      Analytics.refresh();
    } else if (path === 'inventory-services') {
      Inventory.renderWalletBalances();
      Inventory.renderProductsTable();
    } else if (path === 'employee-management') {
      Employees.renderEmployeesTable();
      Employees.renderAuditLogsTable();
    } else if (path === 'sales-archive') {
      Archive.renderArchiveInvoices();
      Archive.renderHistoricalDailyArchives();
    } else if (path === 'system-settings') {
      Settings.loadSettingsIntoForm();
    }
  }

  function setupAppChrome(user) {
    const authWrapper = document.getElementById('auth-view-wrapper');
    const mainChrome = document.getElementById('main-app-chrome');

    if (authWrapper) authWrapper.classList.add('hidden');
    if (mainChrome) mainChrome.classList.remove('hidden');

    // Update user info in header
    const profileName = document.getElementById('header-user-name');
    const profileRole = document.getElementById('header-user-role');
    const profileAvatar = document.getElementById('header-user-avatar');

    if (profileName) profileName.textContent = user.name;
    if (profileRole) profileRole.textContent = user.role === 'admin' ? 'مدير النظام' : user.shift || 'كاشير مبيعات';
    if (profileAvatar) profileAvatar.textContent = user.name.substring(0, 1);

    // Apply RBAC to Sidebar navigation
    const adminNavLinks = document.querySelectorAll('aside nav a[data-admin-only="true"]');
    if (user.role === 'cashier') {
      adminNavLinks.forEach(link => {
        link.classList.add('opacity-40', 'pointer-events-none');
        // Add lock badge if not already added
        if (!link.querySelector('.lock-badge')) {
          const lock = document.createElement('span');
          lock.className = 'lock-badge mr-auto text-[10px] bg-surface-container px-1.5 py-0.5 rounded font-bold text-on-surface-variant';
          lock.textContent = 'خاص بالمدير';
          link.appendChild(lock);
        }
      });
    } else {
      adminNavLinks.forEach(link => {
        link.classList.remove('opacity-40', 'pointer-events-none');
        const lock = link.querySelector('.lock-badge');
        if (lock) lock.remove();
      });
    }

    // Role switcher pills in header
    const adminPill = document.getElementById('header-role-admin-pill');
    const cashierPill = document.getElementById('header-role-cashier-pill');

    if (adminPill && cashierPill) {
      if (user.role === 'admin') {
        adminPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-primary text-white shadow-sm';
        cashierPill.className = 'px-3 py-1 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer';
      } else {
        cashierPill.className = 'px-3 py-1 rounded-full text-xs font-bold bg-secondary text-white shadow-sm';
        adminPill.className = 'px-3 py-1 rounded-full text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer';
      }
    }

    // Initialize all modules
    POS.init();
    Analytics.init();
    Inventory.init();
    Employees.init();
    Archive.init();
    Settings.init();
  }

  function showAuthScreen() {
    const authWrapper = document.getElementById('auth-view-wrapper');
    const mainChrome = document.getElementById('main-app-chrome');

    if (authWrapper) authWrapper.classList.remove('hidden');
    if (mainChrome) mainChrome.classList.add('hidden');

    // Update public registration policy in auth screen
    const settings = Store.getSettings();
    const regTabBtn = document.getElementById('auth-tab-register-btn');
    const regClosedAlert = document.getElementById('auth-reg-closed-alert');
    const regForm = document.getElementById('auth-register-form');

    if (!settings.allowPublicRegistration) {
      if (regClosedAlert) regClosedAlert.classList.remove('hidden');
      if (regForm) regForm.classList.add('hidden');
    } else {
      if (regClosedAlert) regClosedAlert.classList.add('hidden');
      if (regForm) regForm.classList.remove('hidden');
    }
  }

  function hideAuthScreen() {
    const authWrapper = document.getElementById('auth-view-wrapper');
    const mainChrome = document.getElementById('main-app-chrome');

    if (authWrapper) authWrapper.classList.add('hidden');
    if (mainChrome) mainChrome.classList.remove('hidden');
  }

  function bindAuthForms() {
    // Tab switching in Auth
    const loginTabBtn = document.getElementById('auth-tab-login-btn');
    const registerTabBtn = document.getElementById('auth-tab-register-btn');
    const loginSection = document.getElementById('auth-login-section');
    const registerSection = document.getElementById('auth-register-section');

    if (loginTabBtn && registerTabBtn) {
      loginTabBtn.addEventListener('click', () => {
        loginTabBtn.classList.add('bg-primary', 'text-white', 'shadow-sm');
        loginTabBtn.classList.remove('text-on-surface-variant');
        registerTabBtn.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        registerTabBtn.classList.add('text-on-surface-variant');

        if (loginSection) loginSection.classList.remove('hidden');
        if (registerSection) registerSection.classList.add('hidden');
      });

      registerTabBtn.addEventListener('click', () => {
        registerTabBtn.classList.add('bg-primary', 'text-white', 'shadow-sm');
        registerTabBtn.classList.remove('text-on-surface-variant');
        loginTabBtn.classList.remove('bg-primary', 'text-white', 'shadow-sm');
        loginTabBtn.classList.add('text-on-surface-variant');

        if (registerSection) registerSection.classList.remove('hidden');
        if (loginSection) loginSection.classList.add('hidden');
      });
    }

    // Login Form Submit
    const loginForm = document.getElementById('auth-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('auth-login-username').value;
        const password = document.getElementById('auth-login-password').value;

        const res = Auth.login(username, password);
        if (res.success) {
          showToast(`أهلاً بك مجدداً، ${res.user.name}!`, 'success');
          setupAppChrome(res.user);
          navigateTo(res.user.role === 'admin' ? 'admin-analytics' : 'pos-cashier');
        } else {
          showToast(res.message, 'error');
        }
      });
    }

    // Register Form Submit
    const registerForm = document.getElementById('auth-register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('auth-reg-name').value;
        const username = document.getElementById('auth-reg-username').value;
        const password = document.getElementById('auth-reg-password').value;
        const shift = document.getElementById('auth-reg-shift').value;

        const res = Auth.register({ name, username, password, shift });
        if (res.success) {
          showToast(`تم إنشاء حسابك بنجاح! مرحباً ${res.user.name}`, 'success');
          setupAppChrome(res.user);
          navigateTo('pos-cashier');
        } else {
          showToast(res.message, 'error');
        }
      });
    }

    // Quick demo buttons
    const demoAdminBtn = document.getElementById('auth-demo-admin-btn');
    const demoCashierBtn = document.getElementById('auth-demo-cashier-btn');

    if (demoAdminBtn) {
      demoAdminBtn.addEventListener('click', () => {
        document.getElementById('auth-login-username').value = 'admin';
        document.getElementById('auth-login-password').value = 'admin123';
        const res = Auth.login('admin', 'admin123');
        if (res.success) {
          setupAppChrome(res.user);
          navigateTo('admin-analytics');
        }
      });
    }

    if (demoCashierBtn) {
      demoCashierBtn.addEventListener('click', () => {
        document.getElementById('auth-login-username').value = 'cashier1';
        document.getElementById('auth-login-password').value = 'cashier123';
        const res = Auth.login('cashier1', 'cashier123');
        if (res.success) {
          setupAppChrome(res.user);
          navigateTo('pos-cashier');
        }
      });
    }
  }

  // --- Keyboard Shortcuts ---
  function bindGlobalHotkeys() {
    window.addEventListener('keydown', (e) => {
      // F2: Focus barcode / search input
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      // F9: Instant Checkout
      else if (e.key === 'F9') {
        e.preventDefault();
        const hash = window.location.hash.replace('#', '');
        if (hash === 'pos-cashier' || hash === '') {
          POS.checkout();
        }
      }
      // Escape: Close any open modal
      else if (e.key === 'Escape') {
        const modals = document.querySelectorAll('.modal-wrapper:not(.hidden)');
        modals.forEach(m => m.classList.add('hidden'));
      }
    });
  }

  // --- Dark Mode ---
  function setupDarkMode() {
    const settings = Store.getSettings();
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    }

    const toggleBtn = document.getElementById('theme-toggle-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        settings.darkMode = isDark;
        Store.saveSettings(settings);
      });
    }
  }

  return {
    init,
    navigateTo,
    playSound,
    showToast
  };
})();

if (typeof window !== 'undefined') {
  window.App = App;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = App;
}

// Boot on window DOM ready
window.addEventListener('DOMContentLoaded', () => {
  App.init();
});
