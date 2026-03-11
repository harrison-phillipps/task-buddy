import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, RefreshCw, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CalendarIntegrations() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  const handleSyncGoogle = async () => {
    setIsSyncing(true);
    try {
      const res = await base44.functions.invoke('fetchCalendarEvents', {});
      if (res.data?.success) {
        toast.success(`Synced ${res.data.events_synced} events from Google Calendar`);
        setLastSynced(new Date());
        setCurrentUser(u => ({ ...u, calendar_connected: true, calendar_provider: "google" }));
      } else {
        toast.error(res.data?.error || "Sync failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync Google Calendar");
    } finally {
      setIsSyncing(false);
    }
  };

  const isGoogleConnected = currentUser?.calendar_provider === "google" && currentUser?.calendar_connected;

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

          {/* Google Calendar */}
          <Card className="bg-blue-50 border-2 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">📅</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">Google Calendar</h3>
                      {isGoogleConnected && (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <Check className="w-3 h-3 mr-1" />
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">Imports your upcoming events for the next 7 days</p>
                    {lastSynced && (
                      <p className="text-xs text-gray-400 mt-1">Last synced: {lastSynced.toLocaleTimeString()}</p>
                    )}
                  </div>
                </div>
                <Button
                  onClick={handleSyncGoogle}
                  disabled={isSyncing}
                  className={isGoogleConnected
                    ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    : "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                  }
                  variant={isGoogleConnected ? "outline" : "default"}
                >
                  {isSyncing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                  ) : isGoogleConnected ? (
                    <><RefreshCw className="w-4 h-4 mr-2" />Sync Now</>
                  ) : (
                    <>Connect & Sync</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Outlook - Coming Soon */}
          <Card className="bg-indigo-50 border-2 border-indigo-200 opacity-60">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">📧</span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">Outlook Calendar</h3>
                      <Badge variant="outline" className="text-gray-500">Coming Soon</Badge>
                    </div>
                    <p className="text-sm text-gray-600">Sync tasks with Microsoft Outlook</p>
                  </div>
                </div>
                <Button disabled variant="outline">Coming Soon</Button>
              </div>
            </CardContent>
          </Card>

        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-50 to-teal-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💡 How it works</h4>
          <p className="text-sm text-gray-700">
            Syncing imports your upcoming calendar events into TaskBuddy. The AI planner (Smart Plan) will automatically schedule your tasks around these existing commitments so you're never double-booked.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}