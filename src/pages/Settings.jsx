import { useState, useEffect } from "react";
import { hasFeatureAccess, UpgradePrompt } from "@/components/subscription/FeatureGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Bell, CreditCard, UserX, Bot, LogOut, User, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import NotificationSettings from "./NotificationSettings";
import ProfileSettings from "../components/settings/ProfileSettings";
import Subscription from "./Subscription";
import CalendarIntegrations from "../components/settings/CalendarIntegrations";
import AIPrioritizationSettings from "../components/settings/AIPrioritizationSettings";
import DeleteAccountFlow from "../components/settings/DeleteAccountFlow";
import CompanionAppearanceEditor from "../components/settings/CompanionAppearanceEditor";
import ClinicianConnect from "../components/settings/ClinicianConnect";

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
            <TabsList className="grid w-full grid-cols-5 mb-6">
              <TabsTrigger value="account" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Me</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="flex items-center gap-2">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Notifications</span>
                <span className="sm:hidden">Alerts</span>
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                <span className="hidden sm:inline">Preferences</span>
                <span className="sm:hidden">Prefs</span>
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Subscription</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
              <TabsTrigger value="companion" className="flex items-center gap-2">
                <Bot className="w-4 h-4" />
                <span className="hidden sm:inline">Companion</span>
                <span className="sm:hidden">Look</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <div className="space-y-6">
                {/* Profile / Display Name */}
                <ProfileSettings
                  currentUser={currentUser}
                  onUpdate={async () => {
                    const user = await base44.auth.me();
                    setCurrentUser(user);
                  }}
                />

                {/* Sign Out */}
                <div className="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Sign out</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">You'll need to sign in again to access your account.</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => base44.auth.logout("/")}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 shrink-0"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                {/* Danger Zone */}
                <div className="border-2 border-red-300 dark:border-red-800 rounded-xl overflow-hidden">
                  <div className="bg-red-50 dark:bg-red-950/40 px-6 py-4 border-b border-red-200 dark:border-red-800">
                    <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                      ⚠️ Danger Zone
                    </h3>
                  </div>
                  <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Delete this account</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Permanently removes your account and all data — tasks, goals, focus sessions, brain dumps, and progress. This cannot be undone.
                      </p>
                    </div>
                    <DeleteAccountFlow />
                  </div>
                </div>

                {/* Clinician (only if clinician profile exists) */}
                <ClinicianConnect currentUser={currentUser} />
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            <TabsContent value="preferences">
              <div className="space-y-6">
                <CalendarIntegrations />
                {hasFeatureAccess(currentUser?.subscription_tier, "ai_prioritization") ? (
                  <AIPrioritizationSettings
                    currentUser={currentUser}
                    onUpdate={async () => {
                      const user = await base44.auth.me();
                      setCurrentUser(user);
                    }}
                  />
                ) : (
                  <UpgradePrompt feature="AI Prioritization Settings" requiredTier="pro" />
                )}
              </div>
            </TabsContent>

            <TabsContent value="subscription">
              <Subscription />
            </TabsContent>

            <TabsContent value="companion">
              <CompanionAppearanceEditor
                currentUser={currentUser}
                onUpdate={async () => {
                  const user = await base44.auth.me();
                  setCurrentUser(user);
                }}
              />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}