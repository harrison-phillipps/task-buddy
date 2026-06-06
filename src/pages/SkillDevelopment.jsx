import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, BookOpen, TrendingUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import SkillTracker from "../components/skills/SkillTracker";
// SkillAnalyzer hidden (simplification)
import LearningPathCreator from "../components/skills/LearningPathCreator";
import LearningPathViewer from "../components/skills/LearningPathViewer";

export default function SkillDevelopment() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showPathCreator, setShowPathCreator] = useState(false);

  React.useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Task.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.Goal.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const handleCreatePath = (skill) => {
    setSelectedSkill(skill);
    setShowPathCreator(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-teal-50 to-blue-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent mb-2">
            Skill Development
          </h1>
          <p className="text-gray-600">
            Track your skills, create learning paths, and level up your capabilities
          </p>
        </motion.div>

        {/* SkillAnalyzer hidden (simplification) */}

        {/* Main Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="skills" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="skills" className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                My Skills
              </TabsTrigger>
              <TabsTrigger value="paths" className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Learning Paths
              </TabsTrigger>
            </TabsList>

            <TabsContent value="skills">
              <SkillTracker onCreatePath={handleCreatePath} />
            </TabsContent>

            <TabsContent value="paths">
              <LearningPathViewer />
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Learning Path Creator Modal */}
      {selectedSkill && (
        <LearningPathCreator
          skill={selectedSkill}
          open={showPathCreator}
          onOpenChange={setShowPathCreator}
          onCreated={() => {
            setShowPathCreator(false);
            setSelectedSkill(null);
          }}
        />
      )}
    </div>
  );
}