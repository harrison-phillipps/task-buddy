import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Play, Edit2, Trash2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import CreateTemplateModal from "./CreateTemplateModal";
import { toast } from "sonner";

export default function FocusSessionTemplates({ onSelectTemplate, currentUser }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['focusTemplates', currentUser?.email],
    queryFn: async () => {
      if (!currentUser) return [];
      return base44.entities.FocusSessionTemplate.filter({ created_by: currentUser.email }, '-usage_count');
    },
    enabled: !!currentUser,
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id) => base44.entities.FocusSessionTemplate.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focusTemplates'] });
      toast.success('Template deleted');
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template) => {
      const { id, created_date, updated_date, created_by, ...templateData } = template;
      return base44.entities.FocusSessionTemplate.create({
        ...templateData,
        name: `${template.name} (Copy)`,
        usage_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focusTemplates'] });
      toast.success('Template duplicated');
    },
  });

  const getTechniqueIcon = (technique) => {
    return technique === 'pomodoro' ? '🍅' : '⏱️';
  };

  const getSoundEmoji = (sound) => {
    const emojis = {
      rain: '🌧️',
      cafe: '☕',
      forest: '🌲',
      ocean: '🌊',
      white_noise: '⚪',
      brown_noise: '🟤',
      none: '🔇'
    };
    return emojis[sound] || '🎵';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Session Templates</h3>
        <Button
          onClick={() => {
            setEditingTemplate(null);
            setShowCreateModal(true);
          }}
          size="sm"
          className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Card 
              className="bg-white border-2 hover:shadow-lg transition-all cursor-pointer"
              style={{ borderColor: template.color }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.name}
                      {template.is_ai_suggested && (
                        <Badge className="bg-purple-500 text-white text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </CardTitle>
                    {template.description && (
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    {getTechniqueIcon(template.focus_technique)} {template.focus_technique}
                  </Badge>
                  {template.focus_technique === 'pomodoro' && (
                    <Badge variant="outline" className="text-xs">
                      {template.work_interval}m / {template.break_interval}m
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {getSoundEmoji(template.ambient_sound)} {template.ambient_sound}
                  </Badge>
                  {template.usage_count > 0 && (
                    <Badge variant="outline" className="text-xs">
                      Used {template.usage_count}x
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => onSelectTemplate(template)}
                    size="sm"
                    className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Use
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowCreateModal(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => duplicateTemplateMutation.mutate(template)}
                    size="sm"
                    variant="outline"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => {
                      if (confirm('Delete this template?')) {
                        deleteTemplateMutation.mutate(template.id);
                      }
                    }}
                    size="sm"
                    variant="outline"
                    className="text-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-2 text-center py-8 text-gray-500">
            <p className="mb-3">No templates yet</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Template
            </Button>
          </div>
        )}
      </div>

      <CreateTemplateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        template={editingTemplate}
        currentUser={currentUser}
      />
    </div>
  );
}