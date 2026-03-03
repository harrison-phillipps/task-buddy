/**
 * Offline Store — IndexedDB wrapper for TaskBuddy
 * Stores a pending operations queue and a local entity cache.
 * Conflict resolution: last-write-wins based on _localTimestamp.
 */

const DB_NAME = 'taskbuddy_offline';
const DB_VERSION = 1;
const QUEUE_STORE = 'pending_ops';
const CACHE_STORE = 'entity_cache';

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const qs = db.createObjectStore(QUEUE_STORE, { keyPath: 'opId' });
        qs.createIndex('entity', 'entity', { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cs = db.createObjectStore(CACHE_STORE, { keyPath: 'cacheKey' });
        cs.createIndex('entity', 'entity', { unique: false });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

function txn(storeName, mode, fn) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const req = fn(store);
    if (req && typeof req.onsuccess !== 'undefined') {
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    } else {
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject(e.target.error);
    }
  }));
}

// ─── Pending Operations Queue ─────────────────────────────────────────────

export async function enqueueOp(op) {
  const opId = `${op.entity}_${op.type}_${op.id || 'new'}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const record = { ...op, opId, _localTimestamp: Date.now() };
  await txn(QUEUE_STORE, 'readwrite', store => store.put(record));
  return record;
}

export async function getPendingOps() {
  return txn(QUEUE_STORE, 'readonly', store => store.getAll());
}

export async function removeOp(opId) {
  return txn(QUEUE_STORE, 'readwrite', store => store.delete(opId));
}

export async function getPendingCount() {
  const ops = await getPendingOps();
  return ops.length;
}

// ─── Entity Cache ──────────────────────────────────────────────────────────

export async function cacheEntities(entity, items) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readwrite');
    const store = tx.objectStore(CACHE_STORE);
    items.forEach(item => {
      store.put({
        cacheKey: `${entity}_${item.id}`,
        entity,
        id: item.id,
        data: item,
        cachedAt: Date.now(),
      });
    });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

export async function getCachedEntities(entity) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CACHE_STORE, 'readonly');
    const store = tx.objectStore(CACHE_STORE);
    const index = store.index('entity');
    const req = index.getAll(entity);
    req.onsuccess = (e) => resolve(e.target.result.map(r => r.data));
    req.onerror = (e) => reject(e.target.error);
  });
}

export async function upsertCachedEntity(entity, id, data) {
  return txn(CACHE_STORE, 'readwrite', store =>
    store.put({
      cacheKey: `${entity}_${id}`,
      entity,
      id,
      data: { ...data, id },
      cachedAt: Date.now(),
    })
  );
}

export async function removeCachedEntity(entity, id) {
  return txn(CACHE_STORE, 'readwrite', store => store.delete(`${entity}_${id}`));
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function localId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function isLocalId(id) {
  return typeof id === 'string' && id.startsWith('local_');
}