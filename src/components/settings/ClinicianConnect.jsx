import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-hot-toast";
import { Link2, Link2Off, ShieldCheck, Loader2 } from "lucide-react";

export default function ClinicianConnect({ currentUser }) {
  const [loading, setLoading] = useState(true);
  const [connectedInvite, setConnectedInvite] = useState(null);
  const [inviteCode, setInviteCode] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!currentUser?.email) return;
    const checkConnection = async () => {
      try {
        const invites = await base44.entities.ClientInvite.filter({
          client_email: currentUser.email,
          status: "accepted",
        });
        setConnectedInvite(invites.length > 0 ? invites[0] : null);
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    checkConnection();
  }, [currentUser]);

  const handleConnect = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast.error("Please enter an invite code");
      return;
    }
    setConnecting(true);
    try {
      // Find a pending, non-expired invite with this code
      const invites = await base44.entities.ClientInvite.filter({
        invite_code: code,
        status: "pending",
      });

      const now = new Date();
      const valid = invites.find(
        (inv) => !inv.expires_at || new Date(inv.expires_at) > now
      );

      if (!valid) {
        toast.error("Invalid or expired invite code. Please ask your clinician for a new one.");
        setConnecting(false);
        return;
      }

      // Mark invite as accepted
      await base44.entities.ClientInvite.update(valid.id, {
        status: "accepted",
        client_email: currentUser.email,
      });

      // Add this user to the clinician's ClinicianProfile.clients array
      const profiles = await base44.entities.ClinicianProfile.filter({
        user_id: valid.clinician_user_id,
      });

      if (profiles.length > 0) {
        const profile = profiles[0];
        const existingClients = profile.clients || [];
        const alreadyLinked = existingClients.some(
          (c) => c.client_user_id === currentUser.id
        );
        if (!alreadyLinked) {
          await base44.entities.ClinicianProfile.update(profile.id, {
            clients: [
              ...existingClients,
              {
                client_user_id: currentUser.id,
                client_display_name: currentUser.full_name || currentUser.email,
                client_email: currentUser.email,
                linked_date: new Date().toISOString().split("T")[0],
                goal_description: valid.goal_description || "",
                status: "active",
              },
            ],
          });
        }
      }

      const updatedInvite = { ...valid, status: "accepted" };
      setConnectedInvite(updatedInvite);
      setInviteCode("");
      toast.success(
        `You're now connected to ${valid.clinician_name || "your clinician"}${valid.clinician_organisation ? ` at ${valid.clinician_organisation}` : ""}. They can view your progress and generate reports to support your goals.`,
        { duration: 6000 }
      );
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectedInvite) return;
    setDisconnecting(true);
    try {
      await base44.entities.ClientInvite.update(connectedInvite.id, {
        status: "declined",
      });

      // Remove from clinician's clients array
      const profiles = await base44.entities.ClinicianProfile.filter({
        user_id: connectedInvite.clinician_user_id,
      });
      if (profiles.length > 0) {
        const profile = profiles[0];
        await base44.entities.ClinicianProfile.update(profile.id, {
          clients: (profile.clients || []).filter(
            (c) => c.client_user_id !== currentUser.id
          ),
        });
      }

      setConnectedInvite(null);
      toast.success("Disconnected from clinician.");
    } catch {
      toast.error("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl text-sm text-purple-700 dark:text-purple-300">
        <strong>Connect to a Clinician</strong> — link your account to an OT, support worker, or mentor so they can generate progress reports for your goals.
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-purple-500" />
            Clinician Connection
          </h3>
        </div>

        <div className="px-5 py-5">
          {connectedInvite ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Connected to {connectedInvite.clinician_name || "your clinician"}
                </p>
                {connectedInvite.clinician_organisation && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    {connectedInvite.clinician_organisation}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 mt-2 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  ✓ Active
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0"
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Link2Off className="w-4 h-4 mr-2" />}
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block">
                Enter invite code from your clinician
              </label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. A1B2C3D4"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  className="font-mono tracking-widest uppercase bg-white dark:bg-gray-800 max-w-xs"
                  maxLength={8}
                />
                <Button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {connecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {connecting ? "Connecting…" : "Connect"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-500 dark:text-gray-400">
        <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-gray-400 dark:text-gray-500" />
        <p>
          Your clinician can only view your task progress data. They cannot see your personal notes or edit your tasks.
          You can disconnect at any time.
        </p>
      </div>
    </div>
  );
}