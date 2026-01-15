import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LivePresenceIndicator({ task, currentUser }) {
  const [isBeingEdited, setIsBeingEdited] = useState(false);
  const [editorName, setEditorName] = useState("");

  useEffect(() => {
    if (!task) return;

    const editing = task.currently_editing_by && 
                    task.currently_editing_by !== currentUser?.id &&
                    task.last_edited_at &&
                    (Date.now() - new Date(task.last_edited_at).getTime() < 30000); // 30 seconds

    setIsBeingEdited(editing);
    setEditorName(task.currently_editing_name || "Someone");
  }, [task, currentUser]);

  return (
    <AnimatePresence>
      {isBeingEdited && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
        >
          <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700 flex items-center gap-1">
            <motion.div
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Users className="w-3 h-3" />
            </motion.div>
            {editorName} is editing
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
}