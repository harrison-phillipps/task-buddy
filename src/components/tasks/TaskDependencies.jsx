import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Lock, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

export default function TaskDependencies({ 
  task, 
  allTasks = [],
  onNavigate 
}) {
  // Get blocking tasks (tasks this task depends on)
  const blockingTasks = (task.blocked_by || [])
    .map(id => allTasks.find(t => t.id === id))
    .filter(Boolean);
  
  // Get blocked tasks (tasks that depend on this task)
  const blockedTasks = allTasks.filter(t => 
    t.blocked_by?.includes(task.id)
  );
  
  const hasIncompleteBlockers = blockingTasks.some(t => t.status !== 'completed');
  const isBlocked = hasIncompleteBlockers && task.status !== 'completed';

  if (blockingTasks.length === 0 && blockedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-purple-600" />
          Task Dependencies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {blockingTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-orange-600" />
              <p className="text-sm font-medium text-gray-700">
                Blocked by:
              </p>
            </div>
            
            {isBlocked && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5" />
                <p className="text-sm text-orange-800">
                  Complete {blockingTasks.filter(t => t.status !== 'completed').length} task
                  {blockingTasks.filter(t => t.status !== 'completed').length !== 1 ? 's' : ''} before starting this one
                </p>
              </motion.div>
            )}

            <div className="space-y-2">
              {blockingTasks.map(blocker => (
                <div
                  key={blocker.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    blocker.status === 'completed'
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {blocker.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    )}
                    <span className={`text-sm truncate ${
                      blocker.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                    }`}>
                      {blocker.title}
                    </span>
                  </div>
                  {onNavigate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(blocker.id)}
                      className="ml-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {blockedTasks.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4 text-purple-600" />
              <p className="text-sm font-medium text-gray-700">
                Unlocks {blockedTasks.length} task{blockedTasks.length !== 1 ? 's' : ''}:
              </p>
            </div>
            <div className="space-y-2">
              {blockedTasks.slice(0, 3).map(blocked => (
                <div
                  key={blocked.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-purple-50 border border-purple-200"
                >
                  <span className="text-sm text-gray-800 truncate">{blocked.title}</span>
                  {onNavigate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(blocked.id)}
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
              {blockedTasks.length > 3 && (
                <p className="text-xs text-gray-500 text-center">
                  +{blockedTasks.length - 3} more
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}