import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2, AlertCircle, Link } from "lucide-react";
import toast from "react-hot-toast";

const CONNECTOR_ID = "6a151e1a747800c818af2da4";

export default function GoogleTasksSyncButton({ goals = [] }) {
  const [connected, setConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Rule 2: try calling the backend to detect connection
  const checkConnection = useCallback(async () => {
    try {
      await base44.functions.invoke('syncGoalsToGoogleTasks', {});
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // Rule 3: OAuth popup + poll
  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        setChecking(true);
        checkConnection();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    toast.success("Google Tasks disconnected");
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncGoalsToGoogleTasks', {});
      toast.success(`Synced ${res.data.synced} goal${res.data.synced !== 1 ? 's' : ''} to Google Tasks ✓`);
    } catch (err) {
      toast.error("Sync failed — please reconnect Google Tasks");
      setConnected(false);
    } finally {
      setSyncing(false);
    }
  };

  if (checking) {
    return (
      <Button variant="outline" disabled className="border-purple-200 gap-2">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Checking…
      </Button>
    );
  }

  if (!connected) {
    return (
      <Button variant="outline" onClick={handleConnect} className="border-green-300 hover:bg-green-50 text-green-700 gap-2">
        <Link className="w-4 h-4" />
        Connect Google Tasks
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={handleSync}
        disabled={syncing}
        className="border-green-300 hover:bg-green-50 text-green-700 gap-2"
      >
        {syncing
          ? <RefreshCw className="w-4 h-4 animate-spin" />
          : <CheckCircle2 className="w-4 h-4" />}
        {syncing ? "Syncing…" : "Sync to Google Tasks"}
      </Button>
      <button
        onClick={handleDisconnect}
        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
        title="Disconnect Google Tasks"
      >
        Disconnect
      </button>
    </div>
  );
}