import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Loader2, CalendarDays, Target, Pencil, Check } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import ClientProgressModal from "./ClientProgressModal";

function ClientGoalEditor({ client, profile, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(client.goal_description || "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setValue(client.goal_description || "");
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedClients = (profile.clients || []).map(c =>
        c.client_user_id === client.client_user_id
          ? { ...c, goal_description: value }
          : c
      );
      await base44.entities.ClinicianProfile.update(profile.id, { clients: updatedClients });
      toast.success("Goal updated");
      onSaved(updatedClients);
      setEditing(false);
    } catch {
      toast.error("Failed to update goal");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-1">
        <Target className="w-3 h-3 shrink-0 text-gray-400" />
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-7 text-xs bg-white/80 dark:bg-white/10 flex-1"
          autoFocus
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <Button size="sm" className="h-7 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-400">
      <Target className="w-3 h-3 mt-0.5 shrink-0" />
      {client.goal_description ? (
        <span className="line-clamp-2 flex-1">{client.goal_description}</span>
      ) : (
        <span
          className="italic text-gray-400 dark:text-gray-500 cursor-pointer flex-1"
          onClick={startEdit}
        >
          No goal set — click to add
        </span>
      )}
      <button onClick={startEdit} className="ml-1 text-gray-400 hover:text-purple-600 transition-colors shrink-0">
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

export default function ClinicianClientsList({ profile: initialProfile, currentUser, onReportGenerated }) {
  const [generatingFor, setGeneratingFor] = useState(null);
  const [profile, setProfile] = useState(initialProfile);
  const [viewingClient, setViewingClient] = useState(null);

  const clients = profile?.clients || [];

  const handleGoalSaved = (updatedClients) => {
    setProfile(prev => ({ ...prev, clients: updatedClients }));
  };

  const handleGenerateReport = async (client) => {
    setGeneratingFor(client.client_user_id);
    try {
      await base44.functions.invoke("generateClinicianReport", {
        client_user_id: client.client_user_id,
        client_name: client.client_display_name || "the participant",
        period: "monthly",
        goal_description: client.goal_description || "",
        support_type: "assistive technology and task support",
      });
      toast.success(`Report generated for ${client.client_display_name}`);
      onReportGenerated();
    } catch {
      toast.error("Failed to generate report");
    } finally {
      setGeneratingFor(null);
    }
  };

  // Sync if parent profile prop changes
  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile]);

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">My Clients</h2>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-purple-200 dark:border-purple-800 p-10 text-center bg-white/50 dark:bg-white/5">
          <div className="text-4xl mb-3">👥</div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">No clients connected yet</p>
          <Button
            variant="outline"
            className="border-purple-300 text-purple-700 dark:text-purple-300 dark:border-purple-700"
            onClick={() => document.getElementById("invite-section")?.scrollIntoView({ behavior: "smooth" })}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite a Client
          </Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {clients.map((client) => (
            <div
              key={client.client_user_id}
              className="rounded-2xl bg-white/70 dark:bg-white/5 border border-purple-100 dark:border-purple-900/40 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{client.client_display_name || "Unnamed Client"}</p>
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1 font-medium ${
                    client.status === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                  }`}>
                    {client.status || "active"}
                  </span>
                </div>
              </div>

              {client.linked_date && (
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <CalendarDays className="w-3 h-3" />
                  Linked {format(new Date(client.linked_date), "d MMM yyyy")}
                </div>
              )}

              <ClientGoalEditor
                client={client}
                profile={profile}
                onSaved={handleGoalSaved}
              />

              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" className="flex-1 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300" onClick={() => setViewingClient(client)}>
                  View Progress
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => handleGenerateReport(client)}
                  disabled={generatingFor === client.client_user_id}
                >
                  {generatingFor === client.client_user_id ? (
                    <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating…</>
                  ) : "Generate Report"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <ClientProgressModal
        client={viewingClient}
        open={!!viewingClient}
        onClose={() => setViewingClient(null)}
        onGenerateReport={() => viewingClient && handleGenerateReport(viewingClient)}
      />
    </section>
  );
}