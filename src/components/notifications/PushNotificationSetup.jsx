import React, { useState, useEffect } from 'react';
import { Bell, BellOff, BellRing, Loader2, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';

export default function PushNotificationSetup({ compact = false, onDismiss }) {
  const { isSupported, permission, subscription, isRegistering, requestPermissionAndSubscribe, unsubscribe, sendTestNotification } = usePushNotifications();
  const [vapidKey, setVapidKey] = useState('');
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    // Fetch VAPID public key from a simple backend function
    base44.functions.invoke('getVapidPublicKey', {})
      .then(res => { if (res.data?.key) setVapidKey(res.data.key); })
      .catch(() => {});
  }, []);

  const isEnabled = permission === 'granted' && !!subscription;

  const handleEnable = async () => {
    if (!vapidKey) {
      setStatus('error');
      setStatusMsg('Push configuration not ready. Please try again.');
      return;
    }
    const result = await requestPermissionAndSubscribe(vapidKey);
    if (result.success) {
      if (!result.native) {
        await sendTestNotification(result.subscription);
      }
      setStatus('success');
      setStatusMsg(result.native
        ? 'Push notifications enabled!'
        : 'Push notifications enabled! A test notification was just sent.');
    } else if (result.reason === 'denied') {
      setStatus('error');
      setStatusMsg('Permission denied. Enable notifications in your browser settings.');
    } else {
      setStatus('error');
      setStatusMsg('Something went wrong. Please try again.');
    }
  };

  const handleDisable = async () => {
    await unsubscribe();
    setStatus(null);
  };

  if (!isSupported) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isEnabled ? (
          <Button variant="ghost" size="sm" onClick={handleDisable} className="text-green-600 hover:text-red-600 gap-1.5">
            <BellRing className="w-4 h-4" />
            <span className="text-xs">Push On</span>
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={handleEnable} disabled={isRegistering} className="text-gray-500 hover:text-purple-600 gap-1.5">
            {isRegistering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            <span className="text-xs">Enable Push</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 rounded-2xl border border-purple-100 dark:border-purple-800 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEnabled ? 'bg-green-100' : 'bg-purple-100'}`}>
            {isEnabled ? <BellRing className="w-5 h-5 text-green-600" /> : <Bell className="w-5 h-5 text-purple-600" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {isEnabled ? 'Push Notifications On' : 'Smart Push Reminders'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isEnabled
                ? 'You\'ll get reminders for Must Do tasks with snooze options'
                : 'Get browser reminders for Must Do tasks — even when the app is closed'}
            </p>
          </div>
        </div>
        {onDismiss && !isEnabled && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {status && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg ${
              status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /> : <BellOff className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />}
            {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2">
        {isEnabled ? (
          <Button variant="outline" size="sm" onClick={handleDisable} className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
            <BellOff className="w-3.5 h-3.5 mr-1.5" />
            Disable
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleEnable}
            disabled={isRegistering || permission === 'denied'}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white text-xs"
          >
            {isRegistering ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Setting up...</>
            ) : permission === 'denied' ? (
              <><BellOff className="w-3.5 h-3.5 mr-1.5" /> Blocked in browser</>
            ) : (
              <><Bell className="w-3.5 h-3.5 mr-1.5" /> Enable Reminders</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}