/**
 * Smart Entry Memory Store
 * Stores and retrieves last-used transaction values per context.
 */

const STORAGE_KEY = "bm_fast_entry_memory";

function getStore() {
  if (typeof window === "undefined") return {};
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    return {};
  }
}

function saveStore(store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (e) {}
}

export const fastEntryMemoryStore = {
  getLastValue(key, context) {
    const store = getStore();
    return store[`${context}:${key}`] || "";
  },

  setLastValue(key, value, context) {
    if (value === undefined || value === null || value === "") return;
    const store = getStore();
    store[`${context}:${key}`] = value.toString();
    saveStore(store);
  },

  clearMemory(context) {
    const store = getStore();
    Object.keys(store).forEach((k) => {
      if (k.startsWith(`${context}:`)) {
        delete store[k];
      }
    });
    saveStore(store);
  }
};
