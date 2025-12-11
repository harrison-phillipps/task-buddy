import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, Clock, Calendar } from "lucide-react";
import { format, addDays, setHours, setMinutes, addMinutes } from "date-fns";
import { toast } from "sonner";

export default function AutoScheduleFocusBlock({ open, onOpenChange, task, onScheduled }) {
  const [scheduleType, setScheduleType] = useState("next_available");
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [preferredTime, setPreferredTime] = useState("09:00");
  const [duration, setDuration] = useState(task?.estimated_minutes || 30);
  const [isScheduling, setIsScheduling] = useState(false);

  const handleAutoSchedule = async () => {
    setIsScheduling(true);
    try {
      let scheduledDate = new Date();
      let startTime = preferredTime;

      if (scheduleType === "specific") {
        scheduledDate = new Date(specificDate);
      } else if (scheduleType === "next_available") {
        // Find next available slot (simple logic: tomorrow at preferred time)
        scheduledDate = addDays(new Date(), 1);
      } else if (scheduleType === "today") {
        scheduledDate = new Date();
      }

      // Parse time
      const [hours, minutes] = startTime.split(':');
      const startDateTime = setMinutes(setHours(scheduledDate, parseInt(hours)), parseInt(minutes));
      const endDateTime = addMinutes(startDateTime, duration);

      // Create calendar event
      await base44.entities.CalendarEvent.create({
        title: `Focus: ${task.title}`,
        description: `Dedicated focus time for: ${task.description || task.title}`,
        start_date: format(scheduledDate, 'yyyy-MM-dd'),
        start_time: format(startDateTime, 'HH:mm'),
        end_time: format(endDateTime, 'HH:mm'),
        duration_minutes: duration,
        source: 'task',
        task_id: task.id,
        color: task.team_id ? '#14B8A6' : '#8B5CF6',
        is_focus_block: true
      });

      // Mark task as calendar synced
      await base44.entities.Task.update(task.id, {
        calendar_synced: true,
        focus_block_scheduled: true
      });

      toast.success(`Focus block scheduled for ${format(scheduledDate, 'MMM d')} at ${startTime}`);
      onScheduled?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error scheduling focus block:", error);
      toast.error("Failed to schedule focus block");
    } finally {
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Schedule Focus Block
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-3 bg-purple-50 rounded-lg">
            <p className="font-medium text-gray-900">{task?.title}</p>
            <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Estimated: {task?.estimated_minutes || 30} minutes
            </p>
          </div>

          <div className="space-y-2">
            <Label>When would you like to work on this?</Label>
            <Select value={scheduleType} onValueChange={setScheduleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="next_available">Tomorrow</SelectItem>
                <SelectItem value="specific">Choose specific date</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scheduleType === "specific" && (
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Duration (min)</Label>
              <Input
                type="number"
                min="10"
                max="240"
                step="5"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
            <p className="text-sm text-teal-800">
              💡 A focus block will be created in your calendar and linked to this task.
            </p>
          </div>

          <Button
            onClick={handleAutoSchedule}
            disabled={isScheduling}
            className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            {isScheduling ? "Scheduling..." : "Schedule Focus Block"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}