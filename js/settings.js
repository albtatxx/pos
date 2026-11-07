/**
 * System & Store Settings Engine
 * Store Profile, Receipt Customization, Registration Policies, Auto-Reset Hours,
 * JSON Backup / Restore and System Factory Reset
 */

const Settings = (function () {
  function init() {
    loadSettingsIntoForm();
    bindEvents();
  }

  function bindEvents() {
    const saveBtn = document.getElementById('save-settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', saveSettingsFromForm);
    }

    const backupExportBtn = document.getElementById('backup-export-btn');
    if (backupExportBtn) {
      backupExportBtn.addEventListener('click', downloadBackup);
    }

    const backupImportInput = document.getElementById('backup-import-file');
    if (backupImportInput) {
      backupImportInput.addEventListener('change', handleBackupUpload);
    }

    const fullResetBtn = document.getElementById('full-system-reset-btn');
    if (fullResetBtn) {
      fullResetBtn.addEventListener('click', handleFullSystemReset);
    }
  }

  function loadSettingsIntoForm() {
    const s = Store.getSettings();

    const storeNameInput = document.getElementById('setting-store-name');
    const storeSubInput = document.getElementById('setting-store-subtitle');
    const storePhoneInput = document.getElementById('setting-store-phone');
    const storeAddressInput = document.getElementById('setting-store-address');
    const currencyInput = document.getElementById('setting-currency');
    const receiptHeaderInput = document.getElementById('setting-receipt-header');
    const receiptFooterInput = document.getElementById('setting-receipt-footer');
    const allowRegToggle = document.getElementById('setting-allow-registration');
    const resetHourSelect = document.getElementById('setting-daily-reset-hour');
    const commRateInput = document.getElementById('setting-commission-rate');
    const minFeeInput = document.getElementById('setting-min-fee');

    if (storeNameInput) storeNameInput.value = s.storeName || '';
    if (storeSubInput) storeSubInput.value = s.storeSubtitle || '';
    if (storePhoneInput) storePhoneInput.value = s.storePhone || '';
    if (storeAddressInput) storeAddressInput.value = s.storeAddress || '';
    if (currencyInput) currencyInput.value = s.currency || 'ج.م';
    if (receiptHeaderInput) receiptHeaderInput.value = s.receiptHeader || '';
    if (receiptFooterInput) receiptFooterInput.value = s.receiptFooter || '';
    if (allowRegToggle) allowRegToggle.checked = Boolean(s.allowPublicRegistration);
    if (resetHourSelect) resetHourSelect.value = s.dailyResetHour || '00:00';
    if (commRateInput) commRateInput.value = s.defaultCommissionRate || 1.5;
    if (minFeeInput) minFeeInput.value = s.minCommissionFee || 5.0;

    // Update branding in header
    updateHeaderBranding(s);
  }

  function updateHeaderBranding(s) {
    const headerTitle = document.getElementById('header-store-name');
    const headerSub = document.getElementById('header-store-sub');
    if (headerTitle) headerTitle.textContent = s.storeName || 'سنترال وموبايليات الأمانة';
    if (headerSub) headerSub.textContent = s.storeSubtitle || 'نظام البيع السحابي المتزامن • فرع التحرير';
  }

  function saveSettingsFromForm() {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      App.showToast('صلاحية تعديل الإعدادات مخصصة لمدير النظام فقط', 'error');
      return;
    }

    const updated = {
      storeName: document.getElementById('setting-store-name').value.trim(),
      storeSubtitle: document.getElementById('setting-store-subtitle').value.trim(),
      storePhone: document.getElementById('setting-store-phone').value.trim(),
      storeAddress: document.getElementById('setting-store-address').value.trim(),
      currency: document.getElementById('setting-currency').value.trim() || 'ج.م',
      receiptHeader: document.getElementById('setting-receipt-header').value.trim(),
      receiptFooter: document.getElementById('setting-receipt-footer').value.trim(),
      allowPublicRegistration: document.getElementById('setting-allow-registration').checked,
      dailyResetHour: document.getElementById('setting-daily-reset-hour').value,
      defaultCommissionRate: parseFloat(document.getElementById('setting-commission-rate').value) || 1.5,
      minCommissionFee: parseFloat(document.getElementById('setting-min-fee').value) || 5.0
    };

    Store.saveSettings(updated);
    updateHeaderBranding(updated);
    Store.addAuditLog('تحديث إعدادات النظام', 'تم حفظ تعديلات الإعدادات والسياسات العامة بنجاح', 'system', user.id, user.username);
    App.showToast('تم حفظ جميع الإعدادات وتطبيق التغييرات بنجاح', 'success');

    // Refresh views that depend on settings
    POS.renderProducts();
    Analytics.refresh();
  }

  // --- Backup & Restore ---
  function downloadBackup() {
    const jsonStr = Store.exportBackup();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `نسخة_احتياطية_سنترال_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    App.showToast('تم تنزيل النسخة الاحتياطية بنجاح', 'success');
  }

  function handleBackupUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const ok = Store.importBackup(event.target.result);
      if (ok) {
        App.showToast('تمت استعادة النسخة الاحتياطية بنجاح! جاري التحديث...', 'success');
        setTimeout(() => window.location.reload(), 1200);
      } else {
        App.showToast('فشل استعادة النسخة: صيغة الملف غير صحيحة', 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- Full System Reset ---
  function handleFullSystemReset() {
    const user = Auth.getCurrentUser();
    if (!user || user.role !== 'admin') {
      App.showToast('صلاحية التصفير الشامل مقتصرة على الأدمن فقط', 'error');
      return;
    }

    const confirmCode = prompt('تحذير شديد الأهمية: هذا الإجراء سيقوم بتصفير جميع المبيعات والفواتير والأرشيف وإعادة ضبط المصنع للنظام!\n\nللتأكيد، اكتب كلمة "تأكيد" في المربع أدناه:');
    if (confirmCode === 'تأكيد') {
      Store.fullSystemReset(true);
      App.showToast('تم تصفير النظام وإعادة ضبط المصنع بنجاح!', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } else if (confirmCode !== null) {
      App.showToast('تم إلغاء عملية التصفير', 'info');
    }
  }

  return {
    init,
    loadSettingsIntoForm,
    saveSettingsFromForm,
    downloadBackup,
    handleFullSystemReset
  };
})();

if (typeof window !== 'undefined') {
  window.Settings = Settings;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Settings;
}
