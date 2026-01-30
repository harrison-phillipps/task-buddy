import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function SkillAnalyzer({ tasks = [], goals = [], onAnalysisComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeSkills = async () => {
    setIsAnalyzing(true);
    try {
      const user = await base44.auth.me();
      
      // Get existing skills to avoid duplicates
      const existingSkills = await base44.entities.Skill.filter({ 
        created_by: user.email 
      });

      const taskSummary = tasks.map(t => ({
        title: t.title,
        category: t.category,
        difficulty: t.difficulty,
        description: t.description
      }));

      const goalSummary = goals.map(g => ({
        title: g.title,
        type: g.type,
        description: g.description
      }));

      const prompt = `You are a career development AI analyzing a user's work patterns.

EXISTING SKILLS: ${existingSkills.map(s => s.name).join(", ") || "None"}

TASKS COMPLETED/IN PROGRESS:
${JSON.stringify(taskSummary.slice(0, 20), null, 2)}

GOALS:
${JSON.stringify(goalSummary, null, 2)}

USER PROFILE:
- Career aspirations: ${user.onboarding_data?.career_goals || "Not specified"}
- Work style: ${user.onboarding_data?.work_style || "Not specified"}

Based on their tasks and goals, identify:
1. **Emerging Skills**: Skills they're actively developing (only NEW skills not in existing list)
2. **Skill Gaps**: Skills they need to achieve their goals
3. **High-Impact Skills**: Skills with highest career value
4. **Recommendations**: Why each skill matters and how to develop it

Return 4-6 skills maximum. Be specific (e.g., "React Development" not just "Programming").
Focus on skills that align with their actual work and stated goals.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            identified_skills: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  category: { 
                    type: "string",
                    enum: ["technical", "creative", "business", "communication", "leadership", "personal", "design", "data", "other"]
                  },
                  current_level: {
                    type: "string",
                    enum: ["beginner", "intermediate", "advanced", "expert"]
                  },
                  importance_score: { 
                    type: "number",
                    description: "0-100 score"
                  },
                  reason: { type: "string" },
                  development_suggestion: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      // Create new skills
      const skillsCreated = [];
      for (const skill of result.identified_skills) {
        // Check if skill already exists
        const exists = existingSkills.some(
          s => s.name.toLowerCase() === skill.name.toLowerCase()
        );
        
        if (!exists) {
          const newSkill = await base44.entities.Skill.create({
            name: skill.name,
            category: skill.category,
            level: skill.current_level,
            importance_score: skill.importance_score,
            is_ai_suggested: true
          });
          skillsCreated.push(newSkill);
        }
      }

      toast.success(`Identified ${skillsCreated.length} new skills!`);
      
      if (onAnalysisComplete) {
        onAnalysisComplete({
          skills: result.identified_skills,
          summary: result.summary
        });
      }

    } catch (error) {
      console.error("Error analyzing skills:", error);
      toast.error("Failed to analyze skills");
    }
    setIsAnalyzing(false);
  };

  return (
    <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-teal-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">
              AI Skill Analysis
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Analyze your tasks and goals to identify skills you're developing and gaps you should fill
            </p>
            <Button
              onClick={analyzeSkills}
              disabled={isAnalyzing || tasks.length === 0}
              className="bg-gradient-to-r from-purple-600 to-teal-600 hover:from-purple-700 hover:to-teal-700 text-white"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze My Skills
                </>
              )}
            </Button>
            {tasks.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Complete some tasks first to get skill insights
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}