import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

export default function AITaskBreakdownConsentModal({
  open,
  onOpenChange,
  onAgree,
  onNotNow,
  isSaving = false,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            We use AI to help break down your tasks
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2 text-sm text-gray-700 dark:text-gray-300">
              <p>
                When you use task breakdown, TaskBuddy sends your task title,
                description, category, difficulty, energy level, and mood
                (whichever you've filled in) to Anthropic, the company that
                makes the Claude AI model, so it can generate step-by-step
                suggestions.
              </p>
              <p>
                We don't send your name, email, or any other tasks — just the
                one task you're breaking down.
              </p>
              <p>
                Anthropic doesn't use this data to train its AI models under our
                agreement with them.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onNotNow}
            disabled={isSaving}
            className="sm:flex-1"
          >
            Not Now
          </Button>
          <Button
            onClick={onAgree}
            disabled={isSaving}
            className="sm:flex-1 bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-2" />
            )}
            I Agree — Turn on AI Task Breakdown
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}