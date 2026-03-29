/**
 * IndexedDB-based caching module for ESC ACS Living Meta-Analysis
 * Supports larger payloads than localStorage (50MB+ vs 5MB)
 */

const DB_NAME = "esc_acs_cache";
const DB_VERSION = 1;
const STORE_NAME = "trials";
const CACHE_KEY = "esc_acs_cache_v2";

let db = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn("IndexedDB not available, falling back to localStorage");
      resolve(null);
    };

    request.onsuccess = event => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = event => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Save cache data to IndexedDB
 * Falls back to localStorage if IndexedDB fails
 */
export async function saveCache(payload) {
  await initDB();

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const data = { id: CACHE_KEY, ...payload, savedAt: new Date().toISOString() };
        const request = store.put(data);

        request.onsuccess = () => {
          console.log("Cache saved to IndexedDB");
          resolve(true);
        };

        request.onerror = () => {
          console.warn("IndexedDB save failed, trying localStorage");
          saveCacheLocalStorage(payload);
          resolve(false);
        };
      } catch (err) {
        console.warn("IndexedDB transaction failed:", err);
        saveCacheLocalStorage(payload);
        resolve(false);
      }
    });
  } else {
    saveCacheLocalStorage(payload);
    return false;
  }
}

/**
 * Load cache data from IndexedDB
 * Falls back to localStorage if IndexedDB fails
 */
export async function loadCache() {
  await initDB();

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(CACHE_KEY);

        request.onsuccess = event => {
          const result = event.target.result;
          if (result) {
            console.log("Cache loaded from IndexedDB");
            resolve(result);
          } else {
            // Try localStorage fallback
            resolve(loadCacheLocalStorage());
          }
        };

        request.onerror = () => {
          console.warn("IndexedDB load failed, trying localStorage");
          resolve(loadCacheLocalStorage());
        };
      } catch (err) {
        console.warn("IndexedDB transaction failed:", err);
        resolve(loadCacheLocalStorage());
      }
    });
  } else {
    return loadCacheLocalStorage();
  }
}

/**
 * Clear all cache data
 */
export async function clearCache() {
  await initDB();

  if (db) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(CACHE_KEY);

        request.onsuccess = () => {
          console.log("IndexedDB cache cleared");
          clearCacheLocalStorage();
          resolve(true);
        };

        request.onerror = () => {
          clearCacheLocalStorage();
          resolve(false);
        };
      } catch (err) {
        clearCacheLocalStorage();
        resolve(false);
      }
    });
  } else {
    clearCacheLocalStorage();
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats() {
  await initDB();

  const stats = {
    storageType: db ? "IndexedDB" : "localStorage",
    hasData: false,
    lastUpdate: null,
    topicCount: 0,
    trialCount: 0,
    sizeEstimate: null
  };

  const cache = await loadCache();
  if (cache) {
    stats.hasData = true;
    stats.lastUpdate = cache.lastUpdate || cache.savedAt;
    stats.topicCount = cache.topics?.length || 0;
    stats.trialCount = cache.topics?.reduce((sum, t) => sum + (t.trials?.length || 0), 0) || 0;

    // Estimate size
    try {
      const serialized = JSON.stringify(cache);
      stats.sizeEstimate = formatBytes(serialized.length);
    } catch (e) {
      stats.sizeEstimate = "Unknown";
    }
  }

  return stats;
}

// LocalStorage fallback functions
const LS_KEY = "esc_acs_cache_v1";
const LS_MAX = 3_500_000;

function saveCacheLocalStorage(payload) {
  try {
    const serialized = JSON.stringify(payload);
    if (serialized.length > LS_MAX) {
      console.warn("Payload too large for localStorage:", formatBytes(serialized.length));
      return false;
    }
    localStorage.setItem(LS_KEY, serialized);
    return true;
  } catch (err) {
    console.warn("localStorage save failed:", err);
    return false;
  }
}

function loadCacheLocalStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function clearCacheLocalStorage() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch (err) {
    // Ignore
  }
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

// Migration helper: move data from localStorage to IndexedDB
export async function migrateToIndexedDB() {
  await initDB();
  if (!db) return false;

  const lsData = loadCacheLocalStorage();
  if (!lsData) return false;

  const saved = await saveCache(lsData);
  if (saved) {
    clearCacheLocalStorage();
    console.log("Migrated cache from localStorage to IndexedDB");
    return true;
  }
  return false;
}
