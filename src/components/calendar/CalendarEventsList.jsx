import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Link2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

const sourceColors = {
  manual: "bg-gray-100 text-gray-700",
  task: "bg-purple-100 text-purple-700",
  google: "bg-blue-100 text-blue-700",
  outlook: "bg-cyan-100 text-cyan-700"
};

export default function CalendarEventsList({ 
  events = [], 
  onDelete,
  onConvertToTask,
  compact = false 
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-sm">
        No events scheduled
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event, index) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className={`p-3 rounded-lg border ${
            event.source === 'task' ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color || '#8B5CF6' }}
                />
                <p className="font-medium text-gray-900 truncate">{event.title}</p>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.start_time || '00:00'} - {event.end_time || '00:00'}
                </span>
                {event.duration_minutes && (
                  <span>({event.duration_minutes}m)</span>
                )}
                <Badge className={`text-[10px] ${sourceColors[event.source] || sourceColors.manual}`}>
                  {event.source}
                </Badge>
              </div>

              {!compact && event.description && (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{event.description}</p>
              )}
            </div>

            <div className="flex items-center gap-1">
              {event.source !== 'task' && onConvertToTask && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-purple-600"
                  onClick={() => onConvertToTask(event)}
                  title="Convert to task"
                >
                  <Link2 className="w-3 h-3" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-600"
                  onClick={() => onDelete(event.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}