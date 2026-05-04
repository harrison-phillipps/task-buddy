import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { hasFeatureAccess, UpgradePrompt } from "@/components/subscription/FeatureGate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Bell, CreditCard, Calendar, Sparkles, UserX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import NotificationSettings from "./NotificationSettings";
import Subscription from "./Subscription";
import CalendarIntegrations from "../components/settings/CalendarIntegrations";
import AIPrioritizationSettings from "../components/settings/AIPrioritizationSettings";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("notifications");
  const [currentUser, setCurrentUser] = useState(null);
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Delete all user data before removing the account
      if (currentUser) {
        const [tasks, goals, focusSessions, brainDumps, progress] = await Promise.allSettled([
          base44.entities.Task.filter({ created_by: currentUser.email }),
          base44.entities.Goal.filter({ created_by: currentUser.email }),
          base44.entities.FocusSession.filter({ created_by: currentUser.email }),
          base44.entities.BrainDump.filter({ created_by: currentUser.email }),
          base44.entities.UserProgress.filter({ user_id: currentUser.id }),
        ]);
        await Promise.allSettled([
          ...(tasks.value || []).map(t => base44.entities.Task.delete(t.id)),
          ...(goals.value || []).map(g => base44.entities.Goal.delete(g.id)),
          ...(focusSessions.value || []).map(s => base44.entities.FocusSession.delete(s.id)),
          ...(brainDumps.value || []).map(b => base44.entities.BrainDump.delete(b.id)),
          ...(progress.value || []).map(p => base44.entities.UserProgress.delete(p.id)),
        ]);
      }
      await base44.auth.deleteMe();
    } catch (err) {
      console.error("Error during account deletion:", err);
      setDeletingAccount(false);
    }
  };

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
              <TabsTrigger value="account" className="flex items-center gap-2 text-red-500 data-[state=active]:text-red-600">
                <UserX className="w-4 h-4" />
                <span className="hidden sm:inline">Account</span>
                <span className="sm:hidden">Acct</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="notifications">
              <NotificationSettings />
            </TabsContent>

            <TabsContent value="ai">
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
            </TabsContent>

            <TabsContent value="calendar">
              <CalendarIntegrations />
            </TabsContent>

            <TabsContent value="subscription">
              <Subscription />
            </TabsContent>

            <TabsContent value="account">
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm text-blue-700 dark:text-blue-300">
                  <strong>Account Management</strong> — manage your personal account data and deletion options.
                </div>
                <div className="border border-red-200 dark:border-red-900 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-2">
                    <Trash2 className="w-5 h-5" />
                    Delete Account
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Permanently deletes your TaskBuddy account and <strong>all associated data</strong> including tasks, focus sessions, goals, brain dumps, and progress history.
                  </p>
                  <p className="text-sm text-red-500 dark:text-red-400 mb-5 font-medium">
                    ⚠️ This action is permanent and cannot be undone.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="flex items-center gap-2 min-h-[44px]">
                        <Trash2 className="w-4 h-4" />
                        Delete My Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will immediately and permanently delete your account and all your data — tasks, focus sessions, goals, brain dumps, and progress. This cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deletingAccount ? "Deleting..." : "Yes, permanently delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}