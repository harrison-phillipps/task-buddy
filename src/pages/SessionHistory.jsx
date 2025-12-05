import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, TrendingUp, Zap, Brain, Music } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";

const moodEmojis = {
  energized: "⚡",
  focused: "🎯",
  tired: "😴",
  anxious: "😰",
  neutral: "😐",
  accomplished: "🎉",
  frustrated: "😤"
};

export default function SessionHistory() {
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => base44.entities.FocusSession.list('-created_date'),
  });

  // Calculate insights
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.completed).length;
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
  const totalPomodoros = sessions.reduce((sum, s) => sum + (s.pomodoros_completed || 0), 0);
  
  // Mood correlation
  const moodCorrelation = sessions.reduce((acc, session) => {
    if (session.mood_before && session.mood_after) {
      const key = `${session.mood_before}_to_${session.mood_after}`;
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, {});

  const mostCommonTransition = Object.entries(moodCorrelation).sort((a, b) => b[1] - a[1])[0];

  // Technique stats
  const techniqueStats = sessions.reduce((acc, session) => {
    const tech = session.focus_technique || 'standard';
    acc[tech] = (acc[tech] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Session History & Insights
            </h1>
            <p className="text-gray-600 mt-1">Track your focus patterns and productivity</p>
          </div>
          <Link to={createPageUrl("FocusSession")}>
            <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg">
              <Zap className="w-4 h-4 mr-2" />
              New Session
            </Button>
          </Link>
        </motion.div>

        {/* Insights Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-500" />
                Total Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{totalSessions}</p>
              <p className="text-sm text-gray-500 mt-1">{completedSessions} completed</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-500" />
                Time Focused
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{totalMinutes}</p>
              <p className="text-sm text-gray-500 mt-1">minutes total</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <span className="text-lg">🍅</span>
                Pomodoros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">{totalPomodoros}</p>
              <p className="text-sm text-gray-500 mt-1">cycles completed</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" />
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-gray-900">
                {totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0}%
              </p>
              <p className="text-sm text-gray-500 mt-1">sessions finished</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Mood Insights */}
        {mostCommonTransition && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-br from-purple-50 to-teal-50 border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-purple-600" />
                  Mood Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-white rounded-lg">
                    <p className="text-sm text-gray-600 mb-2">Most Common Pattern:</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {mostCommonTransition[0].split('_to_').map((mood, i) => (
                        <span key={i}>
                          {moodEmojis[mood]} {mood.charAt(0).toUpperCase() + mood.slice(1)}
                          {i === 0 && ' → '}
                        </span>
                      ))}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Occurred {mostCommonTransition[1]} time{mostCommonTransition[1] !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-sm text-gray-600">
                    💡 Track how your mood changes during focus sessions to understand what works best for you!
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Technique Preferences */}
        {Object.keys(techniqueStats).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-purple-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-teal-600" />
                  Focus Technique Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(techniqueStats).map(([technique, count]) => (
                    <div key={technique} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg">
                      <span className="font-medium text-gray-700 capitalize">
                        {technique === 'pomodoro' && '🍅 '}
                        {technique}
                      </span>
                      <Badge className="bg-purple-100 text-purple-700">
                        {count} session{count !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Session List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your sessions...</p>
          </div>
        ) : sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Zap className="w-16 h-16 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No sessions yet</h3>
            <p className="text-gray-600 mb-6">Start your first focus session to begin tracking!</p>
            <Link to={createPageUrl("FocusSession")}>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg">
                <Zap className="w-5 h-5 mr-2" />
                Start Your First Session
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="space-y-4"
          >
            <h2 className="text-xl font-bold text-gray-900">Recent Sessions</h2>
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{session.task_title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.created_date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration_minutes}m
                          </span>
                          {session.completed && (
                            <Badge className="bg-green-100 text-green-700">Completed</Badge>
                          )}
                          {session.focus_technique === 'pomodoro' && (
                            <Badge className="bg-orange-100 text-orange-700">
                              🍅 {session.pomodoros_completed} Pomodoro{session.pomodoros_completed !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {session.mood_before && session.mood_after && (
                        <div className="flex items-center gap-2 p-3 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg">
                          <span className="text-sm font-medium text-gray-700">Mood:</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{moodEmojis[session.mood_before]}</span>
                            <span className="text-sm text-gray-600">{session.mood_before}</span>
                            <span className="text-gray-400">→</span>
                            <span className="text-lg">{moodEmojis[session.mood_after]}</span>
                            <span className="text-sm text-gray-600">{session.mood_after}</span>
                          </div>
                        </div>
                      )}
                      {session.ambient_sound && session.ambient_sound !== 'none' && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Music className="w-4 h-4" />
                          <span>Used {session.ambient_sound.replace('_', ' ')} sound</span>
                        </div>
                      )}
                      {session.notes && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-gray-700 italic">{session.notes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}