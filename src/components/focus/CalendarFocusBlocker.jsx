import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, addMinutes, parse } from "date-fns";

export default function CalendarFocusBlocker({
  task,
  estimatedDuration,
  startTime,
  onBlockCreated
}) {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedTime, setSelectedTime] = useState(startTime || format(new Date(), 'HH:mm'));
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlockFocusTime = async () => {
    setIsBlocking(true);
    
    try {
      const startDateTime = parse(`${selectedDate} ${selectedTime}`, 'yyyy-MM-dd HH:mm', new Date());
      const endDateTime = addMinutes(startDateTime, estimatedDuration);

      // Create calendar event for focus block
      const event = await base44.entities.CalendarEvent.create({
        title: `🎯 Focus: ${task.title}`,
        description: `Focus session for: ${task.title}\n\nSubtasks:\n${task.subtasks?.map(st => `• ${st.title}`).join('\n') || 'No subtasks'}`,
        start_date: format(startDateTime, 'yyyy-MM-dd'),
        start_time: format(startDateTime, 'HH:mm'),
        end_time: format(endDateTime, 'HH:mm'),
        duration_minutes: estimatedDuration,
        source: 'task',
        task_id: task.id,
        is_focus_block: true,
        color: '#8B5CF6'
      });

      // Update task with focus block scheduled flag
      await base44.entities.Task.update(task.id, {
        focus_block_scheduled: true
      });

      toast.success(`Focus time blocked on ${format(startDateTime, 'MMM d')} at ${format(startDateTime, 'h:mm a')}! 🎯`);
      
      if (onBlockCreated) {
        onBlockCreated(event);
      }
    } catch (error) {
      console.error("Error blocking focus time:", error);
      toast.error("Failed to block focus time");
    }
    
    setIsBlocking(false);
  };

  const totalMinutes = task?.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 0), 0) || estimatedDuration || 30;

  return (
    <Card className="bg-gradient-to-br from-teal-50 to-blue-50 dark:from-teal-900/20 dark:to-blue-900/20 border-teal-200 dark:border-teal-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          Block Focus Time
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {task?.focus_block_scheduled ? (
          <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Focus time already scheduled!</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-400">
              This task has dedicated focus time on your calendar.
            </p>
          </div>
        ) : (
          <>
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-teal-200 dark:border-teal-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Estimated Duration</span>
                <span className="text-lg font-bold text-teal-600 dark:text-teal-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {totalMinutes} min
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Total time for all subtasks
              </p>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="focus-date">Date</Label>
                <Input
                  id="focus-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="dark:bg-gray-800"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="focus-time">Start Time</Label>
                <Input
                  id="focus-time"
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="dark:bg-gray-800"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-xs text-blue-700 dark:text-blue-300">
              💡 Blocking focus time helps you commit to working on this task and prevents scheduling conflicts.
            </div>

            <Button
              onClick={handleBlockFocusTime}
              disabled={isBlocking}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600"
            >
              {isBlocking ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Blocking Time...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Block {totalMinutes} Minutes on Calendar
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}