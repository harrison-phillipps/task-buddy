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
  Clock
} from "lucide-react";
import { motion } from "framer-motion";

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

  const handleConnect = async (integration) => {
    setConnectingId(integration.id);
    try {
      const res = await base44.functions.invoke(integration.fnName, {});
      if (res.data?.success) {
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100">
              Integrations
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Connect TaskBuddy with your favorite tools and platforms
          </p>
        </motion.div>



        {/* Category Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 overflow-x-auto pb-2"
        >
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id 
                  ? "bg-gradient-to-r from-purple-500 to-teal-500 text-white" 
                  : ""}
              >
                <Icon className="w-4 h-4 mr-2" />
                {category.name}
              </Button>
            );
          })}
        </motion.div>

        {/* Integrations Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredIntegrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-200 border-purple-100 dark:border-gray-700 dark:bg-gray-800">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${integration.color} rounded-xl flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <Badge 
                        variant={integration.status === "available" ? "default" : "secondary"}
                        className={integration.status === "available" 
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" 
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}
                      >
                        {integration.status === "available" ? "Available" : "Coming Soon"}
                      </Badge>
                    </div>
                    <CardTitle className="text-gray-900 dark:text-gray-100">{integration.name}</CardTitle>
                    <CardDescription className="dark:text-gray-400">{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase mb-2">Features</p>
                        <ul className="space-y-1">
                          {integration.features.map((feature, idx) => (
                            <li key={idx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button 
                        onClick={() => handleConnect(integration)}
                        disabled={integration.status !== "available" || connectingId === integration.id}
                        className={integration.status === "available" 
                          ? `w-full bg-gradient-to-r ${integration.color} text-white hover:opacity-90` 
                          : "w-full"}
                        variant={integration.status === "available" ? "default" : "outline"}
                      >
                        {connectingId === integration.id ? (
                          <><Clock className="w-4 h-4 mr-2 animate-spin" />Syncing...</>
                        ) : connectedIds.includes(integration.id) ? (
                          <><CheckCircle className="w-4 h-4 mr-2" />Synced!</>
                        ) : integration.status === "available" ? (
                          <><ExternalLink className="w-4 h-4 mr-2" />Connect</>
                        ) : (
                          <><Clock className="w-4 h-4 mr-2" />Coming Soon</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Setup Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                How to Enable Integrations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Enable Backend Functions</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Go to your app dashboard settings and enable backend functions. This is required for OAuth integrations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg">
                  <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Connect Your Accounts</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Click "Connect" on any available integration and authorize access through OAuth.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 rounded-lg">
                  <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">Configure Sync Preferences</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Set up how you want data to sync between TaskBuddy and your connected tools.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}