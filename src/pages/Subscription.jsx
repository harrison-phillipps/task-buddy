import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Check, Zap, Sparkles, Crown, ArrowRight, XCircle, AlertTriangle, RefreshCw, CreditCard, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { TIER_INFO } from "../components/subscription/FeatureGate";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const plansData = [
  {
    tier: "free",
    name: "Free",
    priceMonthly: "$0",
    priceYearly: "$0",
    period: "forever",
    description: "Get started with basic productivity tools",
    features: [
      "Up to 10 active tasks",
      "Basic brain dumps (2/day)",
      "Focus sessions (3/day)",
      "Basic achievements",
      "1 companion type"
    ],
    limitations: [
      "No AI prioritization",
      "No calendar sync",
      "Limited analytics"
    ],
    cta: "Current Plan",
    popular: false
  },
  {
    tier: "pro",
    name: "Pro",
    priceMonthly: "A$9.99",
    priceYearly: "A$99",
    savingsYearly: "Save A$20",
    period: "per month",
    description: "Supercharge your productivity with AI",
    features: [
      "Up to 100 active tasks",
      "Unlimited brain dumps",
      "Unlimited focus sessions",
      "AI Task Prioritization",
      "Goal setting & tracking",
      "Google Calendar sync",
      "Advanced analytics & charts",
      "Smart Daily Plan",
      "Voice to Tasks",
      "Calendar Gap Filler",
      "Proactive AI coaching",
      "Smart task recommendations",
      "Daily Schedule Planner",
      "All ambient sounds & Spotify",
      "All achievements"
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    tier: "premium",
    name: "Premium",
    priceMonthly: "A$19.99",
    priceYearly: "A$199",
    savingsYearly: "Save A$40",
    period: "per month",
    description: "The ultimate productivity experience",
    features: [
      "Everything in Pro",
      "Unlimited tasks",
      "AI Task Breakdown",
      "Team collaboration & shared tasks",
      "Team workload dashboard",
      "@mentions in task comments",
      "Strategic progress coaching",
      "Energy-aware AI coaching",
      "AI coaching bots suite",
      "Custom companion personalities",
      "Priority support",
      "Export your data",
      "Early access to new features"
    ],
    limitations: [],
    cta: "Go Premium",
    popular: false
  }
];

export default function Subscription() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [subStatus, setSubStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchSubStatus = async () => {
    setStatusLoading(true);
    try {
      const res = await base44.functions.invoke('getSubscriptionStatus', {});
      setSubStatus(res.data);
    } catch (e) {
      console.error('Failed to fetch subscription status', e);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        fetchSubStatus();
        const params = new URLSearchParams(window.location.search);
        if (params.get('success') === 'true') {
          setTimeout(fetchSubStatus, 2000); // re-fetch after webhook processes
          window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('cancelled') === 'true') {
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const currentTier = currentUser?.subscription_tier || "free";

  const handleSelectPlan = async (tier) => {
    if (tier === currentTier) return;
    if (tier === 'free') return; // Can't "purchase" free tier
    
    // Check if running in iframe (preview mode)
    if (window.self !== window.top) {
      alert('💳 Checkout is only available in the published app. Please open your app in a new tab to subscribe.');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('createCheckout', {
        tier,
        billingPeriod
      });
      
      if (response.data.url) {
        // Redirect to Stripe checkout
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert('Failed to create checkout session. Please try again.');
      setIsLoading(false);
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  const handleCancelSubscription = async () => {
    if (window.self !== window.top) {
      alert('Cancellation is only available in the published app.');
      return;
    }
    setIsCancelling(true);
    try {
      const response = await base44.functions.invoke('cancelSubscription', {});
      if (response.data?.success) {
        const cancelDate = new Date(response.data.cancel_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' });
        setCurrentUser(prev => ({ ...prev, subscription_cancel_at: response.data.cancel_at }));
        setCancelConfirmOpen(false);
        alert(`Your subscription has been cancelled. You'll keep access to your current plan until ${cancelDate}.`);
      } else {
        throw new Error(response.data?.error || 'Cancellation failed');
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      alert('Failed to cancel subscription. Please try again or contact support@taskbuddy.app');
    } finally {
      setIsCancelling(false);
    }
  };

  const TierIcon = ({ tier }) => {
    const info = TIER_INFO[tier];
    const Icon = info?.icon || Zap;
    return <Icon className={`w-6 h-6 ${info?.color}`} />;
  };

  const plans = plansData.map(plan => ({
    ...plan,
    price: billingPeriod === "yearly" ? plan.priceYearly : plan.priceMonthly,
    period: billingPeriod === "yearly" ? "per year" : plan.period
  }));

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-teal-600 bg-clip-text text-transparent">
            Choose Your Plan
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Unlock powerful features to supercharge your productivity journey
          </p>
          
          <div className="flex justify-center mt-8">
            <Tabs value={billingPeriod} onValueChange={setBillingPeriod} className="w-auto">
              <TabsList className="bg-gray-100">
                <TabsTrigger value="monthly" className="px-6">Monthly</TabsTrigger>
                <TabsTrigger value="yearly" className="px-6 relative">
                  Yearly
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] px-1.5">
                    Save 17%
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.tier === currentTier;
            const isUpgrade = plans.findIndex(p => p.tier === currentTier) < index;
            
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`relative h-full ${
                  plan.popular 
                    ? 'border-2 border-purple-500 shadow-xl' 
                    : 'border-gray-200'
                } ${isCurrentPlan ? 'ring-2 ring-green-500' : ''}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-purple-500 to-teal-500 text-white px-4">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-500 text-white">
                        Current Plan
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className={`w-14 h-14 mx-auto mb-4 ${TIER_INFO[plan.tier]?.bgColor} rounded-2xl flex items-center justify-center`}>
                      <TierIcon tier={plan.tier} />
                    </div>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-gray-500 ml-1">/{plan.period}</span>
                    </div>
                    {billingPeriod === "yearly" && plan.savingsYearly && (
                      <Badge variant="outline" className="mt-2 bg-green-50 text-green-700 border-green-200">
                        {plan.savingsYearly}
                      </Badge>
                    )}
                    <p className="text-sm text-gray-600 mt-2">{plan.description}</p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${TIER_INFO[plan.tier]?.color}`} />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    {plan.limitations.length > 0 && (
                      <div className="pt-2 border-t space-y-2">
                        {plan.limitations.map((limitation, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                            <span className="w-4 text-center">✕</span>
                            <span>{limitation}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      onClick={() => handleSelectPlan(plan.tier)}
                      disabled={isCurrentPlan || isLoading}
                      className={`w-full mt-4 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-purple-500 to-teal-500 hover:from-purple-600 hover:to-teal-600 text-white'
                          : isUpgrade
                            ? 'bg-gray-900 hover:bg-gray-800 text-white'
                            : ''
                      }`}
                      variant={plan.popular ? "default" : isUpgrade ? "default" : "outline"}
                    >
                      {isCurrentPlan ? (
                        "Current Plan"
                      ) : (
                        <>
                          {plan.cta}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Live Subscription Status Card */}
        {subStatus && subStatus.status !== 'none' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-10"
          >
            <Card className="bg-gradient-to-r from-purple-50 to-teal-50 dark:from-purple-900/20 dark:to-teal-900/20 border-purple-200 dark:border-purple-700">
              <CardHeader className="pb-3">
                <CardTitle className="text-purple-800 dark:text-purple-300 flex items-center justify-between">
                  <span className="flex items-center gap-2"><CreditCard className="w-5 h-5" /> Billing Details</span>
                  <button onClick={fetchSubStatus} className="text-purple-500 hover:text-purple-700">
                    <RefreshCw className={`w-4 h-4 ${statusLoading ? 'animate-spin' : ''}`} />
                  </button>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs mb-1">Status</p>
                  <Badge className={subStatus.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}>
                    {subStatus.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Plan</p>
                  <p className="font-semibold capitalize">{subStatus.tier} · {subStatus.billing_interval}ly</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1">Amount</p>
                  <p className="font-semibold">{subStatus.currency} ${subStatus.amount} / {subStatus.billing_interval}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" />{subStatus.cancel_at_period_end ? 'Access Until' : 'Next Renewal'}</p>
                  <p className="font-semibold">{subStatus.current_period_end ? new Date(subStatus.current_period_end).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            All plans include a 14-day free trial. Cancel anytime.
          </p>
          <p className="text-gray-400 text-xs mt-2">
            Questions? Contact us at support@taskbuddy.app
          </p>
        </motion.div>

        {/* Cancel Subscription Section */}
        {currentUser?.subscription_tier && currentUser.subscription_tier !== "free" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-12"
          >
            <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
              <CardHeader>
                <CardTitle className="text-red-800 dark:text-red-400 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Cancel Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentUser?.subscription_cancel_at ? (
                  <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-orange-800 dark:text-orange-400">Cancellation scheduled</p>
                      <p className="text-sm text-orange-700 dark:text-orange-500 mt-1">
                        Your subscription will end on <strong>{new Date(currentUser.subscription_cancel_at).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>. You'll keep full access until then.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-red-700 dark:text-red-400">
                      If you cancel, you'll keep access to your current plan until the end of your billing period, then be moved to the Free plan.
                    </p>
                    <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                          Cancel My Subscription
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
                          <AlertDialogDescription>
                            You'll keep access to <strong>{currentTier === 'pro' ? 'Pro' : 'Premium'}</strong> features until the end of your current billing period. After that, your account will be downgraded to the Free plan and you'll lose access to premium features.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep My Subscription</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCancelSubscription}
                            disabled={isCancelling}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {isCancelling ? 'Cancelling...' : 'Yes, Cancel'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}