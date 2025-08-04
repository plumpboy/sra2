// Chrome Storage Management
export const Storage = {
  async get(keys) {
    if (Array.isArray(keys)) {
      return await chrome.storage.local.get(keys);
    }
    const result = await chrome.storage.local.get(keys);
    return result[keys];
  },

  async set(data) {
    return await chrome.storage.local.set(data);
  },

  async clear() {
    return await chrome.storage.local.clear();
  }
};
