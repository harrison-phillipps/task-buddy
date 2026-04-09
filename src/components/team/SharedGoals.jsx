import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, Plus, CheckCircle, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  not_started: { label: "Not Started", color: "bg-gray-100 text-gray-700", icon: Clock },
  in_progress: { label: "In Progress", color: "bg-blue-100 text-blue-700", icon: TrendingUp },
  at_risk: { label: "At Risk", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  completed: { label: "Completed", color: "bg-green-100 text-green-700", icon: CheckCircle },
};

export default function SharedGoals({ team, currentUser }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", target_date: "", priority: "medium" });

  const { data: goals = [] } = useQuery({
    queryKey: ["teamGoals", team?.id],
    queryFn: () => base44.entities.Goal.filter({ team_id: team.id }),
    enabled: !!team?.id,
  });

  const createGoal = useMutation({
    mutationFn: (data) => base44.entities.Goal.create({ ...data, team_id: team.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamGoals", team.id] });
      setShowCreate(false);
      setForm({ title: "", description: "", target_date: "", priority: "medium" });
      toast.success("Goal created!");
    },
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Goal.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teamGoals", team.id] }),
  });

  const grouped = {
    in_progress: goals.filter(g => g.status === "in_progress"),
    not_started: goals.filter(g => g.status === "not_started"),
    at_risk: goals.filter(g => g.status === "at_risk"),
    completed: goals.filter(g => g.status === "completed"),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Team Goals</h3>
          <p className="text-sm text-gray-500">{goals.length} goal{goals.length !== 1 ? "s" : ""} shared with this space</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-purple-500 to-teal-500 text-white">
              <Plus className="w-4 h-4 mr-2" /> Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shared Goal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <Label>Goal Title</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g., Launch v2.0 by Q3" />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does success look like?" className="h-20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Target Date</Label>
                  <Input type="date" value={form.target_date} onChange={e => setForm(f => ({ ...f, target_date: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={() => createGoal.mutate(form)}
                disabled={!form.title.trim() || createGoal.isPending}
                className="w-full bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                Create Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
          <CardContent className="py-12 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600 font-medium">No shared goals yet</p>
            <p className="text-sm text-gray-500 mt-1">Create a goal your whole team can work towards</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map(goal => {
            const cfg = STATUS_CONFIG[goal.status] || STATUS_CONFIG.not_started;
            const Icon = cfg.icon;
            const isOverdue = goal.target_date && new Date(goal.target_date) < new Date() && goal.status !== "completed";
            return (
              <Card key={goal.id} className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold text-gray-900">{goal.title}</CardTitle>
                    <Badge className={`text-xs shrink-0 ${cfg.color}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </div>
                  {goal.description && <p className="text-sm text-gray-600 mt-1">{goal.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  {goal.target_date && (
                    <p className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                      {isOverdue ? "⚠️ Overdue: " : "📅 Due: "}
                      {new Date(goal.target_date).toLocaleDateString()}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {Object.keys(STATUS_CONFIG).filter(s => s !== goal.status).map(s => (
                      <Button
                        key={s}
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => updateStatus.mutate({ id: goal.id, status: s })}
                      >
                        → {STATUS_CONFIG[s].label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}