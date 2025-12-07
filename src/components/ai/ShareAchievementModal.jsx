import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Share2, Copy, Check } from "lucide-react";
import { generateSocialPost } from "./AIContentGenerator";
import { motion } from "framer-motion";

export default function ShareAchievementModal({ open, onOpenChange, achievement, userProgress }) {
  const [post, setPost] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editedPost, setEditedPost] = useState("");

  useEffect(() => {
    if (open && !post && achievement) {
      generatePost();
    }
  }, [open, achievement]);

  const generatePost = async () => {
    setIsLoading(true);
    try {
      const generated = await generateSocialPost(achievement, userProgress);
      setPost(generated);
      setEditedPost(generated.post);
    } catch (error) {
      console.error("Failed to generate post:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const fullPost = editedPost + "\n\n" + post.hashtags.map(tag => `#${tag}`).join(" ");
    navigator.clipboard.writeText(fullPost);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-purple-600" />
            Share Your Achievement
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
            <p className="text-gray-600">Crafting your post...</p>
          </div>
        ) : post ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Your Post</label>
              <Textarea
                value={editedPost}
                onChange={(e) => setEditedPost(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Suggested Hashtags</label>
              <div className="flex flex-wrap gap-2">
                {post.hashtags?.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={copyToClipboard}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                onClick={() => onOpenChange(false)}
                className="bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                Done
              </Button>
            </div>
          </motion.div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}