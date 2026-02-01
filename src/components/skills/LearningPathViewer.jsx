import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle, ExternalLink, Calendar, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function LearningPathViewer() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    const fetchUser = async () => {
      const user = await base44.auth.me();
      setCurrentUser(user);
    };
    fetchUser();
  }, []);

  const { data: paths = [] } = useQuery({
    queryKey: ['learning-paths', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      return await base44.entities.LearningPath.filter({ created_by: currentUser.email });
    },
    enabled: !!currentUser
  });

  const updatePathMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LearningPath.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-paths'] });
    }
  });

  const toggleMilestone = (path, milestoneIndex) => {
    const updatedMilestones = [...path.milestones];
    updatedMilestones[milestoneIndex].completed = !updatedMilestones[milestoneIndex].completed;
    
    if (updatedMilestones[milestoneIndex].completed) {
      updatedMilestones[milestoneIndex].completed_date = new Date().toISOString();
    } else {
      delete updatedMilestones[milestoneIndex].completed_date;
    }

    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progress = (completedCount / updatedMilestones.length) * 100;
    const allCompleted = completedCount === updatedMilestones.length;

    updatePathMutation.mutate({
      id: path.id,
      data: {
        milestones: updatedMilestones,
        progress_percentage: progress,
        status: allCompleted ? 'completed' : progress > 0 ? 'in_progress' : 'not_started',
        ...(allCompleted && !path.completed_date ? { completed_date: new Date().toISOString() } : {}),
        ...(progress > 0 && !path.started_date ? { started_date: new Date().toISOString() } : {})
      }
    });
  };

  const activePaths = paths.filter(p => p.status !== 'completed');
  const completedPaths = paths.filter(p => p.status === 'completed');

  return (
    <div className="space-y-6">
      {activePaths.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Learning Paths</h3>
          <div className="space-y-4">
            {activePaths.map((path, index) => (
              <motion.div
                key={path.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="border-purple-200 dark:border-purple-700 dark:bg-gray-800">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          {path.title}
                        </CardTitle>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{path.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <Badge variant="outline" className="bg-purple-50">
                        {path.skill_name}
                      </Badge>
                      <Badge variant="outline">
                        {path.estimated_weeks} weeks
                      </Badge>
                      {path.started_date && (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <Calendar className="w-3 h-3" />
                          Started {new Date(path.started_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-600 dark:text-gray-400">Progress</span>
                        <span className="font-semibold text-purple-700 dark:text-purple-400">
                          {Math.round(path.progress_percentage || 0)}%
                        </span>
                      </div>
                      <Progress value={path.progress_percentage || 0} className="h-2" />
                    </div>
                  </CardHeader>

                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      {path.milestones?.map((milestone, idx) => (
                        <AccordionItem key={idx} value={`milestone-${idx}`}>
                          <AccordionTrigger className="hover:no-underline">
                            <div className="flex items-center gap-3 text-left">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                                milestone.completed 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-gray-200 text-gray-600'
                              }`}>
                                {milestone.completed ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <span className="text-xs font-bold">{idx + 1}</span>
                                )}
                              </div>
                              <span className={milestone.completed ? 'line-through text-gray-500 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'}>
                                {milestone.title}
                              </span>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="ml-9 space-y-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400">{milestone.description}</p>

                              {milestone.resources?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Resources:</p>
                                  <div className="space-y-2">
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
                                </div>
                              )}

                              {milestone.practice_tasks?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase mb-2">Practice Tasks:</p>
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

                              <Button
                                size="sm"
                                variant={milestone.completed ? "outline" : "default"}
                                onClick={() => toggleMilestone(path, idx)}
                                className={milestone.completed ? "" : "bg-green-600 hover:bg-green-700 text-white"}
                              >
                                {milestone.completed ? (
                                  <>Mark Incomplete</>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Mark Complete
                                  </>
                                )}
                              </Button>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {completedPaths.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Completed Paths
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedPaths.map((path) => (
              <Card key={path.id} className="border-green-200 dark:border-green-700 bg-green-50/50 dark:bg-green-900/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100">{path.title}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{path.skill_name}</p>
                      {path.completed_date && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Completed {new Date(path.completed_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {paths.length === 0 && (
        <Card className="border-dashed border-2 border-purple-200 dark:border-purple-700">
          <CardContent className="p-8 text-center">
            <BookOpen className="w-12 h-12 text-purple-400 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-2">No learning paths yet</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Analyze your skills and create personalized learning paths to track your development
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}