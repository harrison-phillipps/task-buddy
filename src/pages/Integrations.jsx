import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  CheckCircle, 
  ExternalLink, 
  Zap,
  Clock,
  Smartphone
} from "lucide-react";
import { motion } from "framer-motion";
import { useIsNativeIOS } from "@/hooks/useIsNativeIOS";

const integrations = [
  {
    id: "google-calendar",
    name: "Google Calendar",
    description: "Sync your tasks and focus blocks with Google Calendar",
    icon: Calendar,
    color: "from-blue-500 to-blue-600",
    status: "available",
    features: ["Two-way sync", "Deadline reminders", "Focus block scheduling"],
    fnName: "fetchCalendarEvents",
  },
  {
    id: "outlook-calendar",
    name: "Outlook Calendar",
    description: "Connect your Microsoft Outlook calendar for seamless scheduling",
    icon: Calendar,
    color: "from-blue-600 to-indigo-600",
    status: "available",
    features: ["Event sync", "Meeting integration", "Deadline tracking"],
    fnName: "fetchOutlookCalendarEvents",
  },
];

export default function Integrations() {
  const [connectingId, setConnectingId] = useState(null);
  const [connectedIds, setConnectedIds] = useState([]);
  const isNativeIOS = useIsNativeIOS();

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.calendar_connected && user?.calendar_provider) {
        const id = user.calendar_provider === "google" ? "google-calendar" : "outlook-calendar";
        setConnectedIds([id]);
      }
    }).catch(() => {});
  }, []);

  const handleConnect = async (integration) => {
    setConnectingId(integration.id);
    try {
      const res = await base44.functions.invoke(integration.fnName, {});
      if (res.data?.success) {
        const provider = integration.id === "google-calendar" ? "google" : "outlook";
        await base44.auth.updateMe({ calendar_connected: true, calendar_provider: provider });
        setConnectedIds(prev => [...prev, integration.id]);
      } else {
        alert(`Failed to sync ${integration.name}. Please try again.`);
      }
    } catch (e) {
      console.error(e);
      alert(`Error connecting ${integration.name}: ${e.message}`);
    } finally {
      setConnectingId(null);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">Calendar Sync</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Connect your calendar to enable smart scheduling and gap filling.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <motion.div key={integration.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 border-purple-100 dark:border-gray-700 dark:bg-gray-800">
                  <CardHeader>
                    <div className={`w-12 h-12 bg-gradient-to-br ${integration.color} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-gray-900 dark:text-gray-100">{integration.name}</CardTitle>
                    <CardDescription className="dark:text-gray-400">{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 mb-4">
                      {integration.features.map((feature, idx) => (
                        <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    {isNativeIOS ? (
                      <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-xs text-blue-800 dark:text-blue-300">
                        <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>To connect {integration.name}, visit <strong>taskbuddy.app</strong> in Safari.</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleConnect(integration)}
                        disabled={connectingId === integration.id}
                        className={`w-full bg-gradient-to-r ${integration.color} text-white hover:opacity-90`}
                      >
                        {connectingId === integration.id ? (
                          <><Clock className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                        ) : connectedIds.includes(integration.id) ? (
                          <><CheckCircle className="w-4 h-4 mr-2" />Synced!</>
                        ) : (
                          <><ExternalLink className="w-4 h-4 mr-2" />Sync Now</>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}