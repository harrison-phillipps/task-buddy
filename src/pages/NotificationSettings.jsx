import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Clock, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function NotificationSettings() {
  const queryClient = useQueryClient();
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

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['notificationPreferences', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return null;
      const prefs = await base44.entities.NotificationPreferences.filter({ user_id: currentUser.id });
      if (prefs.length > 0) return prefs[0];
      
      // Create default preferences
      return await base44.entities.NotificationPreferences.create({
        user_id: currentUser.id,
        task_reminders: true,
        task_reminder_minutes: 60,
        goal_reminders: true,
        goal_reminder_days: 7,
        habit_reminders: true,
        achievement_notifications: true,
        team_notifications: true,
        email_notifications: true,
        email_digest: 'daily',
        quiet_hours_enabled: false
      });
    },
    enabled: !!currentUser,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (data) => base44.entities.NotificationPreferences.update(preferences.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      toast.success("Notification preferences updated");
    },
  });

  const handleToggle = (field, value) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  const handleChange = (field, value) => {
    updatePreferencesMutation.mutate({ [field]: value });
  };

  if (isLoading || !preferences) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Notification Settings
          </h1>
          <p className="text-gray-600 mt-1">Manage how and when you receive notifications</p>
        </motion.div>

        {/* Task Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-600" />
                Task Reminders
              </CardTitle>
              <CardDescription>Get notified about upcoming task deadlines</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="task-reminders">Enable task reminders</Label>
                <Switch
                  id="task-reminders"
                  checked={preferences.task_reminders}
                  onCheckedChange={(checked) => handleToggle('task_reminders', checked)}
                />
              </div>
              {preferences.task_reminders && (
                <div className="space-y-2">
                  <Label>Remind me before due date</Label>
                  <Select
                    value={String(preferences.task_reminder_minutes)}
                    onValueChange={(value) => handleChange('task_reminder_minutes', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="1440">1 day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Goal Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-teal-600" />
                Goal Reminders
              </CardTitle>
              <CardDescription>Stay on track with your long-term objectives</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="goal-reminders">Enable goal reminders</Label>
                <Switch
                  id="goal-reminders"
                  checked={preferences.goal_reminders}
                  onCheckedChange={(checked) => handleToggle('goal_reminders', checked)}
                />
              </div>
              {preferences.goal_reminders && (
                <div className="space-y-2">
                  <Label>Remind me before deadline</Label>
                  <Select
                    value={String(preferences.goal_reminder_days)}
                    onValueChange={(value) => handleChange('goal_reminder_days', parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Habit Reminders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Habit Reminders
              </CardTitle>
              <CardDescription>Daily reminders for your habits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="habit-reminders">Enable habit reminders</Label>
                <Switch
                  id="habit-reminders"
                  checked={preferences.habit_reminders}
                  onCheckedChange={(checked) => handleToggle('habit_reminders', checked)}
                />
              </div>
              <p className="text-sm text-gray-500">
                Reminders are sent at the time you set for each individual habit
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Other Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Other Notifications</CardTitle>
              <CardDescription>Achievements, team updates, and more</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="achievements">Achievement notifications</Label>
                <Switch
                  id="achievements"
                  checked={preferences.achievement_notifications}
                  onCheckedChange={(checked) => handleToggle('achievement_notifications', checked)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="team">Team notifications</Label>
                <Switch
                  id="team"
                  checked={preferences.team_notifications}
                  onCheckedChange={(checked) => handleToggle('team_notifications', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Email Notifications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-600" />
                Email Notifications
              </CardTitle>
              <CardDescription>Receive important updates via email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="email">Send critical notifications via email</Label>
                <Switch
                  id="email"
                  checked={preferences.email_notifications}
                  onCheckedChange={(checked) => handleToggle('email_notifications', checked)}
                />
              </div>
              <div className="space-y-2">
                <Label>Email digest frequency</Label>
                <Select
                  value={preferences.email_digest}
                  onValueChange={(value) => handleChange('email_digest', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily summary</SelectItem>
                    <SelectItem value="weekly">Weekly summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quiet Hours */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>Pause notifications during specific times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="quiet-hours">Enable quiet hours</Label>
                <Switch
                  id="quiet-hours"
                  checked={preferences.quiet_hours_enabled}
                  onCheckedChange={(checked) => handleToggle('quiet_hours_enabled', checked)}
                />
              </div>
              {preferences.quiet_hours_enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_start || '22:00'}
                      onChange={(e) => handleChange('quiet_hours_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End time</Label>
                    <Input
                      type="time"
                      value={preferences.quiet_hours_end || '08:00'}
                      onChange={(e) => handleChange('quiet_hours_end', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}