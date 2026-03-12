import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const confidenceColors = {
    high: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    low: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
};

export default function AITimeEstimator({ task, onApplyEstimate }) {
    const [estimate, setEstimate] = useState(null);
    const [loading, setLoading] = useState(false);

    const fetchEstimate = async () => {
        setLoading(true);
        try {
            const res = await base44.functions.invoke('estimateTaskTime', { task });
            if (res.data?.success) {
                setEstimate(res.data.estimate);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            {!estimate && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={fetchEstimate}
                    disabled={loading || !task?.title}
                    className="gap-2 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/20"
                >
                    {loading ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Estimating...</>
                    ) : (
                        <><Sparkles className="w-3.5 h-3.5" />AI Estimate Time</>
                    )}
                </Button>
            )}

            <AnimatePresence>
                {estimate && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-700 space-y-2"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold">AI Time Estimate</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Badge className={`text-xs ${confidenceColors[estimate.confidence]}`}>
                                    {estimate.confidence} confidence
                                </Badge>
                                <button
                                    onClick={() => { setEstimate(null); fetchEstimate(); }}
                                    className="p-1 text-gray-400 hover:text-purple-600 transition-colors"
                                    title="Refresh estimate"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{estimate.total_estimate_minutes}</p>
                                <p className="text-xs text-gray-500">total min</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{estimate.session_duration_minutes}</p>
                                <p className="text-xs text-gray-500">min/session</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-lg p-2">
                                <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{estimate.sessions_needed}</p>
                                <p className="text-xs text-gray-500">sessions</p>
                            </div>
                        </div>

                        <p className="text-xs text-gray-600 dark:text-gray-400 italic">{estimate.reasoning}</p>

                        <div className="flex gap-2">
                            {onApplyEstimate && (
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => onApplyEstimate(estimate.total_estimate_minutes)}
                                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs h-7"
                                >
                                    <Clock className="w-3 h-3 mr-1" />
                                    Apply {estimate.total_estimate_minutes} min
                                </Button>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setEstimate(null)}
                                className="text-xs h-7 text-gray-500"
                            >
                                Dismiss
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}