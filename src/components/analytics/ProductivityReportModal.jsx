import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Award, Target, Clock, Sparkles, Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ProductivityReportModal({ open, onOpenChange }) {
  const [period, setPeriod] = useState("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);

  React.useEffect(() => {
    if (open && !report) {
      generateReport();
    }
  }, [open, period]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('analyzeTaskHistory', {
        analysisType: 'productivity_report',
        period
      });

      setReport(response.data);
      toast.success("Report generated! ✨");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    }
    setIsLoading(false);
  };

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setReport(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  const getScoreBg = (score) => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 60) return "from-yellow-500 to-orange-500";
    return "from-orange-500 to-red-500";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Productivity Report
            </span>
            <Tabs value={period} onValueChange={handlePeriodChange}>
              <TabsList className="bg-gray-100">
                <TabsTrigger value="weekly">Weekly</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Analyzing your productivity data...</p>
            </div>
          ) : report ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Overall Score */}
              <Card className={`bg-gradient-to-r ${getScoreBg(report.overall_score)} text-white`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm mb-1">Overall Productivity Score</p>
                      <p className="text-5xl font-bold">{report.overall_score}</p>
                    </div>
                    <Award className="w-16 h-16 text-white/30" />
                  </div>
                  <Progress value={report.overall_score} className="mt-4 h-2 bg-white/30" />
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{report.total_tasks_completed}</p>
                        <p className="text-xs text-gray-600">Tasks Completed</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Clock className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{Math.round(report.total_time_minutes / 60)}h</p>
                        <p className="text-xs text-gray-600">Time Focused</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{report.most_productive_category}</p>
                        <p className="text-xs text-gray-600">Top Category</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Achievements */}
              {report.achievements && report.achievements.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Award className="w-5 h-5 text-yellow-600" />
                      Achievements & Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {report.achievements.map((achievement, i) => (
                        <div key={i} className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="text-lg">🏆</span>
                          <p className="text-sm text-gray-800">{achievement}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Completion Rate by Category */}
              {report.completion_rate_by_category && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance by Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(report.completion_rate_by_category).map(([category, rate]) => (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium capitalize">{category}</span>
                          <span className={getScoreColor(rate)}>{rate}%</span>
                        </div>
                        <Progress value={rate} className="h-2" />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Areas for Improvement */}
              {report.areas_for_improvement && report.areas_for_improvement.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="w-5 h-5 text-orange-600" />
                      Areas for Growth
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.areas_for_improvement.map((item, i) => (
                        <div key={i} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                          <p className="font-medium text-gray-900 mb-1">{item.area}</p>
                          <p className="text-sm text-gray-700">💡 {item.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Trends */}
              {report.trends && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Trends & Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">{report.trends}</p>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              {report.recommendations && report.recommendations.length > 0 && (
                <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      AI Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {report.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-purple-600 mt-0.5">→</span>
                          <span className="text-gray-800">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={generateReport}
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Regenerate Report
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Export feature coming soon!")}
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
            </motion.div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}