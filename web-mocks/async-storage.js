
// AsyncStorage web mock — usa localStorage
const AsyncStorage = {
  getItem: async (key) => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key, value) => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key) => {
    try { localStorage.removeItem(key); } catch {}
  },
  multiGet: async (keys) => keys.map(k => [k, localStorage.getItem(k)]),
  multiSet: async (pairs) => pairs.forEach(([k,v]) => localStorage.setItem(k,v)),
  multiRemove: async (keys) => keys.forEach(k => localStorage.removeItem(k)),
  clear: async () => { try { localStorage.clear(); } catch {} },
  getAllKeys: async () => Object.keys(localStorage),
};
export default AsyncStorage;
