import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Trash2, Calendar, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BrainDumpHistory() {
  const queryClient = useQueryClient();

  const { data: brainDumps = [], isLoading } = useQuery({
    queryKey: ['brainDumps'],
    queryFn: () => base44.entities.BrainDump.list('-created_date'),
  });

  const deleteBrainDumpMutation = useMutation({
    mutationFn: (id) => base44.entities.BrainDump.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brainDumps'] });
    },
  });

  const handleDelete = (id) => {
    if (confirm("Delete this brain dump? (Created tasks will remain)")) {
      deleteBrainDumpMutation.mutate(id);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
              Brain Dump History
            </h1>
            <p className="text-gray-600 mt-1">Review your past brain dumps</p>
          </div>
          <Link to={createPageUrl("BrainDump")}>
            <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold shadow-lg">
              <Brain className="w-4 h-4 mr-2" />
              New Brain Dump
            </Button>
          </Link>
        </motion.div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your brain dumps...</p>
          </div>
        ) : brainDumps.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="w-32 h-32 bg-gradient-to-br from-purple-200 to-teal-200 rounded-full mx-auto mb-6 flex items-center justify-center">
              <Brain className="w-16 h-16 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">No brain dumps yet</h3>
            <p className="text-gray-600 mb-6">Start by dumping all your thoughts!</p>
            <Link to={createPageUrl("BrainDump")}>
              <Button className="bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white font-semibold px-8 py-6 text-lg shadow-lg">
                <Brain className="w-5 h-5 mr-2" />
                Create Your First Brain Dump
              </Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {brainDumps.map((dump, index) => (
              <motion.div
                key={dump.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="bg-white/80 backdrop-blur-sm border-purple-100 hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {new Date(dump.created_date).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {dump.tasks_created > 0 && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              {dump.tasks_created} task{dump.tasks_created !== 1 ? 's' : ''} created
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(dump.id)}
                        className="text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-teal-50 rounded-lg">
                        <p className="text-gray-700 whitespace-pre-wrap">{dump.content}</p>
                      </div>
                      {dump.encouragement && (
                        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-gray-700 italic">💭 {dump.encouragement}</p>
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