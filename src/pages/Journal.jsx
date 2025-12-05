import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  BookOpen, Plus, Trash2, Calendar, X, ChevronDown, ChevronUp, Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import VoiceToText from "../components/VoiceToText";

const moodOptions = [
  { value: "great", label: "Great", icon: "😊", color: "bg-green-100 text-green-700 border-green-200" },
  { value: "good", label: "Good", icon: "🙂", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "okay", label: "Okay", icon: "😐", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  { value: "low", label: "Low", icon: "😔", color: "bg-orange-100 text-orange-700 border-orange-200" },
  { value: "struggling", label: "Struggling", icon: "😢", color: "bg-red-100 text-red-700 border-red-200" }
];

const quickTags = ["gratitude", "reflection", "goals", "wins", "challenges", "ideas", "feelings"];

export default function Journal() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [isWriting, setIsWriting] = useState(false);
  const [content, setContent] = useState("");
  const [selectedMood, setSelectedMood] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [customTag, setCustomTag] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntry, setExpandedEntry] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['journal', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.JournalEntry.filter({ created_by: currentUser.email }, '-created_date', 50) : [],
    enabled: !!currentUser,
  });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.JournalEntry.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
      resetForm();
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id) => base44.entities.JournalEntry.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal'] });
    },
  });

  const resetForm = () => {
    setContent("");
    setSelectedMood(null);
    setSelectedTags([]);
    setIsWriting(false);
  };

  const handleSave = () => {
    if (!content.trim()) return;
    
    createEntryMutation.mutate({
      content: content.trim(),
      mood: selectedMood,
      tags: selectedTags,
      is_private: true
    });
  };

  const handleVoiceTranscript = (transcript) => {
    setContent(prev => prev + transcript);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags(prev => [...prev, customTag.trim()]);
      setCustomTag("");
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      entry.content?.toLowerCase().includes(query) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      entry.mood?.toLowerCase().includes(query)
    );
  });

  const getMoodInfo = (mood) => moodOptions.find(m => m.value === mood);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-3 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
            Journal 📝
          </h1>
          <p className="text-gray-600">A safe space for your thoughts and reflections</p>
        </motion.div>

        {/* New Entry Button / Form */}
        <AnimatePresence mode="wait">
          {!isWriting ? (
            <motion.div
              key="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Button
                onClick={() => setIsWriting(true)}
                className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-6 text-lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                New Journal Entry
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="bg-white/90 backdrop-blur-sm border-pink-100 shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">What's on your mind?</CardTitle>
                    <Button variant="ghost" size="icon" onClick={resetForm}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Voice Input */}
                  <div className="flex items-center justify-between">
                    <VoiceToText onTranscript={handleVoiceTranscript} />
                    <span className="text-xs text-gray-400">
                      {format(new Date(), 'MMMM d, yyyy')}
                    </span>
                  </div>

                  {/* Content */}
                  <Textarea
                    placeholder="Write your thoughts here... No judgments, just let it flow."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="min-h-[200px] text-base resize-none border-pink-100 focus:border-pink-300"
                  />

                  {/* Mood Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">How are you feeling?</label>
                    <div className="flex flex-wrap gap-2">
                      {moodOptions.map((mood) => (
                        <button
                          key={mood.value}
                          onClick={() => setSelectedMood(mood.value)}
                          className={`px-3 py-2 rounded-full border-2 transition-all ${
                            selectedMood === mood.value
                              ? mood.color + " border-current"
                              : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          <span className="mr-1">{mood.icon}</span>
                          {mood.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Tags (optional)</label>
                    <div className="flex flex-wrap gap-2">
                      {quickTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1 rounded-full text-sm transition-all ${
                            selectedTags.includes(tag)
                              ? "bg-purple-500 text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add custom tag..."
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addCustomTag()}
                        className="flex-1"
                      />
                      <Button variant="outline" onClick={addCustomTag}>Add</Button>
                    </div>
                    {selectedTags.filter(t => !quickTags.includes(t)).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedTags.filter(t => !quickTags.includes(t)).map((tag) => (
                          <Badge key={tag} className="bg-purple-100 text-purple-700">
                            #{tag}
                            <button onClick={() => toggleTag(tag)} className="ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={resetForm} className="flex-1">
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={!content.trim() || createEntryMutation.isPending}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white"
                    >
                      {createEntryMutation.isPending ? "Saving..." : "Save Entry"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        {entries.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Entries List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading entries...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No entries match your search" : "Your journal is empty. Start writing!"}
              </p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredEntries.map((entry, index) => {
                const moodInfo = getMoodInfo(entry.mood);
                const isExpanded = expandedEntry === entry.id;
                
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-white/80 backdrop-blur-sm border-pink-100 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(parseISO(entry.created_date), 'MMM d, yyyy • h:mm a')}
                              </span>
                              {moodInfo && (
                                <Badge className={moodInfo.color}>
                                  {moodInfo.icon} {moodInfo.label}
                                </Badge>
                              )}
                            </div>
                            
                            <p className={`text-gray-700 whitespace-pre-wrap ${
                              !isExpanded && entry.content.length > 200 ? "line-clamp-3" : ""
                            }`}>
                              {entry.content}
                            </p>
                            
                            {entry.content.length > 200 && (
                              <button
                                onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                                className="text-sm text-purple-600 hover:text-purple-800 mt-1 flex items-center gap-1"
                              >
                                {isExpanded ? (
                                  <>Show less <ChevronUp className="w-3 h-3" /></>
                                ) : (
                                  <>Read more <ChevronDown className="w-3 h-3" /></>
                                )}
                              </button>
                            )}

                            {entry.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {entry.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteEntryMutation.mutate(entry.id)}
                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}