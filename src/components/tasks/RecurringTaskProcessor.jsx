import React from "react";
import { base44 } from "@/api/base44Client";
import { addDays, addWeeks, addMonths, parseISO, format, startOfDay, isBefore } from "date-fns";

/**
 * Process recurring tasks and generate new instances
 */
export async function processRecurringTasks(userId) {
  try {
    const allTasks = await base44.entities.Task.list();
    const recurringTasks = allTasks.filter(t => 
      t.is_recurring && 
      t.recurrence_pattern !== 'none' &&
      !t.parent_recurring_task_id && // Only process templates, not instances
      t.created_by === userId
    );

    const today = startOfDay(new Date());
    const newInstances = [];

    for (const template of recurringTasks) {
      const nextOccurrence = template.next_occurrence_date 
        ? parseISO(template.next_occurrence_date)
        : today;

      // Check if we need to create a new instance
      if (isBefore(nextOccurrence, today) || format(nextOccurrence, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
        // Check if end date has passed
        if (template.recurrence_end_date && isBefore(parseISO(template.recurrence_end_date), today)) {
          continue;
        }

        // Check if instance already exists for this date
        const existingInstance = allTasks.find(t => 
          t.parent_recurring_task_id === template.id &&
          t.due_date === format(nextOccurrence, 'yyyy-MM-dd')
        );

        if (!existingInstance) {
          // Create new task instance
          const newTask = {
            title: template.title,
            description: template.description,
            category: template.category,
            difficulty: template.difficulty,
            priority: template.priority,
            energy_level_needed: template.energy_level_needed,
            estimated_minutes: template.estimated_minutes,
            subtasks: template.subtasks || [],
            status: 'not_started',
            due_date: format(nextOccurrence, 'yyyy-MM-dd'),
            parent_recurring_task_id: template.id,
            is_recurring: false, // Instance is not recurring itself
            team_id: template.team_id
          };

          newInstances.push(newTask);
        }

        // Calculate next occurrence
        const nextDate = calculateNextOccurrence(nextOccurrence, template);
        
        // Update template with next occurrence date
        await base44.entities.Task.update(template.id, {
          next_occurrence_date: format(nextDate, 'yyyy-MM-dd')
        });
      }
    }

    // Bulk create new instances
    if (newInstances.length > 0) {
      await base44.entities.Task.bulkCreate(newInstances);
    }

    return newInstances.length;
  } catch (error) {
    console.error("Error processing recurring tasks:", error);
    return 0;
  }
}

function calculateNextOccurrence(currentDate, template) {
  const { recurrence_pattern, recurrence_interval, recurrence_days } = template;

  switch (recurrence_pattern) {
    case 'daily':
      return addDays(currentDate, recurrence_interval || 1);
    
    case 'weekly':
      if (recurrence_days && recurrence_days.length > 0) {
        // Find next day of week
        let nextDate = addDays(currentDate, 1);
        while (!recurrence_days.includes(nextDate.getDay())) {
          nextDate = addDays(nextDate, 1);
        }
        return nextDate;
      }
      return addWeeks(currentDate, 1);
    
    case 'biweekly':
      return addWeeks(currentDate, 2);
    
    case 'monthly':
      return addMonths(currentDate, 1);
    
    case 'custom':
      return addDays(currentDate, recurrence_interval || 1);
    
    default:
      return addDays(currentDate, 1);
  }
}