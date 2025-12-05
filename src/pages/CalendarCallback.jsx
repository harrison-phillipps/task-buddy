import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function CalendarCallback() {
  const [status, setStatus] = useState("processing");
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      const errorParam = urlParams.get("error");

      if (errorParam) {
        setStatus("error");
        setError("Authorization was denied");
        return;
      }

      if (!code) {
        setStatus("error");
        setError("No authorization code received");
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/CalendarCallback`;
        
        // Exchange code for tokens
        const result = await base44.functions.google_calendar.exchange_code({
          code,
          redirect_uri: redirectUri
        });

        if (result.error) {
          setStatus("error");
          setError("Failed to exchange authorization code");
          return;
        }

        // Save tokens to user profile
        await base44.auth.updateMe({
          google_calendar_connected: true,
          google_calendar_refresh_token: result.refresh_token
        });

        setStatus("success");
        
        // Close popup after success
        setTimeout(() => {
          window.close();
        }, 2000);
      } catch (err) {
        console.error("Callback error:", err);
        setStatus("error");
        setError(err.message || "An error occurred");
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-teal-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {status === "processing" && (
          <>
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connecting...</h2>
            <p className="text-gray-600">Please wait while we connect your Google Calendar</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connected!</h2>
            <p className="text-gray-600">Your Google Calendar is now connected. This window will close automatically.</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Failed</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => window.close()}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}