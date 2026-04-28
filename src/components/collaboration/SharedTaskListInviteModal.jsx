import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Mail, X, Users, Check, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { createNotification } from "@/components/notifications/NotificationUtils";

export default function SharedTaskListInviteModal({ open, onOpenChange, currentUser, teams, onTeamCreated }) {
  const [step, setStep] = useState("choose"); // "choose" | "new" | "existing"
  const [listName, setListName] = useState("");
  const [emails, setEmails] = useState([]);
  const [emailInput, setEmailInput] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleClose = () => {
    setStep("choose");
    setListName("");
    setEmails([]);
    setEmailInput("");
    setSelectedTeamId("");
    onOpenChange(false);
  };

  const addEmail = () => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || emails.includes(trimmed)) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Please enter a valid email address");
      return;
    }
    setEmails(prev => [...prev, trimmed]);
    setEmailInput("");
  };

  const removeEmail = (email) => setEmails(prev => prev.filter(e => e !== email));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail();
    }
  };

  const handleCreateNewList = async () => {
    if (!listName.trim()) { toast.error("Please enter a list name"); return; }
    if (emails.length === 0) { toast.error("Please add at least one collaborator email"); return; }

    setIsLoading(true);
    try {
      // Invite each email to the app
      const inviteResults = await Promise.allSettled(
        emails.map(email => base44.users.inviteUser(email, "user"))
      );

      // Create the team/shared list
      const team = await base44.entities.Team.create({
        name: listName.trim(),
        description: `Shared task list`,
        owner_id: currentUser.id,
        owner_name: currentUser.full_name,
        owner_email: currentUser.email,
        members: [],
        member_ids: [],
        member_roles: {},
        color: "#8B5CF6",
      });

      // Send notification email to each invitee
      await Promise.allSettled(
        emails.map(email =>
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `${currentUser.full_name} invited you to collaborate on "${listName.trim()}"`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #8B5CF6;">You've been invited to collaborate!</h2>
                <p style="font-size: 16px; color: #4B5563;">
                  <strong>${currentUser.full_name}</strong> has invited you to collaborate on the task list 
                  <strong>"${listName.trim()}"</strong> in TaskBuddy.
                </p>
                <p style="font-size: 14px; color: #6B7280;">
                  Sign in or create an account to start collaborating on shared tasks together.
                </p>
                <div style="margin-top: 24px; padding: 16px; background: #F3F0FF; border-radius: 8px;">
                  <p style="margin: 0; font-size: 14px; color: #7C3AED; font-weight: 600;">
                    📋 Task List: ${listName.trim()}
                  </p>
                </div>
                <p style="margin-top: 16px; font-size: 12px; color: #9CA3AF;">
                  Sent via TaskBuddy — Your virtual productivity companion.
                </p>
              </div>
            `
          })
        )
      );

      toast.success(`Shared list "${listName.trim()}" created! Invites sent to ${emails.length} collaborator${emails.length > 1 ? 's' : ''}.`);
      onTeamCreated?.(team);
      handleClose();
    } catch (error) {
      console.error("Error creating shared list:", error);
      toast.error("Failed to create shared list. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteToExisting = async () => {
    if (!selectedTeamId) { toast.error("Please select a task list"); return; }
    if (emails.length === 0) { toast.error("Please add at least one email"); return; }

    setIsLoading(true);
    const team = teams.find(t => t.id === selectedTeamId);
    try {
      await Promise.allSettled(
        emails.map(email => base44.users.inviteUser(email, "user"))
      );

      await Promise.allSettled(
        emails.map(email =>
          base44.integrations.Core.SendEmail({
            to: email,
            subject: `${currentUser.full_name} invited you to "${team?.name}"`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h2 style="color: #8B5CF6;">You've been invited to collaborate!</h2>
                <p style="font-size: 16px; color: #4B5563;">
                  <strong>${currentUser.full_name}</strong> has invited you to join the task list 
                  <strong>"${team?.name}"</strong> in TaskBuddy.
                </p>
                <p style="font-size: 12px; color: #9CA3AF;">Sent via TaskBuddy.</p>
              </div>
            `
          })
        )
      );

      toast.success(`Invites sent to ${emails.length} person${emails.length > 1 ? 's' : ''}!`);
      handleClose();
    } catch (error) {
      toast.error("Failed to send invites");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-600" />
            Share Task List
          </DialogTitle>
        </DialogHeader>

        {step === "choose" && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">How would you like to share?</p>
            <Button
              className="w-full justify-start gap-3 h-14 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              onClick={() => setStep("new")}
            >
              <Users className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Create a new shared list</p>
                <p className="text-xs opacity-80">Name it and invite collaborators</p>
              </div>
            </Button>
            {teams.length > 0 && (
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-14 border-purple-200"
                onClick={() => setStep("existing")}
              >
                <Mail className="w-5 h-5 text-purple-600" />
                <div className="text-left">
                  <p className="font-semibold text-gray-800">Invite to existing list</p>
                  <p className="text-xs text-gray-500">Add members to a current team</p>
                </div>
              </Button>
            )}
          </div>
        )}

        {step === "new" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>List Name</Label>
              <Input
                placeholder="e.g. Q2 Project, Family Chores..."
                value={listName}
                onChange={e => setListName(e.target.value)}
              />
            </div>
            <EmailInviteInput
              emails={emails}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              onAdd={addEmail}
              onRemove={removeEmail}
              onKeyDown={handleKeyDown}
            />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">Back</Button>
              <Button
                onClick={handleCreateNewList}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                Create & Invite
              </Button>
            </div>
          </div>
        )}

        {step === "existing" && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Task List</Label>
              <div className="space-y-2">
                {teams.map(team => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      selectedTeamId === team.id
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 hover:border-purple-200"
                    }`}
                  >
                    <p className="font-medium text-gray-800">{team.name}</p>
                    <p className="text-xs text-gray-500">{(team.member_ids?.length || 0) + 1} member{(team.member_ids?.length || 0) !== 0 ? 's' : ''}</p>
                  </button>
                ))}
              </div>
            </div>
            <EmailInviteInput
              emails={emails}
              emailInput={emailInput}
              setEmailInput={setEmailInput}
              onAdd={addEmail}
              onRemove={removeEmail}
              onKeyDown={handleKeyDown}
            />
            <div className="flex gap-2 pt-1">
              <Button variant="outline" onClick={() => setStep("choose")} className="flex-1">Back</Button>
              <Button
                onClick={handleInviteToExisting}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-teal-500 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                Send Invites
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmailInviteInput({ emails, emailInput, setEmailInput, onAdd, onRemove, onKeyDown }) {
  return (
    <div className="space-y-1.5">
      <Label>Invite by Email</Label>
      <div className="flex gap-2">
        <Input
          placeholder="colleague@example.com"
          value={emailInput}
          onChange={e => setEmailInput(e.target.value)}
          onKeyDown={onKeyDown}
          type="email"
        />
        <Button variant="outline" onClick={onAdd} className="shrink-0">Add</Button>
      </div>
      {emails.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {emails.map(email => (
            <Badge key={email} variant="secondary" className="flex items-center gap-1 pr-1">
              <Mail className="w-3 h-3" />
              {email}
              <button onClick={() => onRemove(email)} className="ml-1 hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-500">Press Enter or comma to add multiple emails</p>
    </div>
  );
}