// Tiny key-value store of plain objects. Keys use only [a-z0-9:_-].

export function memoryStore() {
  const data = new Map();
  const chains = new Map();
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
    // Atomic per key, even when fn is async: calls on one key run in turn.
    update(key, fn) {
      const run = (chains.get(key) || Promise.resolve()).then(async () => {
        const next = await fn(data.has(key) ? copy(data.get(key)) : null);
        if (next === null) {
          data.delete(key);
          return null;
        }
        data.set(key, copy(next));
        return copy(next);
      });
      chains.set(key, run.catch(() => {}));
      return run;
    },
  };
}

const defaultSleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Compare-and-swap read-modify-write against a Netlify Blobs store object.
// fn(current|null) returns the new value, or null to delete the key.
export async function casLoop(blobs, key, fn, { tries = 8, sleep = defaultSleep } = {}) {
  for (let i = 0; i < tries; i++) {
    const cur = await blobs.getWithMetadata(key, { type: "json" });
    const next = await fn(cur ? cur.data : null);
    if (next === null) {
      await blobs.delete(key);
      return null;
    }
    const res = await blobs.setJSON(key, next, cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (res && res.modified) return next;
    await sleep(10 + Math.random() * 40);
  }
  throw new Error("Could not save after several tries.");
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
    async update(key, fn) {
      return casLoop(await open(), key, fn);
    },
  };
}
