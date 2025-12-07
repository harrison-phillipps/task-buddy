import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Textarea } from "@/components/ui/textarea";

export default function MessageFeedback({ message, context, onFeedbackSubmitted }) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [rating, setRating] = useState(null);
  const [showDetailedFeedback, setShowDetailedFeedback] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRating = async (ratingValue) => {
    setRating(ratingValue);
    
    if (ratingValue === "negative") {
      setShowDetailedFeedback(true);
    } else {
      // Quick positive feedback
      await submitFeedback(ratingValue, "");
    }
  };

  const submitFeedback = async (ratingValue, detailedFeedback) => {
    setIsSubmitting(true);
    try {
      const user = await base44.auth.me();
      
      // Store feedback for learning
      await base44.entities.CompanionFeedback.create({
        user_id: user.id,
        message_text: message,
        context: context,
        rating: ratingValue,
        feedback: detailedFeedback,
        personality_settings: user.companion_personality_custom || {}
      });

      // Update user preferences if negative
      if (ratingValue === "negative" && detailedFeedback) {
        const preferences = user.companion_preferences || { dislikedPhrases: [] };
        // Could extract phrases from feedback, for now just store
        await base44.auth.updateMe({
          companion_preferences: {
            ...preferences,
            lastNegativeFeedback: detailedFeedback
          }
        });
      }

      setShowFeedback(false);
      setShowDetailedFeedback(false);
      onFeedbackSubmitted?.();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDetailedSubmit = async () => {
    await submitFeedback(rating, feedback);
  };

  return (
    <div className="relative">
      <AnimatePresence>
        {!showFeedback && !rating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute -bottom-8 right-0"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedback(true)}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              Rate this message
            </Button>
          </motion.div>
        )}

        {showFeedback && !rating && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -bottom-12 right-0 flex items-center gap-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2"
          >
            <span className="text-xs text-gray-600">How was this?</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRating("positive")}
              className="hover:bg-green-50"
            >
              <ThumbsUp className="w-4 h-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRating("negative")}
              className="hover:bg-red-50"
            >
              <ThumbsDown className="w-4 h-4 text-red-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFeedback(false)}
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {rating === "positive" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -bottom-8 right-0 text-xs text-green-600"
          >
            Thanks for the feedback! ✓
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDetailedFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDetailedFeedback(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-semibold text-gray-900">Help me improve!</h3>
              <p className="text-sm text-gray-600">
                What didn't you like about this message? Your feedback helps your companion learn your preferences.
              </p>
              <Textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="e.g., Too cheerful, wrong tone, not helpful..."
                rows={3}
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailedFeedback(false)}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleDetailedSubmit}
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
                >
                  {isSubmitting ? "Submitting..." : "Submit Feedback"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}