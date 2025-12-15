import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Trash2, Play, RefreshCw, Clock } from "lucide-react";
import { toast } from "sonner";

export default function TeamTemplates({ team, currentUser, onUseTemplate }) {
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    category: "work",
    template_data: {
      title: "",
      description: "",
      difficulty: "medium",
      estimated_minutes: 30,
      subtasks: []
    }
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['teamTemplates', team.id],
    queryFn: () => base44.entities.TeamTemplate.filter({ team_id: team.id }, '-created_date'),
  });

  const createTemplateMutation = useMutation({
    mutationFn: (templateData) => base44.entities.TeamTemplate.create({
      ...templateData,
      team_id: team.id
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTemplates'] });
      setShowCreateModal(false);
      setNewTemplate({
        name: "",
        description: "",
        category: "work",
        template_data: {
          title: "",
          description: "",
          difficulty: "medium",
          estimated_minutes: 30,
          subtasks: []
        }
      });
      toast.success("Template created!");
    }
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.TeamTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamTemplates'] });
      toast.success("Template deleted");
    }
  });

  const useTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const taskData = {
        ...template.template_data,
        team_id: team.id,
        category: template.category,
        status: "not_started"
      };
      
      const newTask = await base44.entities.Task.create(taskData);
      
      // Update usage count
      await base44.entities.TeamTemplate.update(template.id, {
        usage_count: (template.usage_count || 0) + 1
      });

      // Send notification
      await base44.entities.TeamNotification.create({
        team_id: team.id,
        type: "general",
        title: "Task Created from Template",
        message: `${currentUser.full_name || currentUser.email} created "${newTask.title}" from template "${template.name}"`,
        priority: "low",
        created_by: currentUser.id,
        related_id: newTask.id
      });

      return newTask;
    },
    onSuccess: (newTask) => {
      queryClient.invalidateQueries({ queryKey: ['teamTasks'] });
      queryClient.invalidateQueries({ queryKey: ['teamTemplates'] });
      toast.success("Task created from template!");
      if (onUseTemplate) onUseTemplate(newTask);
    }
  });

  const categoryColors = {
    work: "bg-blue-100 text-blue-700",
    personal: "bg-purple-100 text-purple-700",
    health: "bg-green-100 text-green-700",
    creative: "bg-pink-100 text-pink-700",
    learning: "bg-yellow-100 text-yellow-700",
    household: "bg-teal-100 text-teal-700",
    other: "bg-gray-100 text-gray-700"
  };

  return (
    <>
      <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Team Templates
            </CardTitle>
            <Button
              onClick={() => setShowCreateModal(true)}
              size="sm"
              className="bg-gradient-to-r from-purple-500 to-teal-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-4">No templates yet</p>
              <Button onClick={() => setShowCreateModal(true)} variant="outline">
                Create Your First Template
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="border-purple-100">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base mb-2">{template.name}</CardTitle>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Delete this template?")) {
                            deleteTemplateMutation.mutate(template.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge className={categoryColors[template.category]}>
                        {template.category}
                      </Badge>
                      {template.template_data.estimated_minutes && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {template.template_data.estimated_minutes}m
                        </Badge>
                      )}
                      {template.template_data.subtasks?.length > 0 && (
                        <Badge variant="outline">
                          {template.template_data.subtasks.length} steps
                        </Badge>
                      )}
                      {template.is_recurring_template && (
                        <Badge variant="outline" className="flex items-center gap-1">
                          <RefreshCw className="w-3 h-3" />
                          Recurring
                        </Badge>
                      )}
                    </div>
                    
                    {template.usage_count > 0 && (
                      <p className="text-xs text-gray-500">
                        Used {template.usage_count} time{template.usage_count !== 1 ? 's' : ''}
                      </p>
                    )}

                    <Button
                      onClick={() => useTemplateMutation.mutate(template)}
                      disabled={useTemplateMutation.isPending}
                      className="w-full bg-gradient-to-r from-purple-500 to-teal-500"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Team Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Template Name *</Label>
              <Input
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="e.g., Weekly Sprint Planning"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="What is this template for?"
              />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newTemplate.category}
                onValueChange={(value) => setNewTemplate({...newTemplate, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="work">Work</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="health">Health</SelectItem>
                  <SelectItem value="creative">Creative</SelectItem>
                  <SelectItem value="learning">Learning</SelectItem>
                  <SelectItem value="household">Household</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Task Title *</Label>
              <Input
                value={newTemplate.template_data.title}
                onChange={(e) => setNewTemplate({
                  ...newTemplate,
                  template_data: {...newTemplate.template_data, title: e.target.value}
                })}
                placeholder="Task title"
              />
            </div>

            <div className="space-y-2">
              <Label>Task Description</Label>
              <Textarea
                value={newTemplate.template_data.description}
                onChange={(e) => setNewTemplate({
                  ...newTemplate,
                  template_data: {...newTemplate.template_data, description: e.target.value}
                })}
                placeholder="Task details"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={newTemplate.template_data.difficulty}
                  onValueChange={(value) => setNewTemplate({
                    ...newTemplate,
                    template_data: {...newTemplate.template_data, difficulty: value}
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estimated Minutes</Label>
                <Input
                  type="number"
                  value={newTemplate.template_data.estimated_minutes}
                  onChange={(e) => setNewTemplate({
                    ...newTemplate,
                    template_data: {...newTemplate.template_data, estimated_minutes: parseInt(e.target.value)}
                  })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createTemplateMutation.mutate(newTemplate)}
                disabled={!newTemplate.name || !newTemplate.template_data.title || createTemplateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500"
              >
                Create Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}