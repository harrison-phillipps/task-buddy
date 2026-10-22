import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Shown before the guest flow sends anything to AI. Adapted from the signed-in
// AITaskBreakdownConsentModal, narrowed to what a guest session actually sends
// (task text + energy + time; no account, no other fields).
export default function GuestAIConsent({ onContinue, onDecline, privacyUrl }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-2xl font-bold text-gray-900">Before we start</h2>
      </div>
      <p className="text-gray-500 mb-5">This uses AI. Here's exactly what that means.</p>

      <div className="bg-white border border-purple-100 rounded-2xl p-5 space-y-3 text-sm text-gray-700">
        <p>
          To break your task down, we send the task text you typed, plus the energy
          level and time you choose, to Anthropic, the company that makes the Claude
          AI model. Those same details go to our AI provider to write your
          end-of-session insight.
        </p>
        <p>
          We don't send your name, your email, or any other task. No account is
          created, and nothing is saved at this point.
        </p>
        <p>
          Anthropic doesn't use this data to train its AI models under our agreement
          with them.
        </p>
        {privacyUrl && (
          <a
            href={privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-purple-600 hover:underline font-medium"
          >
            Read our privacy policy
          </a>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-5">
        <Button onClick={onDecline} variant="outline" className="sm:flex-1">
          Not now
        </Button>
        <Button
          onClick={onContinue}
          className="sm:flex-1 bg-gradient-to-r from-purple-600 to-teal-500 text-white"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}