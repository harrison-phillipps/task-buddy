import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const PROVIDERS = [
  {
    id: "google",
    name: "Google Calendar",
    subtitle: "Gmail, Google Workspace",
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <rect x="6" y="6" width="36" height="36" rx="4" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
        <rect x="6" y="6" width="36" height="16" rx="4" fill="#4285F4"/>
        <rect x="6" y="14" width="36" height="8" fill="#4285F4"/>
        <rect x="6" y="22" width="36" height="20" fill="#fff" stroke="#e2e8f0" strokeWidth="1"/>
        <text x="24" y="37" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#4285F4">31</text>
        <rect x="14" y="3" width="3" height="8" rx="1.5" fill="#4285F4"/>
        <rect x="31" y="3" width="3" height="8" rx="1.5" fill="#4285F4"/>
      </svg>
    ),
  },
  {
    id: "outlook",
    name: "Outlook Calendar",
    subtitle: "Microsoft 365, Hotmail, Live",
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <rect x="4" y="8" width="26" height="32" rx="3" fill="#0078D4"/>
        <rect x="18" y="14" width="26" height="22" rx="3" fill="#28A8E8"/>
        <text x="17" y="30" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">O</text>
        <rect x="22" y="18" width="18" height="2" rx="1" fill="white" opacity="0.9"/>
        <rect x="22" y="23" width="14" height="2" rx="1" fill="white" opacity="0.7"/>
        <rect x="22" y="28" width="16" height="2" rx="1" fill="white" opacity="0.7"/>
      </svg>
    ),
  },
];

const PERMISSIONS = [
  {
    icon: (
      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
      </svg>
    ),
    title: "Create & update events",
    description: "Add focus sessions and task deadlines to your calendar automatically",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
      </svg>
    ),
    title: "Read upcoming events",
    description: "Show your existing schedule so TaskBuddy can plan around it",
  },
  {
    icon: (
      <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
      </svg>
    ),
    title: "Delete TaskBuddy events",
    description: "Clean up calendar events when tasks are completed or removed",
  },
];

function StepDots({ current, total = 3 }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`w-2 h-2 rounded-full transition-colors duration-300 ${i + 1 <= current ? "bg-teal-500" : "bg-slate-200"}`} />
      ))}
    </div>
  );
}

function ProviderCard({ provider, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(provider.id)}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        selected ? "border-teal-500 bg-teal-50 shadow-[0_0_0_3px_rgba(20,184,166,0.15)]" : "border-slate-200 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-white border border-slate-100 shadow-sm">
        {provider.icon}
      </div>
      <div className="flex-1">
        <p className="font-semibold text-slate-800 text-sm">{provider.name}</p>
        <p className="text-slate-400 text-xs mt-0.5">{provider.subtitle}</p>
      </div>
      <div className={`w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center flex-shrink-0 transition-all duration-200 ${selected ? "opacity-100 scale-100" : "opacity-0 scale-50"}`}>
        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
    </button>
  );
}

function StepChoose({ selected, onSelect, onContinue, onSkip }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-800">Connect your calendar</h1>
        <p className="text-slate-500 text-sm mt-2 leading-relaxed">
          Sync your focus sessions and task deadlines so nothing slips through the cracks.
        </p>
      </div>
      <div className="space-y-3 mb-8">
        {PROVIDERS.map((p) => (
          <ProviderCard key={p.id} provider={p} selected={selected === p.id} onSelect={onSelect} />
        ))}
      </div>
      <button
        onClick={onContinue}
        disabled={!selected}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
      >
        Continue
      </button>
      <button onClick={onSkip} className="w-full mt-3 py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors">
        Skip for now
      </button>
    </div>
  );
}

function StepPermissions({ provider, onConnect, onBack, isConnecting }) {
  const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? "Calendar";
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-slate-800">What TaskBuddy will access</h1>
        <p className="text-slate-500 text-sm mt-2">We only ask for what we need.</p>
      </div>
      <div className="space-y-3 mb-6">
        {PERMISSIONS.map((perm, i) => (
          <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              {perm.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{perm.title}</p>
              <p className="text-xs text-slate-400 mt-0.5">{perm.description}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl p-3 mb-8">
        <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
        </svg>
        <p className="text-xs text-red-500">We will <strong>never</strong> read your personal event details, emails, or contacts.</p>
      </div>
      <button
        onClick={onConnect}
        disabled={isConnecting}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isConnecting ? "Connecting..." : `Connect ${providerName}`}
      </button>
      <button onClick={onBack} className="w-full mt-3 py-2 text-slate-400 text-sm hover:text-slate-600 transition-colors">
        ← Back
      </button>
    </div>
  );
}

function StepSuccess({ provider, onDone }) {
  const providerName = PROVIDERS.find((p) => p.id === provider)?.name ?? "Calendar";
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
      <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-slate-800 mb-2">You're all synced up! 🎉</h1>
      <p className="text-slate-500 text-sm mb-8">
        {providerName} is connected. Your focus sessions and task deadlines will appear in your calendar automatically.
      </p>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      >
        Let's go →
      </button>
    </div>
  );
}

export default function CalendarOnboarding({ onComplete, onSkip }) {
  const [step, setStep] = useState(1);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const { updateUser } = useAuth();

  const handleConnect = async () => {
    if (!selectedProvider) return;
    setIsConnecting(true);
    setError(null);

    try {
      await updateUser({
        calendar_provider: selectedProvider,
        calendar_connected: true,
      });
      setStep(3);
    } catch (err) {
      console.error("Calendar connection error:", err);
      setError("Something went wrong connecting your calendar. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <StepDots current={step} total={3} />
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-sm text-center">
          {error}
        </div>
      )}
      {step === 1 && (
        <StepChoose
          selected={selectedProvider}
          onSelect={setSelectedProvider}
          onContinue={() => setStep(2)}
          onSkip={onSkip}
        />
      )}
      {step === 2 && (
        <StepPermissions
          provider={selectedProvider}
          onConnect={handleConnect}
          onBack={() => setStep(1)}
          isConnecting={isConnecting}
        />
      )}
      {step === 3 && (
        <StepSuccess
          provider={selectedProvider}
          onDone={() => onComplete(selectedProvider)}
        />
      )}
    </div>
  );
}