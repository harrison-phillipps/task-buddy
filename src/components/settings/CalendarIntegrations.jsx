import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, RefreshCw, Loader2, ArrowLeftRight, Info } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useIsNativeIOS } from "@/hooks/useIsNativeIOS";
import IOSCalendarExport from "@/components/settings/IOSCalendarExport";

export default function CalendarIntegrations() {
  const { user: currentUser, refreshUser } = useAuth();
  const [isSyncing, setIsSyncing] = useState(null); // null | "google" | "outlook"
  const [lastSynced, setLastSynced] = useState({});

  const handleSync = async (provider) => {
    setIsSyncing(provider);
    const fnName = provider === "google" ? "fetchCalendarEvents" : "fetchOutlookCalendarEvents";
    const label = provider === "google" ? "Google Calendar" : "Outlook Calendar";
    try {
      const res = await base44.functions.invoke(fnName, {});
      if (res.data?.success) {
        toast.success(`Synced ${res.data.events_synced} events from ${label}`);
        setLastSynced(prev => ({ ...prev, [provider]: new Date() }));
        await refreshUser();
      } else {
        toast.error(res.data?.error || "Sync failed");
      }
    } catch (error) {
      console.error(error);
      toast.error(`Failed to sync ${label}`);
    } finally {
      setIsSyncing(null);
    }
  };

  const handleTwoWaySync = async () => {
    setIsSyncing('two_way');
    try {
      const res = await base44.functions.invoke('syncCalendarToTasks', {});
      if (res.data?.success) {
        const total = res.data.total_updated || 0;
        toast.success(total > 0 ? `Updated ${total} task(s) from calendar changes` : 'Tasks are up to date with your calendar');
        setLastSynced(prev => ({ ...prev, two_way: new Date() }));
      } else {
        toast.error('Two-way sync failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Two-way sync failed');
    } finally {
      setIsSyncing(null);
    }
  };

  const isNativeIOS = useIsNativeIOS();
  const isGoogleConnected = currentUser?.calendar_provider === "google" && currentUser?.calendar_connected;
  const isOutlookConnected = currentUser?.calendar_provider === "outlook" && currentUser?.calendar_connected;

  const CalendarCard = ({ provider, label, emoji, color, borderColor, bgColor, isConnected }) => (
    <Card className={`border-2 ${borderColor} ${bgColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{emoji}</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900">{label}</h3>
                {isConnected && (
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    <Check className="w-3 h-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </div>
              <p className="text-sm text-gray-600">Imports your upcoming events for the next 7 days</p>
              {lastSynced[provider] && (
                <p className="text-xs text-gray-400 mt-1">Last synced: {lastSynced[provider].toLocaleTimeString()}</p>
              )}
            </div>
          </div>
          <Button
            onClick={() => handleSync(provider)}
            disabled={isSyncing !== null}
            variant={isConnected ? "outline" : "default"}
            className={isConnected
              ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              : `bg-gradient-to-r ${color} text-white`
            }
          >
            {isSyncing === provider ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
            ) : isConnected ? (
              <><RefreshCw className="w-4 h-4 mr-2" />Sync Now</>
            ) : (
              <>Connect & Sync</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Calendar Integrations
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect your calendar so the AI planner can schedule around existing commitments
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CalendarCard
            provider="google"
            label="Google Calendar"
            emoji="📅"
            color="from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
            borderColor="border-blue-200"
            bgColor="bg-blue-50"
            isConnected={isGoogleConnected}
          />
          <CalendarCard
            provider="outlook"
            label="Outlook Calendar"
            emoji="📧"
            color="from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
            borderColor="border-indigo-200"
            bgColor="bg-indigo-50"
            isConnected={isOutlookConnected}
          />
        </CardContent>
      </Card>

      {(isGoogleConnected || isOutlookConnected) && (
        <Card className="border-2 border-teal-200 bg-teal-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ArrowLeftRight className="w-4 h-4 text-teal-600" />
                  Two-Way Sync
                </h3>
                <p className="text-sm text-gray-600 mt-1">Pull calendar date changes back into TaskBuddy tasks</p>
                {lastSynced.two_way && (
                  <p className="text-xs text-gray-400 mt-1">Last synced: {lastSynced.two_way.toLocaleTimeString()}</p>
                )}
                <p className="text-xs text-teal-700 mt-1">Auto-runs every 30 minutes</p>
              </div>
              <Button
                onClick={handleTwoWaySync}
                disabled={isSyncing !== null}
                variant="outline"
                className="border-teal-300 bg-white text-teal-700 hover:bg-teal-50"
              >
                {isSyncing === 'two_way' ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                ) : (
                  <><ArrowLeftRight className="w-4 h-4 mr-2" />Sync Now</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-purple-50 to-teal-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💡 How two-way sync works</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>→ <strong>Task → Calendar:</strong> Setting a due date auto-creates a calendar event</li>
            <li>← <strong>Calendar → Task:</strong> Moving an event in your calendar updates the task deadline</li>
            <li>🔄 Runs automatically every 30 minutes</li>
          </ul>
        </CardContent>
      </Card>

      <IOSCalendarExport />
    </div>
  );
}