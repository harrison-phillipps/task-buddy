import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ClinicianStatsBar from "@/components/clinician/ClinicianStatsBar";
import ClinicianClientsList from "@/components/clinician/ClinicianClientsList";
import ClinicianInviteForm from "@/components/clinician/ClinicianInviteForm";
import ClinicianReportsList from "@/components/clinician/ClinicianReportsList";

export default function ClinicianDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        const profiles = await base44.entities.ClinicianProfile.filter({ user_id: user.id });
        if (profiles.length === 0) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        setProfile(profiles[0]);
        const allReports = await base44.entities.ClinicianReport.filter(
          { clinician_user_id: user.id },
          "-generated_date",
          10
        );
        setReports(allReports);
      } catch (err) {
        toast.error("Failed to load clinician dashboard");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const profiles = await base44.entities.ClinicianProfile.filter({ user_id: currentUser.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {
      toast.error("Failed to refresh client list");
    }
  };

  const refreshReports = async () => {
    if (!currentUser) return;
    const allReports = await base44.entities.ClinicianReport.filter(
      { clinician_user_id: currentUser.id },
      "-generated_date",
      10
    );
    setReports(allReports);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 text-center">
        <div className="text-5xl">🔒</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Clinician Access Only</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md">
          This page is for registered clinicians. You don't have a clinician profile linked to your account.
          Please contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  const now = new Date();
  const reportsThisMonth = reports.filter((r) => {
    const d = new Date(r.generated_date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const clientCount = profile?.clients?.length || 0;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-8">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            Clinician Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {profile?.organisation_name || "Your practice"} · {profile?.role_type?.replace(/_/g, " ") || "Clinician"}
            {profile?.ndis_provider && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                NDIS Provider
              </span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="shrink-0 text-xs border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
          My Tasks
        </Button>
      </div>

      <ClinicianStatsBar clientCount={clientCount} reportsThisMonth={reportsThisMonth} />

      <ClinicianClientsList
        profile={profile}
        currentUser={currentUser}
        onReportGenerated={refreshReports}
        onProfileRefresh={refreshProfile}
      />

      <ClinicianInviteForm profile={profile} currentUser={currentUser} onInviteSent={() => {}} />

      <ClinicianReportsList reports={reports} />
    </div>
  );
}