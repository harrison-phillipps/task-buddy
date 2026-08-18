import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { User } from "lucide-react";

export default function ProfileSettings({ currentUser, onUpdate }) {
  const [displayName, setDisplayName] = useState(currentUser?.display_name || "");
  const [saving, setSaving] = useState(false);
  const { updateUser } = useAuth();

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUser({ display_name: displayName.trim() });
      toast.success("Display name saved");
      onUpdate?.();
    } catch {
      toast.error("Failed to save display name");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-purple-500" />
          Profile
        </h3>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
            Display Name
          </label>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This is how your name appears to clinicians and in task attribution throughout the app.
          </p>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="e.g. Alex"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              className="max-w-xs bg-white dark:bg-gray-800"
            />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-700">
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Email</label>
          <p className="text-sm text-gray-700 dark:text-gray-300">{currentUser?.email || "—"}</p>
        </div>
      </div>
    </div>
  );
}