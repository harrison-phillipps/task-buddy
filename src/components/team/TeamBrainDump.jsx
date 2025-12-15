import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Sparkles, Loader2, Trash2, CheckCircle, User, History, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";

export default function TeamBrainDump({ team, currentUser, members }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [ideas, setIdeas] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const { data: previousDumps = [] } = useQuery({
    queryKey: ['teamBrainDumps', team.id],
    queryFn: () => base44.entities.BrainDump.filter({ team_id: team.id }, '-created_date'),
  });

  const createTasksMutation = useMutation({
    mutationFn: (tasksData) => base44.entities.Task.bulkCreate(tasksData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleProcess = async () => {
    if (!input.trim()) return;

    setIsProcessing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract actionable tasks from this brain dump text. Return a JSON array of tasks.
        
Brain dump: ${input}

For each task, determine:
- title (brief, actionable)
- description (details if any)
- category (work/personal/health/creative/learning/household/other)
- difficulty (easy/medium/hard)
- estimated_minutes (realistic estimate)

Return ONLY valid JSON array, no markdown.`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  category: { type: "string" },
                  difficulty: { type: "string" },
                  estimated_minutes: { type: "number" }
                }
              }
            }
          }
        }
      });

      setIdeas(result.tasks.map((task, idx) => ({
        ...task,
        id: `temp-${idx}`,
        assigned_to: null,
        assigned_to_name: null
      })));
      toast.success(`Found ${result.tasks.length} tasks!`);
    } catch (error) {
      console.error("Error processing brain dump:", error);
      toast.error("Failed to process brain dump");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAssign = (ideaId, userId) => {
    const member = members.find(m => m.id === userId);
    setIdeas(prev => prev.map(idea => 
      idea.id === ideaId 
        ? { ...idea, assigned_to: userId, assigned_to_name: member?.full_name || member?.email }
        : idea
    ));
  };

  const handleRemove = (ideaId) => {
    setIdeas(prev => prev.filter(idea => idea.id !== ideaId));
  };

  const handleSaveAll = async () => {
    const tasksToCreate = ideas.map(idea => ({
      title: idea.title,
      description: idea.description || '',
      category: idea.category,
      difficulty: idea.difficulty,
      estimated_minutes: idea.estimated_minutes,
      status: 'not_started',
      team_id: team.id,
      assigned_to: idea.assigned_to,
      assigned_to_name: idea.assigned_to_name
    }));

    try {
      const createdTasks = await createTasksMutation.mutateAsync(tasksToCreate);
      
      // Save brain dump to history
      await base44.entities.BrainDump.create({
        content: input,
        tasks_created: tasksToCreate.length,
        task_ids: createdTasks.map(t => t.id),
        team_id: team.id
      });

      queryClient.invalidateQueries({ queryKey: ['teamBrainDumps'] });
      toast.success(`Created ${tasksToCreate.length} team tasks!`);
      setIdeas([]);
      setInput("");
    } catch (error) {
      console.error("Error creating tasks:", error);
      toast.error("Failed to create tasks");
    }
  };

  const loadPreviousDump = (dump) => {
    setInput(dump.content);
    setShowHistory(false);
    toast.success("Previous brain dump loaded!");
  };

  const categoryColors = {
    work: "bg-blue-100 text-blue-700",
    personal: "bg-purple-100 text-purple-700",
    health: "bg-green-100 text-green-700",
    creative: "bg-pink-100 text-pink-700",
    learning: "bg-yellow-100 text-yellow-700",
    household: "bg-orange-100 text-orange-700",
    other: "bg-gray-100 text-gray-700"
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="w-6 h-6 text-purple-600" />
                Team Brain Dump
              </CardTitle>
              <p className="text-sm text-gray-600">Dump all your team's ideas and let AI organize them into tasks</p>
            </div>
            {previousDumps.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                className="shrink-0"
              >
                <History className="w-4 h-4 mr-2" />
                History
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste all your team's tasks, ideas, and to-dos here... Just let it flow! No need to organize - AI will handle that."
            className="min-h-[150px] resize-none"
            disabled={isProcessing}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleProcess}
              disabled={!input.trim() || isProcessing}
              className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Extract Tasks
                </>
              )}
            </Button>
            {input && (
              <Button
                variant="outline"
                onClick={() => setInput("")}
                disabled={isProcessing}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {showHistory && previousDumps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Previous Team Brain Dumps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {previousDumps.map((dump) => (
                <motion.div
                  key={dump.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white border border-gray-200 rounded-lg hover:border-purple-300 transition-all cursor-pointer"
                  onClick={() => loadPreviousDump(dump)}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(dump.created_date), 'MMM d, yyyy h:mm a')}
                    </div>
                    <Badge variant="outline">{dump.tasks_created} tasks</Badge>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-3">{dump.content}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {ideas.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Extracted Tasks ({ideas.length})</CardTitle>
              <Button
                onClick={handleSaveAll}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Create All Tasks
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ideas.map((idea) => (
                <motion.div
                  key={idea.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-white border border-gray-200 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 mb-1">{idea.title}</h4>
                      {idea.description && (
                        <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={categoryColors[idea.category]}>
                          {idea.category}
                        </Badge>
                        <Badge variant="outline">{idea.difficulty}</Badge>
                        <Badge variant="outline" className="text-xs">
                          ~{idea.estimated_minutes}min
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemove(idea.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <Select
                      value={idea.assigned_to || "unassigned"}
                      onValueChange={(value) => handleAssign(idea.id, value === "unassigned" ? null : value)}
                    >
                      <SelectTrigger className="w-full max-w-xs">
                        <SelectValue placeholder="Assign to..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members.map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.full_name || member.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}