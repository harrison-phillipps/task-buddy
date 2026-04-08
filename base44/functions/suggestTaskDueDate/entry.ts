import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { addDays, startOfDay, endOfDay, differenceInDays } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, priority, difficulty, estimatedMinutes } = await req.json();

    // Fetch user's completed tasks
    const completedTasks = await base44.entities.Task.filter({
      created_by: user.email,
      status: 'completed'
    });

    // Fetch calendar events to find free slots
    const calendarEvents = await base44.entities.CalendarEvent.filter({
      created_by: user.email
    });

    // Fetch focus sessions for completion time patterns
    const focusSessions = await base44.entities.FocusSession.filter({
      completed: true
    }, '-created_date', 30);

    // Calculate average completion time based on difficulty
    const avgCompletionDays = calculateAvgCompletionDays(completedTasks, difficulty, estimatedMinutes);
    
    // Get priority-based buffer days
    const bufferDays = getPriorityBuffer(priority);
    
    // Find the next available free slot in calendar
    const nextAvailableDate = findNextAvailableDate(calendarEvents, avgCompletionDays + bufferDays);

    // Alternative suggestions: conservative and aggressive dates
    const suggestions = [
      {
        date: nextAvailableDate,
        reason: 'Based on your completion patterns',
        confidence: 'high',
        label: 'Recommended'
      },
      {
        date: addDays(nextAvailableDate, -Math.max(1, Math.floor(bufferDays / 2))),
        reason: 'Optimistic estimate if you prioritize this',
        confidence: 'medium',
        label: 'Aggressive'
      },
      {
        date: addDays(nextAvailableDate, Math.ceil(bufferDays / 2)),
        reason: 'Conservative estimate with buffer',
        confidence: 'high',
        label: 'Safe'
      }
    ];

    return Response.json({
      suggestions: suggestions.map(s => ({
        ...s,
        date: s.date.toISOString().split('T')[0]
      })),
      analysis: {
        avgCompletionDays,
        bufferDays,
        estimatedMinutes,
        difficulty
      }
    });
  } catch (error) {
    console.error('Error suggesting due date:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function calculateAvgCompletionDays(tasks, difficulty, estimatedMinutes) {
  if (!tasks || tasks.length === 0) {
    // Default estimates if no history
    const difficultyDays = { easy: 1, medium: 3, hard: 7 };
    return (difficultyDays[difficulty] || 3) + Math.ceil(estimatedMinutes / 480);
  }

  const similarTasks = tasks.filter(t => t.difficulty === difficulty);
  if (similarTasks.length === 0) {
    return 3;
  }

  const avgDays = similarTasks.reduce((sum, task) => {
    const created = new Date(task.created_date);
    const updated = new Date(task.updated_date);
    const days = differenceInDays(updated, created);
    return sum + Math.max(1, days);
  }, 0) / similarTasks.length;

  return Math.ceil(avgDays);
}

function getPriorityBuffer(priority) {
  const buffers = {
    urgent: 0,
    high: 1,
    medium: 2,
    low: 3
  };
  return buffers[priority] || 2;
}

function findNextAvailableDate(events, daysNeeded) {
  let checkDate = addDays(new Date(), 1);
  let consecutiveFreeeDays = 0;

  for (let i = 0; i < 60; i++) {
    const dayStart = startOfDay(checkDate);
    const dayEnd = endOfDay(checkDate);

    const dayHasEvent = events.some(event => {
      const eventDate = new Date(event.start_date);
      return differenceInDays(eventDate, dayStart) === 0;
    });

    if (!dayHasEvent) {
      consecutiveFreeeDays++;
      if (consecutiveFreeeDays >= daysNeeded) {
        return checkDate;
      }
    } else {
      consecutiveFreeeDays = 0;
    }

    checkDate = addDays(checkDate, 1);
  }

  return addDays(new Date(), daysNeeded);
}