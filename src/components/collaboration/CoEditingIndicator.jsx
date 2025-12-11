import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function CoEditingIndicator({ task, currentUser, onEditStart, onEditEnd }) {
  const [isEditing, setIsEditing] = useState(false);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
  });

  useEffect(() => {
    if (isEditing) {
      // Store editing state
      updateTaskMutation.mutate({
        id: task.id,
        data: {
          currently_editing_by: currentUser.id,
          currently_editing_name: currentUser.full_name,
          last_edited_at: new Date().toISOString()
        }
      });
      onEditStart?.();
    } else {
      // Clear editing state
      if (task.currently_editing_by === currentUser.id) {
        updateTaskMutation.mutate({
          id: task.id,
          data: {
            currently_editing_by: null,
            currently_editing_name: null
          }
        });
      }
      onEditEnd?.();
    }

    return () => {
      if (isEditing && task.currently_editing_by === currentUser.id) {
        updateTaskMutation.mutate({
          id: task.id,
          data: {
            currently_editing_by: null,
            currently_editing_name: null
          }
        });
      }
    };
  }, [isEditing]);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const isOtherUserEditing = task.currently_editing_by && 
                              task.currently_editing_by !== currentUser.id;

  return (
    <>
      {/* Show who is currently editing */}
      <AnimatePresence>
        {isOtherUserEditing && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <Avatar className="w-6 h-6">
              <AvatarFallback className="bg-yellow-400 text-white text-xs">
                {getInitials(task.currently_editing_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-1 text-xs text-yellow-800">
              <Edit3 className="w-3 h-3" />
              <span><strong>{task.currently_editing_name}</strong> is editing this task</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden controller for parent components */}
      <input
        type="hidden"
        data-is-editing={isEditing}
        data-set-editing={(value) => setIsEditing(value)}
      />
    </>
  );
}

// Hook version for easier use
export function useCoEditing(task, currentUser) {
  const [isEditing, setIsEditing] = useState(false);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
  });

  const startEditing = () => {
    setIsEditing(true);
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        currently_editing_by: currentUser.id,
        currently_editing_name: currentUser.full_name,
        last_edited_at: new Date().toISOString()
      }
    });
  };

  const stopEditing = () => {
    setIsEditing(false);
    if (task.currently_editing_by === currentUser.id) {
      updateTaskMutation.mutate({
        id: task.id,
        data: {
          currently_editing_by: null,
          currently_editing_name: null
        }
      });
    }
  };

  useEffect(() => {
    return () => {
      if (isEditing && task.currently_editing_by === currentUser.id) {
        updateTaskMutation.mutate({
          id: task.id,
          data: {
            currently_editing_by: null,
            currently_editing_name: null
          }
        });
      }
    };
  }, []);

  const isOtherUserEditing = task.currently_editing_by && 
                              task.currently_editing_by !== currentUser.id;

  return {
    isEditing,
    startEditing,
    stopEditing,
    isOtherUserEditing,
    otherEditorName: task.currently_editing_name
  };
}