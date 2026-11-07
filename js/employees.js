/**
 * Employee & User Management (RBAC) & Audit Log Engine
 * Role Permissions, Account Security, Shift Assignments & Operation Logs
 */

const Employees = (function () {
  let auditFilterCategory = 'all';

  function init() {
    renderEmployeesTable();
    renderAuditLogsTable();
    bindEvents();
  }

  function bindEvents() {
    const auditCatSelect = document.getElementById('audit-category-select');
    if (auditCatSelect) {
      auditCatSelect.addEventListener('change', (e) => {
        auditFilterCategory = e.target.value;
        renderAuditLogsTable();
      });
    }

    const auditSearchInput = document.getElementById('audit-search-input');
    if (auditSearchInput) {
      auditSearchInput.addEventListener('input', () => {
        renderAuditLogsTable();
      });
    }
  }

  // --- Employees Table Rendering ---
  function renderEmployeesTable() {
    const tableBody = document.getElementById('employees-table-body');
    if (!tableBody) return;

    const users = Store.getUsers();
    const transactions = Store.getTransactions();

    tableBody.innerHTML = users.map(user => {
      const isOnline = user.status === 'active';
      const userTx = transactions.filter(t => t.userId === user.id || t.username === user.username);
      const userSalesTotal = userTx.reduce((sum, t) => sum + (Number(t.total) || 0), 0);
      const isSuperAdmin = user.username === 'admin';

      return `
        <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full ${user.role === 'admin' ? 'bg-primary-container text-white' : 'bg-secondary text-white'} flex items-center justify-center font-bold text-sm shrink-0">
                ${user.name.substring(0, 1)}
              </div>
              <div class="flex flex-col">
                <span class="font-bold text-on-surface text-sm">${user.name}</span>
                <span class="text-[11px] text-on-surface-variant font-mono">@${user.username} • كود: ${user.id}</span>
              </div>
            </div>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}">
              ${user.role === 'admin' ? 'مدير النظام (Admin)' : 'كاشير مبيعات (Cashier)'}
            </span>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant">
              ${user.shift || 'وردية عامة'}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-mono">
            <span class="font-bold text-on-surface text-xs block">${userTx.length} فاتورة</span>
            <span class="text-[11px] text-secondary font-bold">${userSalesTotal.toFixed(2)} ج.م</span>
          </td>
          <td class="py-3 px-4 text-center">
            <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${isOnline ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-on-surface-variant'}">
              <span class="w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-secondary' : 'bg-outline'}"></span>
              <span>${isOnline ? 'نشط' : 'معلق'}</span>
            </span>
          </td>
          <td class="py-3 px-4 text-center text-xs text-on-surface-variant font-mono">
            ${user.lastLogin ? new Date(user.lastLogin).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'لم يدخل بعد'}
          </td>
          <td class="py-3 px-4 text-center">
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="Employees.openChangePasswordModal('${user.id}')" class="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors" title="تغيير كلمة المرور">
                <span class="material-symbols-outlined text-[18px]">key</span>
              </button>
              ${!isSuperAdmin ? `
                <button onclick="Employees.toggleUserStatus('${user.id}')" class="w-7 h-7 rounded-lg hover:bg-surface-container flex items-center justify-center ${user.status === 'active' ? 'text-amber-600' : 'text-secondary'} transition-colors" title="${user.status === 'active' ? 'تعليق الحساب' : 'تفعيل الحساب'}">
                  <span class="material-symbols-outlined text-[18px]">${user.status === 'active' ? 'block' : 'check_circle'}</span>
                </button>
                <button onclick="Employees.deleteUser('${user.id}')" class="w-7 h-7 rounded-lg hover:bg-error-container/20 flex items-center justify-center text-error transition-colors" title="حذف">
                  <span class="material-symbols-outlined text-[18px]">delete</span>
                </button>
              ` : `
                <span class="text-[11px] text-on-surface-variant font-bold px-2 py-0.5 bg-surface-container rounded">أساسي</span>
              `}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Audit Logs Table Rendering ---
  function renderAuditLogsTable() {
    const tableBody = document.getElementById('audit-logs-table-body');
    if (!tableBody) return;

    let logs = Store.getAuditLogs();

    // Category filter
    if (auditFilterCategory !== 'all') {
      logs = logs.filter(l => l.category === auditFilterCategory);
    }

    // Search filter
    const searchInput = document.getElementById('audit-search-input');
    if (searchInput && searchInput.value.trim()) {
      const q = searchInput.value.toLowerCase().trim();
      logs = logs.filter(l =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.username && l.username.toLowerCase().includes(q))
      );
    }

    if (logs.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="py-8 text-center text-on-surface-variant">
            <span class="material-symbols-outlined text-4xl text-outline-variant mb-1">security</span>
            <p class="font-bold">لا توجد سجلات تدقيق مسجلة</p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = logs.slice(0, 50).map(log => {
      let catBadge = '';
      if (log.category === 'auth') catBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600">أمان وحسابات</span>';
      else if (log.category === 'pos_sale') catBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/10 text-secondary">مبيعات كاشير</span>';
      else if (log.category === 'inventory') catBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600">مخزن وأصناف</span>';
      else if (log.category === 'manual_reset') catBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-600">تصفير وتقفيل</span>';
      else catBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">نظام</span>';

      return `
        <tr class="border-b border-surface-container hover:bg-surface-container-low/50 transition-colors text-xs">
          <td class="py-3 px-4 font-mono text-on-surface-variant whitespace-nowrap">
            ${new Date(log.timestamp).toLocaleString('ar-EG')}
          </td>
          <td class="py-3 px-4 font-bold text-on-surface">
            ${log.username || 'System'}
          </td>
          <td class="py-3 px-4 text-center">
            ${catBadge}
          </td>
          <td class="py-3 px-4 text-on-surface">
            <span class="font-bold block">${log.action}</span>
            <span class="text-on-surface-variant text-[11px]">${log.details || ''}</span>
          </td>
          <td class="py-3 px-4 text-center font-mono text-on-surface-variant">
            ${log.ip || '127.0.0.1'}
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Add Employee Modal ---
  function openCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (!modal) return;

    document.getElementById('createUserForm-name').value = '';
    document.getElementById('createUserForm-username').value = '';
    document.getElementById('createUserForm-password').value = '';
    document.getElementById('createUserForm-role').value = 'cashier';
    document.getElementById('createUserForm-shift').value = 'وردية الصباح';

    modal.classList.remove('hidden');
    document.getElementById('createUserForm-name').focus();
  }

  function closeCreateUserModal() {
    const modal = document.getElementById('createUserModal');
    if (modal) modal.classList.add('hidden');
  }

  function saveNewUser() {
    const name = document.getElementById('createUserForm-name').value.trim();
    const username = document.getElementById('createUserForm-username').value.trim().toLowerCase();
    const password = document.getElementById('createUserForm-password').value;
    const role = document.getElementById('createUserForm-role').value;
    const shift = document.getElementById('createUserForm-shift').value;

    if (!name || !username || !password) {
      App.showToast('يرجى ملء جميع الحقول المطلوبة', 'warning');
      return;
    }

    const existing = Store.getUserByUsername(username);
    if (existing) {
      App.showToast('اسم المستخدم محجوز بالفعل، اختر اسماً آخر', 'error');
      return;
    }

    Store.saveUser({
      name,
      username,
      password,
      role,
      shift,
      status: 'active'
    });

    closeCreateUserModal();
    renderEmployeesTable();
    Analytics.refresh();
    App.showToast(`تم إنشاء حساب الموظف: ${name} بنجاح`, 'success');
  }

  // --- Change Password Modal ---
  function openChangePasswordModal(userId) {
    const user = Store.getUser(userId);
    if (!user) return;

    const newPass = prompt(`أدخل كلمة المرور الجديدة للمستخدم (${user.name}):`);
    if (newPass && newPass.trim().length >= 4) {
      user.password = newPass.trim();
      Store.saveUser(user);
      App.showToast(`تم تغيير كلمة مرور (${user.name}) بنجاح`, 'success');
    } else if (newPass !== null) {
      App.showToast('كلمة المرور يجب ألا تقل عن 4 أحرف', 'warning');
    }
  }

  function toggleUserStatus(id) {
    const updated = Store.toggleUserStatus(id);
    if (updated) {
      renderEmployeesTable();
      Analytics.refresh();
      App.showToast(`تم تغيير حالة حساب (${updated.name}) إلى ${updated.status === 'active' ? 'نشط' : 'معلق'}`, 'info');
    }
  }

  function deleteUser(id) {
    try {
      const user = Store.getUser(id);
      if (!user) return;
      if (confirm(`هل أنت متأكد من حذف حساب (${user.name})؟ لا يمكن التراجع.`)) {
        Store.deleteUser(id);
        renderEmployeesTable();
        Analytics.refresh();
        App.showToast(`تم حذف حساب (${user.name})`, 'info');
      }
    } catch (e) {
      App.showToast(e.message, 'error');
    }
  }

  return {
    init,
    renderEmployeesTable,
    renderAuditLogsTable,
    openCreateUserModal,
    closeCreateUserModal,
    saveNewUser,
    openChangePasswordModal,
    toggleUserStatus,
    deleteUser
  };
})();
