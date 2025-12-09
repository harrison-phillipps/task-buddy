import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, Link, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function CalendarIntegrations() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backendEnabled, setBackendEnabled] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Check if backend functions are enabled
        try {
          const result = await base44.functions.google_calendar.get_auth_url({ redirect_uri: 'test' });
          setBackendEnabled(result.success !== false || !result.message?.includes('Backend functions'));
        } catch (error) {
          setBackendEnabled(false);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const handleConnectGoogle = async () => {
    if (!backendEnabled) {
      toast.error("Please enable backend functions in app settings first");
      return;
    }

    setIsLoading(true);
    try {
      const redirectUri = `${window.location.origin}/CalendarCallback`;
      const result = await base44.functions.google_calendar.get_auth_url({
        redirect_uri: redirectUri
      });
      
      if (result.success && result.auth_url) {
        window.location.href = result.auth_url;
      } else {
        toast.error("Failed to initiate Google Calendar connection");
      }
    } catch (error) {
      console.error("Error connecting Google Calendar:", error);
      toast.error("Error connecting to Google Calendar");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await base44.auth.updateMe({
        google_calendar_connected: false,
        google_calendar_access_token: null,
        google_calendar_refresh_token: null
      });
      setCurrentUser({
        ...currentUser,
        google_calendar_connected: false
      });
      toast.success("Google Calendar disconnected");
    } catch (error) {
      console.error("Error disconnecting:", error);
      toast.error("Failed to disconnect");
    }
  };

  const calendars = [
    {
      id: "google",
      name: "Google Calendar",
      icon: "📅",
      color: "from-blue-500 to-blue-600",
      borderColor: "border-blue-200",
      bgColor: "bg-blue-50",
      description: "Sync tasks with your Google Calendar",
      connected: currentUser?.google_calendar_connected,
      available: backendEnabled,
      onConnect: handleConnectGoogle,
      onDisconnect: handleDisconnectGoogle
    },
    {
      id: "apple",
      name: "Apple Calendar",
      icon: "🍎",
      color: "from-gray-500 to-gray-600",
      borderColor: "border-gray-200",
      bgColor: "bg-gray-50",
      description: "Sync tasks with iCloud Calendar",
      connected: currentUser?.apple_calendar_connected,
      available: false,
      comingSoon: true
    },
    {
      id: "outlook",
      name: "Outlook Calendar",
      icon: "📧",
      color: "from-indigo-500 to-indigo-600",
      borderColor: "border-indigo-200",
      bgColor: "bg-indigo-50",
      description: "Sync tasks with Microsoft Outlook",
      connected: currentUser?.outlook_calendar_connected,
      available: false,
      comingSoon: true
    }
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Calendar Integrations
          </CardTitle>
          <p className="text-sm text-gray-600">
            Connect your calendar to sync tasks and events
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!backendEnabled && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Backend functions must be enabled for calendar integrations. Contact your administrator to enable this feature.
              </p>
            </div>
          )}

          {calendars.map((calendar) => (
            <Card key={calendar.id} className={`${calendar.bgColor} border-2 ${calendar.borderColor}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-4xl">{calendar.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{calendar.name}</h3>
                        {calendar.connected && (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            <Check className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        )}
                        {calendar.comingSoon && (
                          <Badge variant="outline" className="text-gray-600">
                            Coming Soon
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{calendar.description}</p>
                    </div>
                  </div>

                  <div>
                    {calendar.available && !calendar.connected && (
                      <Button
                        onClick={calendar.onConnect}
                        disabled={isLoading}
                        className={`bg-gradient-to-r ${calendar.color} text-white`}
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <Link className="w-4 h-4 mr-2" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                    {calendar.available && calendar.connected && (
                      <Button
                        onClick={calendar.onDisconnect}
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        Disconnect
                      </Button>
                    )}
                    {calendar.comingSoon && (
                      <Button disabled variant="outline">
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-purple-50 to-teal-50 border-purple-200">
        <CardContent className="p-4">
          <h4 className="font-semibold text-gray-900 mb-2">💡 Pro Tip</h4>
          <p className="text-sm text-gray-700">
            Connect your calendar to automatically sync your tasks and see them alongside your meetings and events. 
            This helps you plan your day more effectively and never miss a deadline!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}