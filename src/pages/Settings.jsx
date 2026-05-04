import { useState, useEffect } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
    if (deleteConfirmText !== "DELETE") return;
    setDeletingAccount(true);
    try {
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
      await base44.users.deleteMe();
      base44.auth.redirectToLogin();
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
                    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setDeleteConfirmText(""); }}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex items-center gap-2 min-h-[44px] shrink-0">
                          <Trash2 className="w-4 h-4" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Permanently delete your account?
                          </AlertDialogTitle>
                          <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                              <p>This will <strong>immediately and permanently</strong> delete:</p>
                              <ul className="list-disc list-inside space-y-1 pl-1">
                                <li>All your tasks and subtasks</li>
                                <li>All goals and progress</li>
                                <li>All focus sessions and history</li>
                                <li>All brain dumps</li>
                                <li>Your achievements and streaks</li>
                              </ul>
                              <p className="font-medium text-red-600 dark:text-red-400">This action cannot be undone.</p>
                              <div className="pt-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                  Type <strong className="text-red-600">DELETE</strong> to confirm:
                                </label>
                                <Input
                                  value={deleteConfirmText}
                                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                                  placeholder="DELETE"
                                  className="border-red-300 focus:border-red-500 focus:ring-red-500"
                                />
                              </div>
                            </div>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeleteConfirmText("")}>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteAccount}
                            disabled={deletingAccount || deleteConfirmText !== "DELETE"}
                            className="bg-red-600 hover:bg-red-700 disabled:opacity-40"
                          >
                            {deletingAccount ? "Deleting..." : "Permanently Delete Account"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}