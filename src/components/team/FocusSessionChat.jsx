import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, MessageCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FocusSessionChat({ sessionId, currentUser }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['sessionMessages', sessionId],
    queryFn: async () => {
      const msgs = await base44.entities.TeamMessage.filter({ 
        team_id: sessionId // Using session ID as team_id for session-specific messages
      }, 'created_date');
      return msgs;
    },
    enabled: !!sessionId,
    refetchInterval: 2000, // Poll every 2 seconds
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      return await base44.entities.TeamMessage.create({
        team_id: sessionId,
        user_id: currentUser.id,
        user_name: currentUser.full_name || currentUser.email,
        content
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessionMessages'] });
      setMessage("");
    },
  });

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  return (
    <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple-600" />
          Session Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-48 overflow-y-auto space-y-2 pr-2">
          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex ${msg.user_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${
                  msg.user_id === currentUser.id 
                    ? 'bg-purple-500 text-white' 
                    : 'bg-gray-100 text-gray-900'
                } rounded-lg px-3 py-2`}>
                  <p className="text-xs font-semibold mb-1">{msg.user_name}</p>
                  <p className="text-sm">{msg.content}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1"
          />
          <Button 
            type="submit" 
            size="icon"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="bg-purple-500 hover:bg-purple-600"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}