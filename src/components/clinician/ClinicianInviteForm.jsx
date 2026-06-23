import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { Send, Copy } from "lucide-react";

function generateInviteCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export default function ClinicianInviteForm({ profile, currentUser }) {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [supportType, setSupportType] = useState("assistive technology and task support");
  const [submitting, setSubmitting] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [goalError, setGoalError] = useState(false);

  const handleSendInvite = async () => {
    if (!clientEmail.trim()) {
      toast.error("Client email is required");
      return;
    }
    if (!goalDescription.trim()) {
      setGoalError(true);
      return;
    }
    setGoalError(false);

    setSubmitting(true);
    try {
      const code = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      await base44.entities.ClientInvite.create({
        clinician_user_id: currentUser.id,
        clinician_name: currentUser.display_name || currentUser.full_name || "",
        clinician_organisation: profile?.organisation_name || "",
        invite_code: code,
        client_email: clientEmail.trim(),
        client_display_name: clientName.trim() || undefined,
        status: "pending",
        expires_at: expiresAt.toISOString(),
      });

      setGeneratedCode(code);
      setClientName("");
      setClientEmail("");
      setGoalDescription("");
      setSupportType("assistive technology and task support");
      setGoalError(false);
      toast.success("Invite created successfully");
    } catch (err) {
      toast.error("Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success("Code copied to clipboard");
  };

  return (
    <section id="invite-section">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Invite a Client</h2>

      <div className="rounded-2xl bg-white/70 dark:bg-white/5 border border-purple-100 dark:border-purple-900/40 p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Client Name</label>
            <Input
              placeholder="e.g. Alex Johnson"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="bg-white/80 dark:bg-white/10"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Client Email <span className="text-red-500">*</span></label>
            <Input
              type="email"
              placeholder="client@email.com"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              className="bg-white/80 dark:bg-white/10"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
            Goal Description <span className="text-red-500">*</span>
          </label>
          <Textarea
            placeholder="e.g. Building capacity to manage daily living tasks independently"
            value={goalDescription}
            onChange={(e) => { setGoalDescription(e.target.value); if (goalError) setGoalError(false); }}
            className={`bg-white/80 dark:bg-white/10 resize-none h-20 ${goalError ? "border-red-400 focus:border-red-400" : ""}`}
          />
          {goalError && (
            <p className="text-xs text-red-500 mt-1">
              Please enter a support goal before sending the invite — this is needed for NDIS reporting
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Support Type</label>
          <Input
            value={supportType}
            onChange={(e) => setSupportType(e.target.value)}
            className="bg-white/80 dark:bg-white/10"
          />
        </div>

        <Button
          onClick={handleSendInvite}
          disabled={submitting}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "Sending…" : "Send Invite"}
        </Button>

        {generatedCode && (
          <div className="mt-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 p-4 space-y-2">
            <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Invite code created ✓</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold tracking-widest text-purple-700 dark:text-purple-300">
                {generatedCode}
              </span>
              <button onClick={copyCode} className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 text-purple-600 dark:text-purple-400 transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              Share this code with your client. They can enter it in TaskBuddy under <strong>Settings &gt; Connect to Clinician</strong>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}