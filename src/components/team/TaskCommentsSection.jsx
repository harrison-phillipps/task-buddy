import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, AtSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import moment from "moment";

export default function TaskCommentsSection({ task, currentUser, team, teamMembers = [], onCommentAdded }) {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState("");
  const [mentionQuery, setMentionQuery] = useState(null); // null or string
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const taskId = task?.id;

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', taskId],
    queryFn: () => base44.entities.TaskComment.filter({ task_id: taskId }, 'created_date'),
    enabled: !!taskId,
    refetchInterval: 10000,
  });

  // Real-time subscription
  useEffect(() => {
    if (!taskId) return;
    const unsub = base44.entities.TaskComment.subscribe(event => {
      if (event.data?.task_id === taskId) {
        queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      }
    });
    return unsub;
  }, [taskId, queryClient]);

  // Parse @mentions from text
  const extractMentions = (text) => {
    const regex = /@(\S+)/g;
    const found = [];
    let m;
    while ((m = regex.exec(text)) !== null) {
      const match = (teamMembers || []).find(
        mb => (mb.full_name || mb.email || '').toLowerCase().startsWith(m[1].toLowerCase())
      );
      if (match) found.push(match.id);
    }
    return [...new Set(found)];
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setNewComment(val);
    const cursor = e.target.selectionStart;
    // Find if cursor is right after an @ symbol
    const textBefore = val.slice(0, cursor);
    const atIdx = textBefore.lastIndexOf('@');
    if (atIdx !== -1 && !textBefore.slice(atIdx).includes(' ')) {
      setMentionQuery(textBefore.slice(atIdx + 1));
      setMentionStart(atIdx);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = (member) => {
    const name = (member.full_name || member.email).replace(/ /g, '_');
    const before = newComment.slice(0, mentionStart);
    const after = newComment.slice(mentionStart + 1 + (mentionQuery?.length || 0));
    const updated = `${before}@${name} ${after}`;
    setNewComment(updated);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  const filteredMentionMembers = mentionQuery !== null
    ? (teamMembers || []).filter(m =>
        (m.full_name || m.email || '').toLowerCase().includes(mentionQuery.toLowerCase()) &&
        m.id !== currentUser?.id
      ).slice(0, 5)
    : [];

  const addCommentMutation = useMutation({
    mutationFn: async (commentData) => {
      const comment = await base44.entities.TaskComment.create(commentData);
      
      // Notify team of new comment
      if (task?.team_id && team) {
        await base44.entities.TeamNotification.create({
          team_id: task.team_id,
          type: "task_commented",
          title: `New comment on "${task.title}"`,
          message: `${currentUser.full_name || currentUser.email} commented: "${commentData.content.slice(0, 60)}${commentData.content.length > 60 ? '...' : ''}"`  ,
          priority: "medium",
          related_id: task.id,
          created_by: currentUser.id
        });
      }

      // Notify individually mentioned users
      const mentions = extractMentions(commentData.content);
      for (const mentionedId of mentions) {
        if (mentionedId === currentUser.id) continue;
        await base44.entities.Notification.create({
          user_id: mentionedId,
          type: "team_mention",
          title: `You were mentioned in "${task.title}"`,
          message: `${currentUser.full_name || currentUser.email}: "${commentData.content.slice(0, 80)}"`,
          related_id: task.id,
          related_type: "task",
          priority: "high",
        });
      }
      
      return comment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taskComments', taskId] });
      queryClient.invalidateQueries({ queryKey: ['teamNotifications'] });
      setNewComment("");
      setMentionQuery(null);
      onCommentAdded?.();
    },
  });

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    const mentions = extractMentions(newComment);
    addCommentMutation.mutate({
      task_id: taskId,
      user_id: currentUser.id,
      user_name: currentUser.full_name || currentUser.email,
      content: newComment,
      mentions,
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
                        <p className="text-sm whitespace-pre-wrap">
          {comment.content.split(/(@\S+)/g).map((part, i) =>
            part.startsWith('@') ? (
              <span key={i} className="font-semibold text-yellow-200 bg-yellow-400/20 rounded px-0.5">{part}</span>
            ) : part
          )}
        </p>
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

      <div className="relative">
        {/* @mention suggestions */}
        {filteredMentionMembers.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 z-20 bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 rounded-lg shadow-lg overflow-hidden w-56">
            {filteredMentionMembers.map(m => (
              <button
                key={m.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 dark:hover:bg-purple-900/30 flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(m.full_name || m.email)?.[0]?.toUpperCase()}
                </div>
                <span className="truncate">{m.full_name || m.email}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextChange}
              placeholder="Add a comment… use @ to mention teammates"
              className="resize-none h-20 pr-8"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
                if (e.key === 'Escape') setMentionQuery(null);
              }}
            />
            <AtSign className="absolute right-2 bottom-2 w-4 h-4 text-gray-400" />
          </div>
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
    </div>
  );
}