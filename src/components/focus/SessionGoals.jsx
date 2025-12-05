import React from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Target, Clock, CheckSquare, Zap } from "lucide-react";

const goalTypes = [
  { 
    id: "subtasks", 
    label: "Complete Subtasks", 
    icon: CheckSquare, 
    color: "purple",
    description: "Set a target number of steps to complete"
  },
  { 
    id: "time", 
    label: "Focus Time", 
    icon: Clock, 
    color: "teal",
    description: "Set a target duration to stay focused"
  },
  { 
    id: "pomodoros", 
    label: "Pomodoros", 
    icon: Target, 
    color: "orange",
    description: "Complete a set number of pomodoro cycles"
  }
];

export default function SessionGoals({ 
  selectedGoal, 
  setSelectedGoal, 
  goalValue, 
  setGoalValue,
  maxSubtasks,
  focusTechnique 
}) {
  const filteredGoalTypes = goalTypes.filter(g => {
    if (g.id === "pomodoros" && focusTechnique !== "pomodoro") return false;
    return true;
  });

  return (
    <div className="space-y-4 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
      <div className="flex items-center gap-2">
        <Target className="w-5 h-5 text-orange-600" />
        <Label className="text-base font-semibold">Session Goal (Optional)</Label>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {filteredGoalTypes.map((goal) => (
          <Button
            key={goal.id}
            variant={selectedGoal === goal.id ? "default" : "outline"}
            onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
            className={`flex flex-col items-start h-auto py-3 ${
              selectedGoal === goal.id 
                ? `bg-gradient-to-r from-${goal.color}-500 to-${goal.color}-600 text-white` 
                : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <goal.icon className="w-4 h-4" />
              <span className="font-medium">{goal.label}</span>
            </div>
          </Button>
        ))}
      </div>

      {selectedGoal && (
        <div className="space-y-2 pt-2">
          <Label className="text-sm text-gray-600">
            {selectedGoal === "subtasks" && `How many steps? (max ${maxSubtasks})`}
            {selectedGoal === "time" && "How many minutes?"}
            {selectedGoal === "pomodoros" && "How many pomodoros?"}
          </Label>
          <div className="flex gap-2">
            {selectedGoal === "subtasks" && (
              <>
                {[1, 2, 3, Math.min(5, maxSubtasks)].filter((v, i, a) => a.indexOf(v) === i && v <= maxSubtasks).map(num => (
                  <Button
                    key={num}
                    variant={goalValue === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGoalValue(num)}
                    className={goalValue === num ? "bg-purple-500" : ""}
                  >
                    {num}
                  </Button>
                ))}
              </>
            )}
            {selectedGoal === "time" && (
              <>
                {[15, 30, 45, 60, 90].map(mins => (
                  <Button
                    key={mins}
                    variant={goalValue === mins ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGoalValue(mins)}
                    className={goalValue === mins ? "bg-teal-500" : ""}
                  >
                    {mins}m
                  </Button>
                ))}
              </>
            )}
            {selectedGoal === "pomodoros" && (
              <>
                {[1, 2, 3, 4, 5].map(num => (
                  <Button
                    key={num}
                    variant={goalValue === num ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGoalValue(num)}
                    className={goalValue === num ? "bg-orange-500" : ""}
                  >
                    {num} 🍅
                  </Button>
                ))}
              </>
            )}
          </div>
          
          {goalValue && (
            <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span>
                  Goal: {selectedGoal === "subtasks" && `Complete ${goalValue} step${goalValue > 1 ? 's' : ''}`}
                  {selectedGoal === "time" && `Focus for ${goalValue} minutes`}
                  {selectedGoal === "pomodoros" && `Complete ${goalValue} pomodoro${goalValue > 1 ? 's' : ''}`}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}