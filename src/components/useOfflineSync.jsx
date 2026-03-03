/**
 * useOfflineSync — React hook
 * Tracks online/offline state, exposes pending queue count,
 * and flushes the queue when connectivity returns.
 * Conflict resolution: last-write-wins.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  getPendingOps,
  removeOp,
  getPendingCount,
  isLocalId,
} from './offlineStore';

const ENTITY_MAP = {
  Task: () => base44.entities.Task,
  FocusSession: () => base44.entities.FocusSession,
};

export function useOfflineSync({ onSyncComplete } = {}) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncLock = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
    return count;
  }, []);

  const flushQueue = useCallback(async () => {
    if (syncLock.current) return;
    syncLock.current = true;
    setIsSyncing(true);

    try {
      const ops = await getPendingOps();
      if (ops.length === 0) return;

      // Apply in chronological order
      ops.sort((a, b) => a._localTimestamp - b._localTimestamp);

      // Track local→server ID mappings for creates
      const idMap = {};

      for (const op of ops) {
        const getEntity = ENTITY_MAP[op.entity];
        if (!getEntity) {
          await removeOp(op.opId);
          continue;
        }
        const entity = getEntity();

        // Resolve any local ID to the real server ID
        const resolvedId = idMap[op.id] || op.id;

        try {
          if (op.type === 'create') {
            const { id: _discard, ...cleanData } = op.data || {};
            const created = await entity.create(cleanData);
            if (op.id && isLocalId(op.id)) {
              idMap[op.id] = created.id;
            }
          } else if (op.type === 'update') {
            if (isLocalId(resolvedId)) {
              // Create hasn't synced yet — skip, will retry
              continue;
            }
            await entity.update(resolvedId, op.data || {});
          } else if (op.type === 'delete') {
            if (!isLocalId(resolvedId)) {
              await entity.delete(resolvedId);
            }
          }

          await removeOp(op.opId);
        } catch (err) {
          // 404 = already gone server-side, safe to discard
          if (err?.response?.status === 404 || err?.status === 404) {
            await removeOp(op.opId);
          } else {
            console.error(`Offline sync: failed op ${op.opId}`, err);
            // Keep in queue for next retry
          }
        }
      }

      await refreshPendingCount();
      onSyncComplete?.();
    } finally {
      setIsSyncing(false);
      syncLock.current = false;
    }
  }, [onSyncComplete, refreshPendingCount]);

  // Online/offline listeners
  useEffect(() => {
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      flushQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [flushQueue, refreshPendingCount]);

  // Periodic retry every 30 s when online and ops pending
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!navigator.onLine || syncLock.current) return;
      const count = await refreshPendingCount();
      if (count > 0) flushQueue();
    }, 30000);
    return () => clearInterval(interval);
  }, [flushQueue, refreshPendingCount]);

  return { isOnline, pendingCount, isSyncing, flushQueue, refreshPendingCount };
}