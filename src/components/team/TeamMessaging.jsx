import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Pin, Reply, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { hasPermission, PERMISSIONS, getUserRole, getRoleBadgeColor, getRoleLabel } from "./TeamPermissions";

export default function TeamMessaging({ team, currentUser }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const scrollRef = useRef(null);

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['teamMessages', team.id],
    queryFn: () => base44.entities.TeamMessage.filter({ team_id: team.id }, '-created_date'),
    refetchInterval: 3000, // Poll every 3 seconds for new messages
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (messageData) => base44.entities.TeamMessage.create(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMessages', team.id] });
      setMessage("");
      setReplyingTo(null);
      scrollToBottom();
    },
  });

  const pinMessageMutation = useMutation({
    mutationFn: ({ id, isPinned }) => base44.entities.TeamMessage.update(id, { is_pinned: isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMessages', team.id] });
    },
  });

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;
    if (!hasPermission(team, currentUser.id, PERMISSIONS.SEND_MESSAGES)) return;

    sendMessageMutation.mutate({
      team_id: team.id,
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      content: message,
      reply_to: replyingTo?.id || null
    });
  };

  const handlePinMessage = (msg) => {
    if (!hasPermission(team, currentUser.id, PERMISSIONS.MANAGE_MEMBERS)) return;
    pinMessageMutation.mutate({ id: msg.id, isPinned: !msg.is_pinned });
  };

  const canSendMessages = hasPermission(team, currentUser.id, PERMISSIONS.SEND_MESSAGES);
  const canPinMessages = hasPermission(team, currentUser.id, PERMISSIONS.MANAGE_MEMBERS);

  const pinnedMessages = messages.filter(m => m.is_pinned);
  const regularMessages = messages.filter(m => !m.is_pinned);

  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
  };

  const getUserFromId = (userId) => {
    return allUsers.find(u => u.id === userId);
  };

  const getRepliedMessage = (replyToId) => {
    return messages.find(m => m.id === replyToId);
  };

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg">Team Chat</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Pinned Messages */}
        {pinnedMessages.length > 0 && (
          <div className="bg-yellow-50 border-b border-yellow-200 p-3">
            <div className="text-xs font-semibold text-yellow-800 mb-2 flex items-center gap-1">
              <Pin className="w-3 h-3" />
              Pinned Messages
            </div>
            <div className="space-y-2">
              {pinnedMessages.slice(0, 2).map(msg => (
                <div key={msg.id} className="text-sm text-yellow-900 bg-yellow-100 p-2 rounded">
                  <span className="font-semibold">{msg.user_name}:</span> {msg.content}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          <AnimatePresence>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : regularMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {regularMessages.map((msg, index) => {
                  const user = getUserFromId(msg.user_id);
                  const role = getUserRole(team, msg.user_id);
                  const repliedMsg = msg.reply_to ? getRepliedMessage(msg.reply_to) : null;
                  
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex gap-3"
                    >
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-purple-400 to-teal-400 text-white text-xs">
                          {getInitials(msg.user_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900">
                            {msg.user_name}
                          </span>
                          <Badge className={`text-xs ${getRoleBadgeColor(role)}`}>
                            {getRoleLabel(role)}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {format(new Date(msg.created_date), 'h:mm a')}
                          </span>
                        </div>
                        
                        {repliedMsg && (
                          <div className="text-xs bg-gray-100 border-l-2 border-gray-300 pl-2 py-1 mb-2 text-gray-600">
                            Replying to <span className="font-semibold">{repliedMsg.user_name}</span>: {repliedMsg.content.substring(0, 50)}...
                          </div>
                        )}
                        
                        <p className="text-sm text-gray-700 break-words">{msg.content}</p>
                        
                        <div className="flex items-center gap-2 mt-1">
                          {canSendMessages && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-gray-500 hover:text-purple-600"
                              onClick={() => setReplyingTo(msg)}
                            >
                              <Reply className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          )}
                          {canPinMessages && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs text-gray-500 hover:text-yellow-600"
                              onClick={() => handlePinMessage(msg)}
                            >
                              <Pin className="w-3 h-3 mr-1" />
                              Pin
                            </Button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Message Input */}
        {canSendMessages ? (
          <div className="border-t p-4">
            {replyingTo && (
              <div className="mb-2 p-2 bg-purple-50 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                  <Reply className="w-3 h-3 text-purple-600" />
                  <span className="text-gray-700">
                    Replying to <span className="font-semibold">{replyingTo.user_name}</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => setReplyingTo(null)}
                >
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="resize-none"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600"
              >
                {sendMessageMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Press Enter to send, Shift+Enter for new line</p>
          </div>
        ) : (
          <div className="border-t p-4 text-center text-sm text-gray-500">
            You don't have permission to send messages
          </div>
        )}
      </CardContent>
    </Card>
  );
}