import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Sparkles, CheckCircle } from "lucide-react";
import { format, addDays } from "date-fns";

export default function SpreadTaskModal({ task, open, onClose, onSave }) {
  const [dailyLimit, setDailyLimit] = useState(30);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  if (!task) return null;

  const totalMinutes = task.subtasks?.reduce((sum, st) => sum + (st.estimated_minutes || 10), 0) || 0;
  const daysNeeded = Math.ceil(totalMinutes / dailyLimit);

  const generateSchedule = () => {
    const schedule = [];
    let currentDay = 0;
    let dayMinutes = 0;
    
    task.subtasks?.forEach((subtask, index) => {
      const subtaskMinutes = subtask.estimated_minutes || 10;
      
      if (dayMinutes + subtaskMinutes > dailyLimit && dayMinutes > 0) {
        currentDay++;
        dayMinutes = 0;
      }
      
      schedule.push({
        ...subtask,
        scheduled_date: format(addDays(new Date(startDate), currentDay), 'yyyy-MM-dd')
      });
      
      dayMinutes += subtaskMinutes;
    });
    
    return schedule;
  };

  const previewSchedule = generateSchedule();
  const groupedByDay = previewSchedule.reduce((acc, st) => {
    if (!acc[st.scheduled_date]) acc[st.scheduled_date] = [];
    acc[st.scheduled_date].push(st);
    return acc;
  }, {});

  const handleSave = () => {
    onSave({
      ...task,
      subtasks: previewSchedule,
      spread_across_days: true,
      daily_time_limit: dailyLimit
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Spread Task Across Days
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-1">{task.title}</h3>
            <div className="flex gap-3 text-sm text-gray-600">
              <span>{task.subtasks?.length || 0} steps</span>
              <span>•</span>
              <span>{totalMinutes} min total</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Daily Time Limit</Label>
              <Badge className="bg-purple-100 text-purple-700">{dailyLimit} min/day</Badge>
            </div>
            <Slider
              value={[dailyLimit]}
              onValueChange={(value) => setDailyLimit(value[0])}
              min={10}
              max={120}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              With {dailyLimit} min/day, this task will take approximately {daysNeeded} day{daysNeeded !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              Preview Schedule
            </Label>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {Object.entries(groupedByDay).map(([date, subtasks]) => {
                const dayMinutes = subtasks.reduce((sum, st) => sum + (st.estimated_minutes || 10), 0);
                return (
                  <div key={date} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-gray-700">
                        {format(new Date(date), 'EEEE, MMM d')}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        {dayMinutes}m
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {subtasks.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-4 h-4 rounded-full border-2 border-purple-300 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          </div>
                          <span className="flex-1">{st.title}</span>
                          <span className="text-xs text-gray-400">{st.estimated_minutes || 10}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Apply Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}