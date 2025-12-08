import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

const AVAILABLE_WIDGETS = [
  { id: 'stats', name: 'Statistics', description: 'Completed tasks, in progress, time focused' },
  { id: 'quickAdd', name: 'Quick Add Task', description: 'Add tasks directly from dashboard' },
  { id: 'goalsProgress', name: 'Goals Progress', description: 'Visual progress of your goals' },
  { id: 'weeklyOverview', name: 'Weekly Overview', description: 'Your week at a glance' },
  { id: 'aiPrioritization', name: 'AI Task Suggestions', description: 'Smart task recommendations' },
  { id: 'companion', name: 'Virtual Companion', description: 'Your motivational buddy' },
];

export default function WidgetCustomizer({ visibleWidgets, onToggleWidget }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Settings2 className="w-4 h-4" />
          Customize Dashboard
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-purple-600" />
            Customize Your Dashboard
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600">
            Choose which widgets you want to see on your dashboard
          </p>
          <div className="grid gap-3">
            {AVAILABLE_WIDGETS.map((widget) => (
              <motion.div
                key={widget.id}
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Card className={`cursor-pointer transition-all ${
                  visibleWidgets[widget.id] 
                    ? 'border-purple-300 bg-purple-50' 
                    : 'border-gray-200'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={widget.id}
                        checked={visibleWidgets[widget.id]}
                        onCheckedChange={() => onToggleWidget(widget.id)}
                        className="mt-1"
                      />
                      <div className="flex-1" onClick={() => onToggleWidget(widget.id)}>
                        <Label
                          htmlFor={widget.id}
                          className="font-semibold text-gray-900 cursor-pointer flex items-center gap-2"
                        >
                          {widget.name}
                          {visibleWidgets[widget.id] ? (
                            <Eye className="w-4 h-4 text-purple-600" />
                          ) : (
                            <EyeOff className="w-4 h-4 text-gray-400" />
                          )}
                        </Label>
                        <p className="text-sm text-gray-600 mt-1">{widget.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}