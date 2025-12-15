import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Plus, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";

export default function TeamCalendar({ team, currentUser }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const queryClient = useQueryClient();

  const { data: teamTasks = [] } = useQuery({
    queryKey: ['teamTasks', team.id],
    queryFn: () => base44.entities.Task.filter({ team_id: team.id }),
    refetchInterval: 30000
  });

  const { data: collaborativeSessions = [] } = useQuery({
    queryKey: ['collaborativeSessions', team.id],
    queryFn: () => base44.entities.CollaborativeFocusSession.filter({ team_id: team.id }),
    refetchInterval: 10000
  });

  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['teamCalendarEvents', team.id],
    queryFn: () => base44.entities.CalendarEvent.filter({ team_id: team.id }),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getEventsForDate = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    const tasksForDate = teamTasks.filter(task => 
      task.due_date && format(parseISO(task.due_date), 'yyyy-MM-dd') === dateStr
    );

    const sessionsForDate = collaborativeSessions.filter(session => 
      session.status === 'active' && 
      session.started_at && 
      format(parseISO(session.started_at), 'yyyy-MM-dd') === dateStr
    );

    const eventsForDate = calendarEvents.filter(event =>
      event.start_date && format(parseISO(event.start_date), 'yyyy-MM-dd') === dateStr
    );

    return { tasks: tasksForDate, sessions: sessionsForDate, events: eventsForDate };
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Team Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day, index) => {
            const { tasks, sessions, events } = getEventsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={index}
                className={`p-3 rounded-lg border ${
                  isToday 
                    ? 'bg-purple-50 border-purple-300' 
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="text-xs font-medium text-gray-500">
                    {format(day, 'EEE')}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? 'text-purple-600' : 'text-gray-900'}`}>
                    {format(day, 'd')}
                  </div>
                </div>
                
                <div className="space-y-1">
                  {tasks.length > 0 && (
                    <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {sessions.length > 0 && (
                    <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1">
                      <Play className="w-3 h-3" />
                      {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                    </div>
                  )}
                  {events.length > 0 && (
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {events.length} event{events.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Date Details */}
        <div className="mt-4 pt-4 border-t">
          <h4 className="font-semibold text-sm mb-3">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h4>
          {(() => {
            const { tasks, sessions, events } = getEventsForDate(selectedDate);
            if (tasks.length === 0 && sessions.length === 0 && events.length === 0) {
              return <p className="text-sm text-gray-500">No events scheduled</p>;
            }
            
            return (
              <div className="space-y-2">
                {tasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                    <span className="text-sm font-medium">{task.title}</span>
                    <Badge variant="outline">Due</Badge>
                  </div>
                ))}
                {sessions.map(session => (
                  <div key={session.id} className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span className="text-sm font-medium">{session.task_title}</span>
                    <Badge className="bg-green-600 text-white">
                      <Users className="w-3 h-3 mr-1" />
                      Session
                    </Badge>
                  </div>
                ))}
                {events.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <span className="text-sm font-medium">{event.title}</span>
                    <span className="text-xs text-gray-600">{event.start_time}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </CardContent>
    </Card>
  );
}