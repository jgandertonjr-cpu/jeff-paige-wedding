// Tiny key-value store of plain objects. Keys use only [a-z0-9:_-].

export function memoryStore() {
  const data = new Map();
  const copy = (v) => JSON.parse(JSON.stringify(v));
  return {
    async get(key) {
      return data.has(key) ? copy(data.get(key)) : null;
    },
    async set(key, object) {
      data.set(key, copy(object));
    },
    async delete(key) {
      data.delete(key);
    },
  };
}

// Thin adapter over Netlify Blobs (strong consistency). Only works inside a
// Netlify Function, so it is not covered by unit tests.
export function blobStore(name) {
  let store;
  const open = async () => {
    if (!store) {
      const { getStore } = await import("@netlify/blobs");
      store = getStore({ name, consistency: "strong" });
    }
    return store;
  };
  return {
    async get(key) {
      return (await open()).get(key, { type: "json" });
    },
    async set(key, object) {
      await (await open()).setJSON(key, object);
    },
    async delete(key) {
      await (await open()).delete(key);
    },
  };
}
