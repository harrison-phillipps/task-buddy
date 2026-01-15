import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowUp, ArrowDown, Minus } from "lucide-react";

export default function PriorityIndicator({ priority, compact = false }) {
  const config = {
    critical: {
      color: "bg-red-500 text-white border-red-600",
      icon: AlertCircle,
      label: "Critical",
      ring: "ring-2 ring-red-500/50"
    },
    high: {
      color: "bg-orange-500 text-white border-orange-600",
      icon: ArrowUp,
      label: "High",
      ring: "ring-2 ring-orange-500/50"
    },
    medium: {
      color: "bg-yellow-500 text-white border-yellow-600",
      icon: Minus,
      label: "Medium",
      ring: "ring-2 ring-yellow-500/50"
    },
    low: {
      color: "bg-green-500 text-white border-green-600",
      icon: ArrowDown,
      label: "Low",
      ring: "ring-2 ring-green-500/50"
    }
  };

  const priorityConfig = config[priority] || config.medium;
  const Icon = priorityConfig.icon;

  if (compact) {
    return (
      <div className={`w-3 h-3 rounded-full ${priorityConfig.color} ${priorityConfig.ring}`} />
    );
  }

  return (
    <Badge className={`${priorityConfig.color} flex items-center gap-1 font-semibold`}>
      <Icon className="w-3 h-3" />
      {priorityConfig.label}
    </Badge>
  );
}