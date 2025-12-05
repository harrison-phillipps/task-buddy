import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw, Repeat } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" }
];

export default function RecurringTaskModal({ open, onOpenChange, onSave, initialTask = null }) {
  const [pattern, setPattern] = useState(initialTask?.recurrence_pattern || "weekly");
  const [interval, setInterval] = useState(initialTask?.recurrence_interval || 1);
  const [selectedDays, setSelectedDays] = useState(initialTask?.recurrence_days || [1]); // Default to Monday
  const [endDate, setEndDate] = useState(initialTask?.recurrence_end_date || "");

  const handleToggleDay = (day) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    );
  };

  const handleSave = () => {
    const recurringData = {
      is_recurring: true,
      recurrence_pattern: pattern,
      recurrence_interval: pattern === "custom" ? interval : undefined,
      recurrence_days: pattern === "weekly" ? selectedDays : undefined,
      recurrence_end_date: endDate || undefined
    };

    onSave(recurringData);
  };

  const getRecurrenceDescription = () => {
    if (pattern === "daily") return "Every day";
    if (pattern === "weekly") {
      if (selectedDays.length === 0) return "Select days";
      const dayLabels = selectedDays.map(d => DAYS_OF_WEEK.find(day => day.value === d)?.label);
      return `Every ${dayLabels.join(", ")}`;
    }
    if (pattern === "biweekly") return "Every 2 weeks";
    if (pattern === "monthly") return "Every month";
    if (pattern === "custom") return `Every ${interval} days`;
    return "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple-600" />
            Set Up Recurring Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Repeat Pattern</Label>
            <Select value={pattern} onValueChange={setPattern}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 Weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="custom">Custom Interval</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {pattern === "custom" && (
            <div className="space-y-2">
              <Label>Repeat every X days</Label>
              <Input
                type="number"
                min="1"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                placeholder="Number of days"
              />
            </div>
          )}

          {pattern === "weekly" && (
            <div className="space-y-2">
              <Label>Repeat on</Label>
              <div className="flex gap-2 flex-wrap">
                {DAYS_OF_WEEK.map(day => (
                  <Badge
                    key={day.value}
                    variant={selectedDays.includes(day.value) ? "default" : "outline"}
                    className={`cursor-pointer ${
                      selectedDays.includes(day.value)
                        ? "bg-purple-600 text-white"
                        : "hover:bg-purple-50"
                    }`}
                    onClick={() => handleToggleDay(day.value)}
                  >
                    {day.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>End Date (Optional)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Leave blank for no end date"
            />
            <p className="text-xs text-gray-500">
              Leave blank to repeat indefinitely
            </p>
          </div>

          <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Repeat className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Preview</span>
            </div>
            <p className="text-sm text-purple-700">{getRecurrenceDescription()}</p>
            {endDate && (
              <p className="text-xs text-purple-600 mt-1">
                Until {new Date(endDate).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={pattern === "weekly" && selectedDays.length === 0}
            className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Set Recurring
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}