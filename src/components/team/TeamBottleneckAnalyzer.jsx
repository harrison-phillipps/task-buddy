import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, TrendingDown, Loader2, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TeamBottleneckAnalyzer({ team, tasks, members }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);

  const analyzeBottlenecks = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze team performance
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'completed').length;
      const blockedTasks = tasks.filter(t => t.blocked_by?.length > 0 || t.status === 'blocked').length;
      const overdueTasks = tasks.filter(t => {
        if (!t.due_date || t.status === 'completed') return false;
        return new Date(t.due_date) < new Date();
      }).length;

      // Member workload analysis
      const memberWorkload = members.map(member => {
        const assignedTasks = tasks.filter(t => 
          t.assigned_to === member.id || 
          t.assigned_to_users?.some(u => u.user_id === member.id)
        );
        const completedByMember = assignedTasks.filter(t => t.status === 'completed').length;
        return {
          name: member.full_name || member.email,
          assigned: assignedTasks.length,
          completed: completedByMember,
          completionRate: assignedTasks.length > 0 ? (completedByMember / assignedTasks.length) * 100 : 0
        };
      });

      const unassignedTasks = tasks.filter(t => 
        !t.assigned_to && (!t.assigned_to_users || t.assigned_to_users.length === 0)
      ).length;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You're a Team Collaboration Analyzer - identify bottlenecks and suggest improvements.

Team: ${team.name}
Members: ${members.length}
Total tasks: ${totalTasks}
Completed: ${completedTasks} (${Math.round((completedTasks/totalTasks)*100)}%)
Blocked: ${blockedTasks}
Overdue: ${overdueTasks}
Unassigned: ${unassignedTasks}

Member workload:
${memberWorkload.map(m => `- ${m.name}: ${m.assigned} tasks (${Math.round(m.completionRate)}% complete)`).join('\n')}

Identify:
1. Primary bottleneck (what's blocking team progress most)
2. Risk level (low/medium/high/critical)
3. Affected members (who's impacted most)
4. Recommended action (specific, actionable fix)
5. Workload balance assessment (balanced/unbalanced/critical)

Be specific and data-driven!`,
        response_json_schema: {
          type: "object",
          properties: {
            primary_bottleneck: { type: "string" },
            risk_level: { type: "string" },
            affected_members: { type: "array", items: { type: "string" } },
            recommended_action: { type: "string" },
            workload_balance: { type: "string" },
            insight: { type: "string" }
          }
        }
      });

      setAnalysis({
        ...result,
        stats: {
          completionRate: Math.round((completedTasks/totalTasks)*100),
          blockedTasks,
          overdueTasks,
          unassignedTasks
        }
      });
    } catch (error) {
      console.error("Bottleneck analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  useEffect(() => {
    if (tasks?.length > 5 && members?.length > 1 && !analysis) {
      analyzeBottlenecks();
    }
  }, []);

  if (!tasks?.length || members?.length < 2) return null;

  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case 'critical': return 'from-red-500 to-orange-500';
      case 'high': return 'from-orange-500 to-yellow-500';
      case 'medium': return 'from-yellow-500 to-blue-500';
      case 'low': return 'from-green-500 to-teal-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-900">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-white" />
          </div>
          Team Bottleneck Analyzer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {isAnalyzing && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-6"
            >
              <Loader2 className="w-8 h-8 animate-spin text-red-500 mx-auto mb-3" />
              <p className="text-sm text-red-600">Analyzing team bottlenecks...</p>
            </motion.div>
          )}

          {analysis && !isAnalyzing && (
            <motion.div
              key="analysis"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 bg-gradient-to-r ${getRiskColor(analysis.risk_level)} rounded-xl text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Risk Level</span>
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <p className="text-2xl font-bold capitalize">{analysis.risk_level}</p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-white rounded-lg border border-red-200 text-center">
                  <p className="text-xs text-red-600 mb-1">Complete</p>
                  <p className="text-lg font-bold text-red-900">{analysis.stats.completionRate}%</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-red-200 text-center">
                  <p className="text-xs text-red-600 mb-1">Blocked</p>
                  <p className="text-lg font-bold text-red-900">{analysis.stats.blockedTasks}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-red-200 text-center">
                  <p className="text-xs text-red-600 mb-1">Overdue</p>
                  <p className="text-lg font-bold text-red-900">{analysis.stats.overdueTasks}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-red-200 text-center">
                  <p className="text-xs text-red-600 mb-1">Unassigned</p>
                  <p className="text-lg font-bold text-red-900">{analysis.stats.unassignedTasks}</p>
                </div>
              </div>

              <div className="p-3 bg-white rounded-lg border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Primary Bottleneck:
                </p>
                <p className="text-sm text-red-800">{analysis.primary_bottleneck}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-red-200">
                <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Affected Members:
                </p>
                <div className="flex gap-1 flex-wrap">
                  {analysis.affected_members?.map((member, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {member}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-red-100 rounded-lg">
                <p className="text-xs font-semibold text-red-900 mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Recommended Action:
                </p>
                <p className="text-sm text-red-800">{analysis.recommended_action}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-red-600">Workload Balance:</span>
                  <Badge className={
                    analysis.workload_balance === 'balanced' ? 'bg-green-500' :
                    analysis.workload_balance === 'unbalanced' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }>
                    {analysis.workload_balance}
                  </Badge>
                </div>
              </div>

              {analysis.insight && (
                <div className="p-3 bg-white rounded-lg border border-red-200">
                  <p className="text-xs text-red-700">{analysis.insight}</p>
                </div>
              )}

              <Button
                onClick={analyzeBottlenecks}
                variant="outline"
                size="sm"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                <AlertTriangle className="w-3 h-3 mr-2" />
                Refresh Analysis
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!analysis && !isAnalyzing && (
          <Button
            onClick={analyzeBottlenecks}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Analyze Team Bottlenecks
          </Button>
        )}
      </CardContent>
    </Card>
  );
}