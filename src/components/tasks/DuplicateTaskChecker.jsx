import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function DuplicateTaskChecker({ 
  open, 
  onOpenChange, 
  duplicates, 
  newTaskTitle,
  onProceed, 
  onSkipDuplicates,
  onCancel 
}) {
  if (!duplicates || duplicates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="w-5 h-5" />
            Similar Tasks Found
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-700">
            We found <span className="font-semibold">{duplicates.length}</span> similar task{duplicates.length > 1 ? 's' : ''} that might be related to:
          </p>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
            <p className="font-semibold text-purple-900">{newTaskTitle}</p>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {duplicates.map((task, index) => (
              <div 
                key={task.id || index}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-2">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Badge 
                        className={
                          task.status === 'completed' ? 'bg-green-100 text-green-700' :
                          task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }
                      >
                        {task.status === 'completed' ? '✓ Completed' :
                         task.status === 'in_progress' ? '🔄 In Progress' :
                         '⏸️ Not Started'}
                      </Badge>
                      {task.category && (
                        <Badge variant="outline">{task.category}</Badge>
                      )}
                      {task.estimated_minutes && (
                        <Badge variant="outline">{task.estimated_minutes}m</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              💡 <span className="font-semibold">Tip:</span> Creating duplicate tasks can clutter your workflow. 
              Consider updating an existing task instead, or cancel and check your tasks list.
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onCancel}
            className="sm:flex-1"
          >
            Cancel
          </Button>
          {onSkipDuplicates && (
            <Button
              variant="outline"
              onClick={onSkipDuplicates}
              className="sm:flex-1 border-teal-300 text-teal-700 hover:bg-teal-50"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Save (Skip Duplicates)
            </Button>
          )}
          <Button
            onClick={onProceed}
            className="sm:flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            Save All Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}