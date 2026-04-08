import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function DueDateSuggester({ isOpen, onClose, task, onDateSelected }) {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const handleGetSuggestions = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('suggestTaskDueDate', {
        taskId: task.id,
        priority: task.priority || 'medium',
        difficulty: task.difficulty || 'medium',
        estimatedMinutes: task.estimated_minutes || 60
      });

      setSuggestions(response.data.suggestions);
      setAnalysis(response.data.analysis);
    } catch (error) {
      console.error('Error getting suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyDate = async (date) => {
    setSelectedDate(date);
    if (onDateSelected) {
      onDateSelected(date);
    }
    onClose();
  };

  const formatDateForDisplay = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'EEE, MMM dd');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Suggest Due Date
          </DialogTitle>
          <DialogDescription>
            Based on "{task?.title}" and your completion patterns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!suggestions && (
            <Button 
              onClick={handleGetSuggestions} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing patterns...
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Get Suggestions
                </>
              )}
            </Button>
          )}

          {suggestions && (
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleApplyDate(suggestion.date)}
                  className="w-full p-3 rounded-lg border-2 border-transparent hover:border-purple-300 bg-gray-50 hover:bg-purple-50 transition-all text-left group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900">
                          {formatDateForDisplay(suggestion.date)}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          suggestion.label === 'Recommended' ? 'bg-green-100 text-green-700' :
                          suggestion.label === 'Aggressive' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {suggestion.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{suggestion.reason}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-gray-300 group-hover:text-purple-500 transition-colors mt-0.5" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {analysis && (
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
              <p className="font-medium mb-1">Analysis Summary:</p>
              <ul className="space-y-1 text-xs">
                <li>• Avg completion: {analysis.avgCompletionDays} day(s)</li>
                <li>• Priority buffer: +{analysis.bufferDays} day(s)</li>
                <li>• Est. time: {analysis.estimatedMinutes} min</li>
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}