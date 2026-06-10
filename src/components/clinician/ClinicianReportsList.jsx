import React from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";

export default function ClinicianReportsList({ reports }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Recent Reports</h2>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 p-10 text-center bg-white/50 dark:bg-white/5">
          <FileText className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">No reports generated yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl bg-white/70 dark:bg-white/5 border border-purple-100 dark:border-purple-900/40 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {report.client_display_name || "Client"}
                    </p>
                    {report.generated_date && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {format(new Date(report.generated_date), "d MMM yyyy")}
                      </span>
                    )}
                    {report.report_period_start && report.report_period_end && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                        {format(new Date(report.report_period_start), "d MMM")} – {format(new Date(report.report_period_end), "d MMM yyyy")}
                      </span>
                    )}
                    {report.completion_rate != null && (
                      <span className="text-xs bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 font-medium px-2 py-0.5 rounded-full">
                        {report.completion_rate}% completion
                      </span>
                    )}
                  </div>
                  {report.narrative_summary && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                      {report.narrative_summary}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs"
                  onClick={() => toast("PDF export coming soon", { icon: "📄" })}
                >
                  <Download className="w-3 h-3 mr-1" />
                  PDF
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}