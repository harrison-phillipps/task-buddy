import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, RefreshCw, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function CalendarConnectionStatus({ currentUser, onSync, isSyncing }) {
  const isConnected = currentUser?.calendar_connected;
  const provider = currentUser?.calendar_provider;

  if (isConnected) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900 dark:text-green-300 capitalize">
                    {provider === "google" ? "Google Calendar" : provider} Connected
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    External events are included in your AI plan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">Active</Badge>
                {onSync && (
                  <Button size="sm" variant="outline" onClick={onSync} disabled={isSyncing}
                    className="border-green-300 text-green-700 hover:bg-green-100">
                    <RefreshCw className={`w-3 h-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
                    Sync
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-300">Connect your calendar</p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  Import existing events so AI avoids scheduling conflicts
                </p>
              </div>
            </div>
            <Link to={createPageUrl("Integrations")}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" size="sm">
                Connect
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}