import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MobileSelect from "@/components/MobileSelect";
import { SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

const DIFFICULTY_OPTIONS = [
  { value: "all", label: "All Difficulties" },
  { value: "easy", label: "🟢 Easy" },
  { value: "medium", label: "🟡 Medium" },
  { value: "hard", label: "🔴 Hard" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Categories" },
  { value: "work", label: "💼 Work" },
  { value: "personal", label: "🏠 Personal" },
  { value: "health", label: "💪 Health" },
  { value: "creative", label: "🎨 Creative" },
  { value: "learning", label: "📚 Learning" },
  { value: "household", label: "🧹 Household" },
  { value: "other", label: "📋 Other" },
];

const PRIORITY_OPTIONS = [
  { value: "all", label: "All Priorities" },
  { value: "must_do", label: "🔴 Must Do" },
  { value: "should_do", label: "🟡 Should Do" },
  { value: "could_do", label: "🟢 Could Do" },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default Order" },
  { value: "due_date_asc", label: "📅 Due Date (Earliest)" },
  { value: "due_date_desc", label: "📅 Due Date (Latest)" },
  { value: "difficulty_asc", label: "⚡ Difficulty (Easy → Hard)" },
  { value: "difficulty_desc", label: "⚡ Difficulty (Hard → Easy)" },
  { value: "priority_desc", label: "🔴 Priority (Highest)" },
  { value: "estimated_asc", label: "⏱ Time (Shortest)" },
  { value: "estimated_desc", label: "⏱ Time (Longest)" },
];

export default function TaskFilterSortBar({ filters, onFiltersChange, sort, onSortChange }) {
  const [expanded, setExpanded] = useState(false);

  const activeFilterCount = [
    filters.difficulty !== "all" ? 1 : 0,
    filters.category !== "all" ? 1 : 0,
    filters.priority !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0) + (sort !== "default" ? 1 : 0);

  const clearAll = () => {
    onFiltersChange({ difficulty: "all", category: "all", priority: "all" });
    onSortChange("default");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setExpanded(e => !e)}
          className={`border-purple-200 hover:bg-purple-50 gap-2 ${expanded ? "bg-purple-50" : ""}`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0 min-w-[18px] justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        <MobileSelect
          value={sort}
          onValueChange={onSortChange}
          placeholder="Sort by…"
          className="w-full sm:w-52 text-sm"
          options={SORT_OPTIONS}
        />

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-gray-500 hover:text-red-500 gap-1">
            <X className="w-3.5 h-3.5" /> Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div className="flex flex-wrap gap-2 p-3 bg-white/70 dark:bg-gray-800/70 rounded-xl border border-purple-100 dark:border-gray-700">
          <MobileSelect
            value={filters.priority}
            onValueChange={(v) => onFiltersChange({ ...filters, priority: v })}
            placeholder="Priority"
            className="flex-1 min-w-[140px] sm:w-44 text-sm"
            options={PRIORITY_OPTIONS}
          />
          <MobileSelect
            value={filters.difficulty}
            onValueChange={(v) => onFiltersChange({ ...filters, difficulty: v })}
            placeholder="Difficulty"
            className="flex-1 min-w-[140px] sm:w-44 text-sm"
            options={DIFFICULTY_OPTIONS}
          />
          <MobileSelect
            value={filters.category}
            onValueChange={(v) => onFiltersChange({ ...filters, category: v })}
            placeholder="Category"
            className="flex-1 min-w-[140px] sm:w-44 text-sm"
            options={CATEGORY_OPTIONS}
          />
        </div>
      )}
    </div>
  );
}