import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Smartphone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { format, addMinutes, parseISO } from "date-fns";

function pad(n) { return String(n).padStart(2, "0"); }

function toICSDate(dateStr, timeStr) {
  // dateStr: "YYYY-MM-DD", timeStr optional "HH:mm"
  if (timeStr) {
    const dt = parseISO(`${dateStr}T${timeStr}:00`);
    return [
      dt.getFullYear(),
      pad(dt.getMonth() + 1),
      pad(dt.getDate()),
      "T",
      pad(dt.getHours()),
      pad(dt.getMinutes()),
      "00",
    ].join("");
  }
  return dateStr.replace(/-/g, "");
}

function buildICS(tasks, focusSessions) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskBuddy//TaskBuddy//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:TaskBuddy Schedule",
    "X-WR-TIMEZONE:UTC",
  ];

  // Tasks with due dates
  tasks.forEach((task) => {
    if (!task.due_date || task.status === "completed") return;
    const uid = `task-${task.id}@taskbuddy`;
    const dtstart = toICSDate(task.due_date);
    const dtend = toICSDate(task.due_date);
    const summary = task.title.replace(/[,;\\]/g, "\\$&");
    const desc = task.description ? task.description.replace(/[\r\n]+/g, "\\n") : "";
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(format(new Date(), "yyyy-MM-dd"), format(new Date(), "HH:mm"))}`,
      `DTSTART;VALUE=DATE:${dtstart}`,
      `DTEND;VALUE=DATE:${dtend}`,
      `SUMMARY:📋 ${summary}`,
      desc ? `DESCRIPTION:${desc}` : "",
      `CATEGORIES:TaskBuddy,Tasks`,
      "END:VEVENT"
    );
  });

  // Focus sessions
  focusSessions.forEach((session) => {
    if (!session.created_date) return;
    const uid = `focus-${session.id}@taskbuddy`;
    const sessionDate = format(parseISO(session.created_date), "yyyy-MM-dd");
    const sessionTime = format(parseISO(session.created_date), "HH:mm");
    const dtstart = toICSDate(sessionDate, sessionTime);
    const endDt = addMinutes(parseISO(session.created_date), session.duration_minutes || 25);
    const dtend = toICSDate(format(endDt, "yyyy-MM-dd"), format(endDt, "HH:mm"));
    const summary = (session.task_title || "Focus Session").replace(/[,;\\]/g, "\\$&");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${toICSDate(format(new Date(), "yyyy-MM-dd"), format(new Date(), "HH:mm"))}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:⏱ ${summary}`,
      `DESCRIPTION:Focus session — ${session.duration_minutes || 25} min`,
      `CATEGORIES:TaskBuddy,FocusSession`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

export default function IOSCalendarExport() {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const [tasks, sessions] = await Promise.all([
        base44.entities.Task.filter({ status: ["not_started", "in_progress"] }),
        base44.entities.FocusSession.list("-created_date", 50),
      ]);

      const ics = buildICS(tasks, sessions);
      const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "taskbuddy-schedule.ics";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Calendar file downloaded — open it to add events to Apple Calendar");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate calendar file");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-2 border-gray-200 bg-gray-50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🍎</span>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-gray-600" />
                  iOS / Apple Calendar
                </h3>
              </div>
              <p className="text-sm text-gray-600">
                Export your tasks &amp; focus sessions as an <strong>.ics file</strong> — tap to import into the iPhone Calendar app
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Includes all active tasks with due dates + recent focus sessions
              </p>
            </div>
          </div>
          <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-gradient-to-r from-gray-700 to-gray-900 text-white hover:from-gray-800 hover:to-black"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
            ) : (
              <><Download className="w-4 h-4 mr-2" />Download .ics</>
            )}
          </Button>
        </div>
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
          <p className="font-semibold">📱 How to import on iPhone:</p>
          <ol className="list-decimal list-inside space-y-0.5 text-amber-700">
            <li>Tap "Download .ics" above</li>
            <li>On your iPhone, open the downloaded file</li>
            <li>Tap <strong>"Add All"</strong> when prompted by the Calendar app</li>
            <li>Your TaskBuddy schedule now appears in iOS Calendar 🎉</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}