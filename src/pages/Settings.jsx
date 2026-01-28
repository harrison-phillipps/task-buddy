import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Bell, CreditCard, Calendar, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NotificationSettings from "./NotificationSettings";
import Subscription from "./Subscription";
import CalendarIntegrations from "../components/settings/CalendarIntegrations";
import AIPrioritizationSettings from "../components/settings/AIPrioritizationSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("notifications");
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-600">Manage your preferences and subscription</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
                <span className="sm:hidden">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="hidden sm:inline">AI Priority</span>
                <span className="sm:hidden">AI</span>
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Subscription</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            <TabsContent value="ai">
              <AIPrioritizationSettings 
                currentUser={currentUser}
                onUpdate={async () => {
                  const user = await base44.auth.me();
                  setCurrentUser(user);
                }}
              />
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarIntegrations />
            </TabsContent>

            <TabsContent value="subscription">
              <Subscription />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}