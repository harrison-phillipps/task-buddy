import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, Award, Plus, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const levelColors = {
  beginner: "bg-blue-100 text-blue-700 border-blue-200",
  intermediate: "bg-purple-100 text-purple-700 border-purple-200",
  advanced: "bg-orange-100 text-orange-700 border-orange-200",
  expert: "bg-green-100 text-green-700 border-green-200"
};

const categoryIcons = {
  technical: "💻",
  creative: "🎨",
  business: "💼",
  communication: "💬",
  leadership: "👥",
  personal: "🌟",
  design: "✨",
  data: "📊",
  other: "🔧"
};

export default function SkillTracker({ onCreatePath }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: skills = [], isLoading } = useQuery({
    queryKey: ['skills', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Skill.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const updateSkillMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Skill.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    }
  });

  const practiceSkill = (skill) => {
    updateSkillMutation.mutate({
      id: skill.id,
      data: {
        practice_count: (skill.practice_count || 0) + 1,
        last_practiced: new Date().toISOString()
      }
    });
  };

  const getLevelProgress = (currentLevel) => {
    const levels = { beginner: 25, intermediate: 50, advanced: 75, expert: 100 };
    return levels[currentLevel] || 0;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-600">Loading skills...</p>
        </CardContent>
      </Card>
    );
  }

  const sortedSkills = [...skills].sort((a, b) => 
    (b.importance_score || 0) - (a.importance_score || 0)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Your Skills</h3>
          <p className="text-sm text-gray-600">Track and develop your capabilities</p>
        </div>
        <Badge variant="outline" className="bg-purple-50 text-purple-700">
          {skills.length} {skills.length === 1 ? 'skill' : 'skills'}
        </Badge>
      </div>

      {skills.length === 0 ? (
        <Card className="border-dashed border-2 border-purple-200 dark:border-purple-700">
          <CardContent className="p-8 text-center">
            <Brain className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">No skills tracked yet</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AI will automatically identify skills as you work on tasks
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedSkills.map((skill, index) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-all duration-200 dark:bg-gray-800 dark:border-gray-700">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{categoryIcons[skill.category]}</span>
                      <div>
                        <CardTitle className="text-base font-semibold text-gray-900 dark:text-gray-100">
                          {skill.name}
                        </CardTitle>
                        <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">{skill.category}</p>
                      </div>
                    </div>
                    {skill.is_ai_suggested && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Current Level</span>
                    <Badge className={`${levelColors[skill.level]} border font-medium`}>
                      {skill.level}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Progress to {skill.target_level || 'next level'}</span>
                      <span>{getLevelProgress(skill.level)}%</span>
                    </div>
                    <Progress value={getLevelProgress(skill.level)} className="h-2" />
                  </div>

                  {skill.practice_count > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Practiced {skill.practice_count} times</span>
                      </div>
                      {skill.last_practiced && (
                        <span>
                          Last: {new Date(skill.last_practiced).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => practiceSkill(skill)}
                      className="flex-1"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Log Practice
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => onCreatePath && onCreatePath(skill)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Award className="w-3 h-3 mr-1" />
                      Create Path
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}