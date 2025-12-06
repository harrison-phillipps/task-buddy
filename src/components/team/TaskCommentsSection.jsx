import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function TaskCommentsSection({ taskId, currentUser, teamMembers }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: taskId }, '-created_date'),
    enabled: !!taskId,
  });

  const addCommentMutation = useMutation({
    mutationFn: (commentData) => base44.entities.TaskComment.create(commentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      setNewComment("");
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    addCommentMutation.mutate({
      task_id: taskId,
      user_id: currentUser.id,
      user_name: currentUser.full_name || currentUser.email,
      content: newComment,
    });
  };

  return (
    <div className="space-y-4">
      <ScrollArea className="h-64 pr-4">
        <AnimatePresence>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No comments yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment, index) => {
                const isCurrentUser = comment.user_id === currentUser?.id;

                return (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex gap-3 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isCurrentUser && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white text-xs font-semibold">
                        {comment.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className={`flex-1 max-w-[80%] ${isCurrentUser ? 'text-right' : ''}`}>
                      <div className={`inline-block rounded-lg p-3 ${
                        isCurrentUser 
                          ? 'bg-gradient-to-r from-purple-500 to-teal-500 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        {!isCurrentUser && (
                          <p className="text-xs font-semibold mb-1">{comment.user_name}</p>
                        )}
                        <p className="text-sm">{comment.content}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 px-2">
                        {moment(comment.created_date).fromNow()}
                      </p>
                    </div>
                    {isCurrentUser && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                        {comment.user_name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      <div className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="resize-none h-20"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Button
          onClick={handleSubmit}
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
        >
          {addCommentMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}