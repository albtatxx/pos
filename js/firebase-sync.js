/**
 * Firebase Real-time Cloud Synchronization Engine
 * Connects POS, Inventory, Users, Transactions & Settings to Firebase Firestore
 * Powered by Firebase JS SDK v13.2.0
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getAnalytics, isSupported as isAnalyticsSupported } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-analytics.js";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";

// Exact Firebase project configuration provided
const firebaseConfig = {
  apiKey: "AIzaSyBgzEWzOeLPhgBPqqN1jE4kzgFXwKlmzuA",
  authDomain: "poss-9b594.firebaseapp.com",
  projectId: "poss-9b594",
  storageBucket: "poss-9b594.firebasestorage.app",
  messagingSenderId: "406563935757",
  appId: "1:406563935757:web:4309f803bf5236431de744",
  measurementId: "G-RE8LV3RVTT"
};

// State variables
let app = null;
let analytics = null;
let db = null;
let isConnected = false;
let isSyncing = false;
let lastSyncTime = null;
let statusMessage = "جاري الاتصال بفايربيز...";
let isInitialPushDone = false;

// Initialize Firebase
try {
  app = initializeApp(firebaseConfig);
  isAnalyticsSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log("✓ Firebase Analytics initialized successfully");
    }
  }).catch(() => {});

  db = getFirestore(app);
  console.log("✓ Firebase Firestore initialized for project:", firebaseConfig.projectId);
} catch (err) {
  console.warn("Firebase initialization notice:", err);
}

// Update UI Connection Status Badge
function updateUIStatus(status, text) {
  statusMessage = text;
  const headerBadge = document.getElementById("header-firebase-status");
  const settingsBadge = document.getElementById("firebase-settings-status");
  const settingsLastSync = document.getElementById("firebase-settings-last-sync");

  const statusConfig = {
    connected: {
      dotClass: "bg-emerald-500",
      pillClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
      icon: "cloud_done",
      defaultText: "سحابة فايربيز متصلة"
    },
    syncing: {
      dotClass: "bg-blue-500 animate-pulse",
      pillClass: "bg-blue-500/10 text-blue-600 border-blue-500/30",
      icon: "sync",
      defaultText: "جاري المزامنة السحابية..."
    },
    offline: {
      dotClass: "bg-amber-500",
      pillClass: "bg-amber-500/10 text-amber-600 border-amber-500/30",
      icon: "cloud_queue",
      defaultText: "وضع محلي (أوفلاين)"
    },
    error: {
      dotClass: "bg-red-500",
      pillClass: "bg-red-500/10 text-red-600 border-red-500/30",
      icon: "cloud_off",
      defaultText: "فايربيز: بانتظار القواعد"
    }
  };

  const cfg = statusConfig[status] || statusConfig.offline;
  const labelText = text || cfg.defaultText;

  if (headerBadge) {
    headerBadge.className = `flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${cfg.pillClass}`;
    headerBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full ${cfg.dotClass}"></span>
      <span class="material-symbols-outlined text-[15px]">${cfg.icon}</span>
      <span class="hidden sm:inline">${labelText}</span>
    `;
    headerBadge.title = `فايربيز: ${labelText} (مشروع ${firebaseConfig.projectId})`;
  }

  if (settingsBadge) {
    settingsBadge.className = `inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.pillClass}`;
    settingsBadge.innerHTML = `
      <span class="w-2 h-2 rounded-full ${cfg.dotClass}"></span>
      <span>${labelText}</span>
    `;
  }

  if (settingsLastSync && lastSyncTime) {
    settingsLastSync.textContent = lastSyncTime.toLocaleTimeString("ar-EG");
  }
}

// --- Outgoing Sync Handlers (Local -> Cloud) ---
async function saveTransaction(tx) {
  if (!db) return;
  try {
    const docId = tx.id || tx.invoiceNumber;
    await setDoc(doc(db, "transactions", docId), {
      ...tx,
      cloudSyncedAt: new Date().toISOString()
    });
    console.log("✓ Transaction synced to Firebase:", docId);
  } catch (e) {
    console.warn("Failed to sync transaction to Firebase:", e.message);
  }
}

async function saveProduct(prod) {
  if (!db) return;
  try {
    await setDoc(doc(db, "products", prod.id), {
      ...prod,
      cloudSyncedAt: new Date().toISOString()
    });
    console.log("✓ Product synced to Firebase:", prod.id);
  } catch (e) {
    console.warn("Failed to sync product to Firebase:", e.message);
  }
}

async function deleteProduct(prodId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "products", prodId));
    console.log("✓ Product deleted from Firebase:", prodId);
  } catch (e) {
    console.warn("Failed to delete product from Firebase:", e.message);
  }
}

async function saveUser(user) {
  if (!db) return;
  try {
    await setDoc(doc(db, "users", user.id), {
      ...user,
      cloudSyncedAt: new Date().toISOString()
    });
    console.log("✓ User synced to Firebase:", user.id);
  } catch (e) {
    console.warn("Failed to sync user to Firebase:", e.message);
  }
}

async function deleteUser(userId) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, "users", userId));
    console.log("✓ User deleted from Firebase:", userId);
  } catch (e) {
    console.warn("Failed to delete user from Firebase:", e.message);
  }
}

async function saveWallets(wallets) {
  if (!db) return;
  try {
    await setDoc(doc(db, "wallets", "current"), {
      balances: wallets,
      cloudSyncedAt: new Date().toISOString()
    });
    console.log("✓ Wallets synced to Firebase");
  } catch (e) {
    console.warn("Failed to sync wallets to Firebase:", e.message);
  }
}

async function saveSettings(settings) {
  if (!db) return;
  try {
    await setDoc(doc(db, "system_settings", "general"), {
      ...settings,
      cloudSyncedAt: new Date().toISOString()
    });
    console.log("✓ Settings synced to Firebase");
  } catch (e) {
    console.warn("Failed to sync settings to Firebase:", e.message);
  }
}

async function saveAuditLog(log) {
  if (!db) return;
  try {
    await setDoc(doc(db, "audit_logs", log.id), {
      ...log,
      cloudSyncedAt: new Date().toISOString()
    });
  } catch (e) {
    // Audit logs non-critical
  }
}

async function saveDailyArchive(archive) {
  if (!db) return;
  try {
    await setDoc(doc(db, "daily_archives", archive.id), {
      ...archive,
      cloudSyncedAt: new Date().toISOString()
    });
  } catch (e) {
    console.warn("Failed to sync daily archive:", e.message);
  }
}

// --- Bulk Push: Push All Local Data to Firebase ---
async function pushAllDataToFirebase() {
  if (!db) {
    if (window.App && window.App.showToast) {
      window.App.showToast("محرك فايربيز غير مهيأ حالياً", "error");
    }
    return false;
  }

  updateUIStatus("syncing", "جاري رفع البيانات إلى فايربيز...");

  try {
    // 1. Settings
    const settings = Store.getSettings();
    await setDoc(doc(db, "system_settings", "general"), { ...settings, cloudSyncedAt: new Date().toISOString() });

    // 2. Wallets
    const wallets = Store.getWallets();
    await setDoc(doc(db, "wallets", "current"), { balances: wallets, cloudSyncedAt: new Date().toISOString() });

    // 3. Users
    const users = Store.getUsers();
    for (const u of users) {
      await setDoc(doc(db, "users", u.id), { ...u, cloudSyncedAt: new Date().toISOString() });
    }

    // 4. Products
    const products = Store.getProducts();
    for (const p of products) {
      await setDoc(doc(db, "products", p.id), { ...p, cloudSyncedAt: new Date().toISOString() });
    }

    // 5. Transactions (if any exist)
    const transactions = Store.getTransactions();
    for (const tx of transactions) {
      await setDoc(doc(db, "transactions", tx.id || tx.invoiceNumber), { ...tx, cloudSyncedAt: new Date().toISOString() });
    }

    // 6. Archives & Logs
    const archives = Store.getDailyArchives();
    for (const a of archives) {
      await setDoc(doc(db, "daily_archives", a.id), { ...a, cloudSyncedAt: new Date().toISOString() });
    }

    lastSyncTime = new Date();
    isConnected = true;
    updateUIStatus("connected", "تمت المزامنة الكاملة مع فايربيز");

    if (window.App && window.App.showToast) {
      window.App.showToast("تم رفع ومزامنة كافة بيانات السنترال إلى فايربيز بنجاح!", "success");
    }
    return true;
  } catch (err) {
    console.error("Push to Firebase failed:", err);
    isConnected = false;

    let errorHint = "فشل الاتصال بفايربيز";
    if (err.code === "permission-denied") {
      errorHint = "يرجى تفعيل قواعد Firestore في لوحة تحكم فايربيز";
      updateUIStatus("error", "قواعد Firestore غير مفعلة");
    } else {
      updateUIStatus("offline", "وضع محلي (Offline)");
    }

    if (window.App && window.App.showToast) {
      window.App.showToast(errorHint, "warning");
    }
    return false;
  }
}

// --- Bulk Pull: Pull All Cloud Data into Local Store ---
async function pullAllDataFromFirebase() {
  if (!db) return false;
  updateUIStatus("syncing", "جاري سحب البيانات من فايربيز...");

  try {
    // 1. Settings
    const settingsSnap = await getDoc(doc(db, "system_settings", "general"));
    if (settingsSnap.exists()) {
      Store.saveSettings(settingsSnap.data());
    }

    // 2. Wallets
    const walletsSnap = await getDoc(doc(db, "wallets", "current"));
    if (walletsSnap.exists() && walletsSnap.data().balances) {
      Store.saveWallets(walletsSnap.data().balances);
    }

    // 3. Products
    const prodSnap = await getDocs(collection(db, "products"));
    if (!prodSnap.empty) {
      const prods = [];
      prodSnap.forEach(d => {
        const item = d.data();
        if (!item.id) item.id = d.id;
        prods.push(item);
      });
      if (prods.length > 0) {
        localStorage.setItem("telecom_pos_products", JSON.stringify(prods));
      }
    }

    // 4. Users
    const usersSnap = await getDocs(collection(db, "users"));
    if (!usersSnap.empty) {
      const cloudUsers = [];
      usersSnap.forEach(d => cloudUsers.push(d.data()));
      localStorage.setItem("telecom_pos_users", JSON.stringify(cloudUsers));
    }

    // 5. Transactions
    const txSnap = await getDocs(collection(db, "transactions"));
    if (!txSnap.empty) {
      const cloudTx = [];
      txSnap.forEach(d => cloudTx.push(d.data()));
      // Sort newest first
      cloudTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      localStorage.setItem("telecom_pos_transactions", JSON.stringify(cloudTx));
    }

    lastSyncTime = new Date();
    isConnected = true;
    updateUIStatus("connected", "سحابة فايربيز متصلة");

    // Trigger UI updates
    if (window.POS) window.POS.renderProducts();
    if (window.Inventory) {
      window.Inventory.renderWalletBalances();
      window.Inventory.renderProductsTable();
    }
    if (window.Analytics) window.Analytics.refresh();
    if (window.Employees) window.Employees.renderEmployeesTable();

    if (window.App && window.App.showToast) {
      window.App.showToast("تم تحديث البيانات من سحابة فايربيز بنجاح", "success");
    }
    return true;
  } catch (err) {
    console.error("Pull from Firebase failed:", err);
    updateUIStatus("offline", "فشل جلب البيانات السحابية");
    return false;
  }
}

// --- Live Real-Time Listeners (Firestore -> Local Store) ---
function setupRealtimeListeners() {
  if (!db) return;

  try {
    // 1. Listen for Products updates across cashiers
    onSnapshot(collection(db, "products"), (snapshot) => {
      if (snapshot.empty && !isInitialPushDone) {
        // If Firestore products collection is empty on first run, auto-populate with seed products!
        isInitialPushDone = true;
        console.log("Firestore products empty, automatically uploading local catalog...");
        pushAllDataToFirebase();
        return;
      }

      if (!snapshot.empty) {
        const cloudProds = [];
        snapshot.forEach(d => {
          const item = d.data();
          if (!item.id) item.id = d.id;
          cloudProds.push(item);
        });
        if (cloudProds.length > 0) {
          localStorage.setItem("telecom_pos_products", JSON.stringify(cloudProds));
          if (window.POS && window.POS.renderProducts) window.POS.renderProducts();
          if (window.Inventory && window.Inventory.renderProductsTable) window.Inventory.renderProductsTable();
        }
      }

      isConnected = true;
      lastSyncTime = new Date();
      updateUIStatus("connected", "سحابة فايربيز متصلة");
    }, (err) => {
      console.warn("Firestore products listener error:", err.code);
      handleFirestoreError(err);
    });

    // 2. Listen for Transactions across all cashiers
    onSnapshot(collection(db, "transactions"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudTx = [];
        snapshot.forEach(d => cloudTx.push(d.data()));
        cloudTx.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        localStorage.setItem("telecom_pos_transactions", JSON.stringify(cloudTx));

        if (window.Analytics && window.Analytics.refresh) window.Analytics.refresh();
        if (window.Archive && window.Archive.renderArchiveInvoices) window.Archive.renderArchiveInvoices();
        if (window.POS && window.POS.renderCashierShiftSummary) window.POS.renderCashierShiftSummary();
      }
    }, (err) => {
      handleFirestoreError(err);
    });

    // 3. Listen for Wallets
    onSnapshot(doc(db, "wallets", "current"), (docSnap) => {
      if (docSnap.exists() && docSnap.data().balances) {
        localStorage.setItem("telecom_pos_wallets", JSON.stringify(docSnap.data().balances));
        if (window.Inventory && window.Inventory.renderWalletBalances) window.Inventory.renderWalletBalances();
      }
    }, (err) => {
      handleFirestoreError(err);
    });

    // 4. Listen for System Settings
    onSnapshot(doc(db, "system_settings", "general"), (docSnap) => {
      if (docSnap.exists()) {
        const s = docSnap.data();
        localStorage.setItem("telecom_pos_settings", JSON.stringify(s));
        if (window.Settings && window.Settings.loadSettingsIntoForm) window.Settings.loadSettingsIntoForm();
      }
    }, (err) => {
      handleFirestoreError(err);
    });

  } catch (err) {
    console.warn("Setup listeners failed:", err);
    handleFirestoreError(err);
  }
}

function handleFirestoreError(err) {
  if (err.code === "permission-denied") {
    updateUIStatus("error", "بانتظار تفعيل قواعد Firestore");
    showPermissionWarningBanner();
  } else {
    updateUIStatus("offline", "وضع محلي (Offline)");
  }
}

// Show a friendly guidance banner if Firestore rules need one-click test mode activation
function showPermissionWarningBanner() {
  const banner = document.getElementById("firebase-rules-warning-banner");
  if (banner) {
    banner.classList.remove("hidden");
  }
}

// Test Connection
async function testConnection() {
  updateUIStatus("syncing", "جاري فحص الاتصال بفايربيز...");
  try {
    await pushAllDataToFirebase();
    return true;
  } catch (e) {
    return false;
  }
}

// Initialize listeners on load
if (db) {
  setupRealtimeListeners();
}

// Expose to window globally so Store and UI can interact with it
window.FirebaseSync = {
  app,
  db,
  analytics,
  config: firebaseConfig,
  saveTransaction,
  saveProduct,
  deleteProduct,
  saveUser,
  deleteUser,
  saveWallets,
  saveSettings,
  saveAuditLog,
  saveDailyArchive,
  pushAllDataToFirebase,
  pullAllDataFromFirebase,
  testConnection,
  updateUIStatus
};
