import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Target, Award, Sparkles } from "lucide-react";
import { generateProgressReport } from "./AIContentGenerator";
import { motion } from "framer-motion";

export default function ProgressReportModal({ open, onOpenChange, userProgress, timeframe = "week" }) {
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && !report) {
      generateReport();
    }
  }, [open]);

  const generateReport = async () => {
    setIsLoading(true);
    try {
      const generated = await generateProgressReport(userProgress, timeframe);
      setReport(generated);
    } catch (error) {
      console.error("Failed to generate report:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Your {timeframe === "week" ? "Weekly" : "Monthly"} Progress Report
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Analyzing your progress...</p>
          </div>
        ) : report ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 py-4"
          >
            {/* Summary */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg border border-purple-200">
              <p className="text-gray-700 leading-relaxed">{report.summary}</p>
            </div>

            {/* Highlights */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Award className="w-5 h-5" />
                <h3 className="font-semibold">Key Highlights</h3>
              </div>
              <div className="space-y-2">
                {report.highlights?.map((highlight, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200"
                  >
                    <span className="text-green-600 font-bold">✓</span>
                    <p className="text-gray-700 text-sm">{highlight}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Growth Areas */}
            {report.growth_areas?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-blue-600">
                  <Target className="w-5 h-5" />
                  <h3 className="font-semibold">Growth Opportunities</h3>
                </div>
                <div className="space-y-2">
                  {report.growth_areas.map((area, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <span className="text-blue-600">💡</span>
                      <p className="text-gray-700 text-sm">{area}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-orange-600" />
                <h3 className="font-semibold text-gray-900">Moving Forward</h3>
              </div>
              <p className="text-gray-700 text-sm">{report.next_steps}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => generateReport()}
              >
                Regenerate
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                Got it!
              </Button>
            </div>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}