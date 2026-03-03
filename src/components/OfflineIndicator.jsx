import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw, CheckCircle } from 'lucide-react';

export default function OfflineIndicator({ isOnline, pendingCount, isSyncing, onRetry }) {
  const show = !isOnline || pendingCount > 0 || isSyncing;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium text-white ${
            !isOnline
              ? 'bg-red-500'
              : isSyncing
              ? 'bg-blue-500'
              : 'bg-amber-500'
          }`}>
            {!isOnline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline — changes queued ({pendingCount})</span>
              </>
            ) : isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Syncing {pendingCount} change{pendingCount !== 1 ? 's' : ''}…</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>{pendingCount} change{pendingCount !== 1 ? 's' : ''} pending sync</span>
                <button
                  onClick={onRetry}
                  className="ml-1 underline hover:no-underline text-white/90"
                >
                  Sync now
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}