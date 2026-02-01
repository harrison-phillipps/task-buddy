import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, BookOpen, CheckCircle, ExternalLink, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function LearningPathCreator({ skill, open, onOpenChange, onCreated }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPath, setGeneratedPath] = useState(null);

  React.useEffect(() => {
    if (open && skill && !generatedPath) {
      generatePath();
    }
  }, [open, skill]);

  const generatePath = async () => {
    setIsGenerating(true);
    try {
      const user = await base44.auth.me();

      const prompt = `Create a personalized learning path for developing "${skill.name}" skill.

CURRENT CONTEXT:
- User's current level: ${skill.level}
- Target level: ${skill.target_level || "advanced"}
- Category: ${skill.category}
- User's work style: ${user.onboarding_data?.work_style || "flexible"}

Create a structured learning path with:
1. **3-5 Milestones**: Progressive steps from current to target level
2. **Learning Resources**: For each milestone, suggest 2-3 specific, real resources (courses, books, videos, articles)
3. **Practice Tasks**: Concrete mini-projects or exercises for each milestone
4. **Estimated Timeline**: Realistic time estimates considering ADHD-friendly pacing

Make it actionable, specific, and achievable. Include real resources when possible (Coursera, Udemy, YouTube channels, books, etc.).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            path_title: { type: "string" },
            path_description: { type: "string" },
            estimated_weeks: { type: "number" },
            milestones: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  resources: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        type: { 
                          type: "string",
                          enum: ["course", "book", "video", "article", "practice", "documentation"]
                        },
                        url: { type: "string" },
                        duration: { type: "string" }
                      }
                    }
                  },
                  practice_tasks: {
                    type: "array",
                    items: { type: "string" }
                  },
                  completed: { type: "boolean" }
                }
              }
            }
          }
        }
      });

      setGeneratedPath(result);
    } catch (error) {
      console.error("Error generating path:", error);
      toast.error("Failed to generate learning path");
    }
    setIsGenerating(false);
  };

  const savePath = async () => {
    if (!generatedPath) return;

    try {
      const path = await base44.entities.LearningPath.create({
        title: generatedPath.path_title,
        description: generatedPath.path_description,
        skill_id: skill.id,
        skill_name: skill.name,
        current_level: skill.level,
        target_level: skill.target_level || "advanced",
        milestones: generatedPath.milestones.map(m => ({
          ...m,
          completed: false
        })),
        estimated_weeks: generatedPath.estimated_weeks,
        status: "not_started",
        is_ai_generated: true
      });

      toast.success("Learning path created!");
      if (onCreated) onCreated(path);
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving path:", error);
      toast.error("Failed to save learning path");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            Learning Path: {skill?.name}
          </DialogTitle>
        </DialogHeader>

        {isGenerating ? (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Creating your personalized learning path...</p>
            <p className="text-sm text-gray-600 mt-2">This may take a moment</p>
          </div>
        ) : generatedPath ? (
          <div className="space-y-6">
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                {generatedPath.path_title}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                {generatedPath.path_description}
              </p>
              <div className="flex items-center gap-4 text-sm">
                <Badge variant="outline" className="bg-white">
                  {generatedPath.estimated_weeks} weeks
                </Badge>
                <Badge variant="outline" className="bg-white">
                  {generatedPath.milestones.length} milestones
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {generatedPath.milestones.map((milestone, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{milestone.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{milestone.description}</p>
                    </div>
                  </div>

                  {milestone.resources?.length > 0 && (
                    <div className="ml-11 space-y-2 mb-3">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Resources:</p>
                      {milestone.resources.map((resource, ridx) => (
                        <div key={ridx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            <span className="text-sm text-gray-900 dark:text-gray-100">{resource.title}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {resource.duration && (
                              <span className="text-xs text-gray-600 dark:text-gray-400">{resource.duration}</span>
                            )}
                            {resource.url && (
                              <a 
                                href={resource.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:text-purple-700"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {milestone.practice_tasks?.length > 0 && (
                    <div className="ml-11">
                      <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Practice:</p>
                      <ul className="space-y-1">
                        {milestone.practice_tasks.map((task, tidx) => (
                          <li key={tidx} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2">
                            <span className="text-purple-500 dark:text-purple-400 mt-0.5">→</span>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={savePath}
                className="flex-1 bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Start This Path
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}