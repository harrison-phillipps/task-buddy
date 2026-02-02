import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Sparkles, Crown, ArrowRight, XCircle } from "lucide-react";
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
    priceMonthly: "$9.99",
    priceYearly: "$99",
    savingsYearly: "Save $20",
    period: "per month",
    description: "Supercharge your productivity with AI",
    features: [
      "Up to 100 active tasks",
      "Unlimited brain dumps",
      "Unlimited focus sessions",
      "AI Task Prioritization",
      "Goal setting & tracking",
      "Habit tracking",
      "Google Calendar sync",
      "Advanced analytics",
      "All ambient sounds",
      "All achievements"
    ],
    limitations: [],
    cta: "Upgrade to Pro",
    popular: true
  },
  {
    tier: "premium",
    name: "Premium",
    priceMonthly: "$19.99",
    priceYearly: "$199",
    savingsYearly: "Save $40",
    period: "per month",
    description: "The ultimate productivity experience",
    features: [
      "Everything in Pro",
      "Unlimited tasks",
      "AI Task Breakdown",
      "Team collaboration",
      "Shared goals & tasks",
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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        
        // Check for success/cancel query params
        const params = new URLSearchParams(window.location.hash.split('?')[1]);
        if (params.get('success') === 'true') {
          alert('🎉 Subscription successful! Welcome to your new plan.');
          // Clean up URL
          window.history.replaceState({}, '', '#/Subscription');
        } else if (params.get('cancelled') === 'true') {
          alert('Checkout cancelled. No charges were made.');
          window.history.replaceState({}, '', '#/Subscription');
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

  const handleCancelSubscription = async () => {
    if (!confirm("Are you sure you want to cancel your subscription? You'll be downgraded to the Free plan at the end of your billing period.")) {
      return;
    }
    
    alert("To cancel your subscription, please contact support@taskbuddy.app or manage your subscription in the Stripe customer portal. We'll add self-service cancellation soon!");
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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 text-center"
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
            <Card className="bg-red-50 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Cancel Subscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-red-700">
                  If you cancel your subscription, you'll be moved to the Free plan and lose access to premium features.
                </p>
                <Button
                  onClick={handleCancelSubscription}
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Cancel My Subscription
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}