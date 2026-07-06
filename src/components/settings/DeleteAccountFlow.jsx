import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CONSEQUENCES = [
  { icon: "✅", label: "All tasks and subtasks" },
  { icon: "🎯", label: "All goals and key results" },
  { icon: "⏱️", label: "All focus sessions and history" },
  { icon: "🧠", label: "All brain dumps" },
  { icon: "🏆", label: "Achievements, points, and streaks" },
  { icon: "📅", label: "Calendar events and integrations" },
];

export default function DeleteAccountFlow() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1 = consequences, 2 = type confirm
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleOpen = () => {
    setStep(1);
    setConfirmText("");
    setOpen(true);
  };

  const handleClose = () => {
    if (deleting) return;
    setOpen(false);
    setStep(1);
    setConfirmText("");
  };

  const [error, setError] = useState("");

  const handleDelete = async () => {
    if (confirmText !== "DELETE" || deleting) return;
    setDeleting(true);
    setError("");
    try {
      const res = await base44.functions.invoke("deleteAccount", {});
      if (res?.data?.error) throw new Error(res.data.error);
      // Account anonymised + data deleted server-side; sign out
      base44.auth.logout("/");
    } catch (err) {
      console.error("Account deletion error:", err);
      setError(err.message || "Something went wrong. Please try again or contact support.");
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        variant="destructive"
        onClick={handleOpen}
        className="flex items-center gap-2 min-h-[44px] shrink-0"
      >
        <Trash2 className="w-4 h-4" />
        Delete Account
      </Button>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="w-5 h-5" />
              {step === 1 ? "Before you delete your account" : "Final confirmation"}
            </DialogTitle>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Deleting your account is <strong>permanent and irreversible.</strong> The following data will be immediately and permanently erased:
              </p>

              <ul className="space-y-2">
                {CONSEQUENCES.map(({ icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-base w-6 text-center">{icon}</span>
                    {label}
                  </li>
                ))}
              </ul>

              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ There is no grace period. Once deleted, your data cannot be recovered.
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  Keep my account
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1 gap-2"
                  onClick={() => setStep(2)}
                >
                  I understand, continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                To confirm you want to permanently delete your account and all data, type{" "}
                <strong className="text-red-600 dark:text-red-400">DELETE</strong> in the field below.
              </p>

              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE here"
                className="border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500 text-center font-mono tracking-widest"
                autoFocus
              />

              {confirmText.length > 0 && confirmText !== "DELETE" && (
                <p className="text-xs text-red-500 text-center">Must match exactly: DELETE</p>
              )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 text-center bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-2">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={deleting}>
                  Back
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDelete}
                  disabled={confirmText !== "DELETE" || deleting}
                >
                  {deleting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Deleting…
                    </span>
                  ) : (
                    "Permanently delete"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}