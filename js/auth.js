/**
 * Authentication & Role-Based Access Control (RBAC) Module
 * Handles Login, Registration, Session, User Attribution & Route Guards
 */

const Auth = (function () {
  const SESSION_KEY = 'telecom_pos_current_user';

  function getCurrentUser() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }

  function login(username, password) {
    const user = Store.getUserByUsername(username);
    if (!user) {
      return { success: false, message: 'اسم المستخدم غير موجود في النظام' };
    }

    if (user.status !== 'active') {
      return { success: false, message: 'هذا الحساب موقوف حالياً من قبل إدارة السنترال' };
    }

    if (user.password !== password) {
      return { success: false, message: 'كلمة المرور غير صحيحة، يرجى المحاولة ثانية' };
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    Store.saveUser(user);
    setCurrentUser(user);

    Store.addAuditLog(
      'تسجيل دخول ناجح',
      `قام المستخدم ${user.name} (${user.role}) بتسجيل الدخول للنظام`,
      'auth',
      user.id,
      user.username
    );

    return { success: true, user };
  }

  function register(data) {
    const settings = Store.getSettings();
    if (!settings.allowPublicRegistration) {
      return {
        success: false,
        message: 'إنشاء الحسابات العامة مغلق حالياً. يرجى مراجعة مدير النظام لإنشاء حساب لك.'
      };
    }

    if (!data.name || !data.username || !data.password) {
      return { success: false, message: 'يرجى ملء جميع الحقول المطلوبة' };
    }

    const existing = Store.getUserByUsername(data.username);
    if (existing) {
      return { success: false, message: 'اسم المستخدم محجوز بالفعل، اختر اسماً آخر' };
    }

    // Role is strictly Cashier for public registrations
    const newUser = {
      name: data.name.trim(),
      username: data.username.trim().toLowerCase(),
      password: data.password,
      role: 'cashier',
      status: 'active',
      shift: data.shift || 'وردية عادية',
      createdAt: new Date().toISOString()
    };

    const saved = Store.saveUser(newUser);
    setCurrentUser(saved);

    Store.addAuditLog(
      'تسجيل حساب ذاتي جديد',
      `تم إنشاء حساب كاشير جديد ذاتياً باسم: ${saved.name}`,
      'auth',
      saved.id,
      saved.username
    );

    return { success: true, user: saved };
  }

  function logout() {
    const user = getCurrentUser();
    if (user) {
      Store.addAuditLog(
        'تسجيل خروج',
        `قام المستخدم ${user.name} بتسجيل الخروج من النظام`,
        'auth',
        user.id,
        user.username
      );
    }
    setCurrentUser(null);
    window.location.hash = '#auth';
    window.location.reload();
  }

  function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
  }

  function isCashier() {
    const user = getCurrentUser();
    return user && user.role === 'cashier';
  }

  function canAccess(path) {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    // Cashier restricted only to POS interface
    if (user.role === 'cashier') {
      return path === 'pos-cashier';
    }
    return false;
  }

  // Quick switch role for testing convenience
  function switchRole(targetRole) {
    const users = Store.getUsers();
    const targetUser = users.find(u => u.role === targetRole && u.status === 'active');
    if (targetUser) {
      setCurrentUser(targetUser);
      Store.addAuditLog(
        'تبديل سريع للمستخدم',
        `تم التبديل إلى المستخدم ${targetUser.name} (${targetUser.role})`,
        'auth',
        targetUser.id,
        targetUser.username
      );
      window.location.reload();
    }
  }

  return {
    getCurrentUser,
    setCurrentUser,
    login,
    register,
    logout,
    isAdmin,
    isCashier,
    canAccess,
    switchRole
  };
})();

if (typeof window !== 'undefined') {
  window.Auth = Auth;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
