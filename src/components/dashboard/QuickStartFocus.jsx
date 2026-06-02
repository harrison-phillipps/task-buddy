import { Zap, Plus } from "lucide-react";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";

const PRIORITY_ORDER = { urgent: 0, high: 1, medium: 2, low: 3 };
const TASK_PRIORITY_ORDER = { must_do: 0, should_do: 1, could_do: 2 };

function getMostUrgentTask(tasks) {
  const active = tasks.filter(t => t.status !== "completed");
  if (!active.length) return null;

  return [...active].sort((a, b) => {
    // 1. Due date (overdue / soonest first)
    const aDate = a.due_date ? new Date(a.due_date) : null;
    const bDate = b.due_date ? new Date(b.due_date) : null;
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    if (aDate && bDate && aDate - bDate !== 0) return aDate - bDate;

    // 2. Priority label
    const ap = PRIORITY_ORDER[a.priority] ?? 99;
    const bp = PRIORITY_ORDER[b.priority] ?? 99;
    if (ap !== bp) return ap - bp;

    // 3. MoSCoW priority
    const at = TASK_PRIORITY_ORDER[a.task_priority] ?? 99;
    const bt = TASK_PRIORITY_ORDER[b.task_priority] ?? 99;
    return at - bt;
  })[0];
}

export default function QuickStartFocus({ tasks }) {
  const task = getMostUrgentTask(tasks);

  if (!task) return (
    <div className="w-full flex items-center gap-4 px-5 py-4 bg-white/80 dark:bg-gray-800/80 border border-purple-100 dark:border-gray-700 rounded-2xl">
      <div className="w-11 h-11 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
        <Zap className="w-6 h-6 text-purple-500" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm leading-snug">Ready to tackle something?</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Add your first task and we'll break it down for you.</p>
      </div>
      <Link to={createPageUrl("Tasks")} className="flex-shrink-0">
        <button className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Add a task
        </button>
      </Link>
    </div>
  );

  const handleQuickStart = () => {
    const url =
      createPageUrl("FocusSession") +
      `?taskId=${task.id}&taskTitle=${encodeURIComponent(task.title)}&duration=25&autostart=true`;
    window.location.href = url;
  };

  return (
    <button
      onClick={handleQuickStart}
      className="w-full flex items-center gap-4 px-5 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-2xl shadow-lg transition-all duration-200 active:scale-95 group"
    >
      <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
        <Zap className="w-6 h-6" />
      </div>
      <div className="flex-1 text-left min-w-0">
        <p className="font-bold text-base leading-tight">Quick Start — 25 min focus</p>
        <p className="text-orange-100 text-sm truncate mt-0.5">{task.title}</p>
      </div>
      <div className="flex-shrink-0 bg-white/20 rounded-lg px-3 py-1.5 text-sm font-semibold">
        Start →
      </div>
    </button>
  );
}