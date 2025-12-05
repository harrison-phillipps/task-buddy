import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Check } from "lucide-react";

export default function CharacterSelection() {
  const navigate = useNavigate();
  const [selectedCompanion, setSelectedCompanion] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const user = await base44.auth.me();
        // If user hasn't completed onboarding, redirect there first
        if (!user.display_name) {
          navigate(createPageUrl("Onboarding"));
        }
      } catch (error) {
        console.error("Error checking user:", error);
      }
    };
    checkUser();
  }, [navigate]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      navigate(createPageUrl("Dashboard"));
    },
  });

  const handleSelection = () => {
    if (!selectedCompanion) return;
    updateUserMutation.mutate({ companion_type: selectedCompanion });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-100 via-pink-100 to-yellow-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl w-full space-y-8"
      >
        <div className="text-center space-y-3">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
            Choose who you'd like to work with
          </h1>
          <p className="text-lg text-gray-600">
            Your companion will stay with you while you work. You can change this anytime.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Soft Human Option */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => setSelectedCompanion('human')}
              className={`cursor-pointer transition-all duration-300 ${
                selectedCompanion === 'human'
                  ? 'ring-4 ring-purple-500 shadow-2xl bg-white'
                  : 'hover:shadow-xl bg-white/80'
              }`}
            >
              <CardContent className="p-8 text-center relative">
                {selectedCompanion === 'human' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}
                
                {/* Human Character */}
                <div className="mb-6 flex justify-center">
                  <div className="relative w-48 h-56">
                    {/* Head */}
                    <div className="absolute w-24 h-24 top-0 left-1/2 -translate-x-1/2">
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-200 to-orange-300 shadow-2xl border-4 border-white relative overflow-hidden">
                        {/* Hair */}
                        <div className="absolute -top-1 left-0 w-full h-20 bg-gradient-to-b from-amber-700 to-amber-600 rounded-t-full" />
                        <div className="absolute top-4 -left-2 w-12 h-20 bg-gradient-to-b from-amber-700 to-amber-600 rounded-full" />
                        <div className="absolute top-4 -right-2 w-12 h-20 bg-gradient-to-b from-amber-700 to-amber-600 rounded-full" />
                        
                        {/* Face */}
                        <div className="absolute inset-0 flex items-center justify-center pt-6">
                          {/* Eyes */}
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-3">
                            <div className="bg-gray-800 rounded-full w-3 h-3" />
                            <div className="bg-gray-800 rounded-full w-3 h-3" />
                          </div>
                          {/* Smile */}
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-8 h-4 border-b-3 border-gray-800 rounded-b-full" style={{ borderBottomWidth: '2px' }} />
                        </div>
                      </div>
                    </div>

                    {/* Body - Sweater */}
                    <div className="absolute top-20 w-32 h-28 left-1/2 -translate-x-1/2">
                      <div className="w-full h-full rounded-t-3xl rounded-b-2xl bg-gradient-to-br from-orange-300 to-orange-400 border-4 border-white shadow-xl relative">
                        {/* Sweater texture */}
                        <div className="absolute inset-0 opacity-20">
                          <div className="absolute top-1/3 left-0 w-full h-1 bg-orange-600" />
                          <div className="absolute top-1/2 left-0 w-full h-1 bg-orange-600" />
                          <div className="absolute top-2/3 left-0 w-full h-1 bg-orange-600" />
                        </div>
                      </div>
                    </div>

                    {/* Arms */}
                    <div className="absolute top-24 -left-4 w-8 h-20 origin-top">
                      <div className="w-full h-full rounded-full bg-gradient-to-b from-orange-300 to-orange-400 border-2 border-white shadow-lg" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 border-2 border-white" />
                    </div>
                    <div className="absolute top-24 -right-4 w-8 h-20 origin-top">
                      <div className="w-full h-full rounded-full bg-gradient-to-b from-orange-300 to-orange-400 border-2 border-white shadow-lg" />
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-gradient-to-br from-orange-200 to-orange-300 border-2 border-white" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Soft Human</h3>
                <p className="text-gray-600">A warm, friendly companion</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Cozy Cat Option */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => setSelectedCompanion('cat')}
              className={`cursor-pointer transition-all duration-300 ${
                selectedCompanion === 'cat'
                  ? 'ring-4 ring-yellow-500 shadow-2xl bg-white'
                  : 'hover:shadow-xl bg-white/80'
              }`}
            >
              <CardContent className="p-8 text-center relative">
                {selectedCompanion === 'cat' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}

                {/* Cat Character */}
                <div className="mb-6 flex justify-center">
                  <div className="relative w-48 h-56 flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      {/* Cat body */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-28 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-t-[60px] rounded-b-3xl shadow-2xl border-4 border-white">
                        {/* Stripes */}
                        <div className="absolute top-8 left-4 w-6 h-1 bg-yellow-600 rounded opacity-50" />
                        <div className="absolute top-12 left-6 w-8 h-1 bg-yellow-600 rounded opacity-50" />
                        <div className="absolute top-8 right-4 w-6 h-1 bg-yellow-600 rounded opacity-50" />
                        <div className="absolute top-12 right-6 w-8 h-1 bg-yellow-600 rounded opacity-50" />
                      </div>

                      {/* Cat head */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-xl border-4 border-white">
                        {/* Ears */}
                        <div className="absolute -top-2 left-2 w-8 h-10 bg-gradient-to-br from-yellow-300 to-yellow-400 border-2 border-white" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                        <div className="absolute -top-2 right-2 w-8 h-10 bg-gradient-to-br from-yellow-300 to-yellow-400 border-2 border-white" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                        
                        {/* Inner ears */}
                        <div className="absolute top-1 left-4 w-4 h-5 bg-pink-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />
                        <div className="absolute top-1 right-4 w-4 h-5 bg-pink-200" style={{ clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' }} />

                        {/* Face */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Eyes - happy closed eyes */}
                          <div className="absolute top-10 left-1/2 -translate-x-1/2 flex gap-4">
                            <div className="w-5 h-2 border-b-2 border-gray-800 rounded-full" />
                            <div className="w-5 h-2 border-b-2 border-gray-800 rounded-full" />
                          </div>
                          
                          {/* Nose */}
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-400 rounded-sm rotate-45" />
                          
                          {/* Mouth - smile */}
                          <div className="absolute top-16 left-1/2 -translate-x-1/2">
                            <div className="flex gap-3">
                              <div className="w-3 h-2 border-b-2 border-gray-800 rounded-b-full" />
                              <div className="w-3 h-2 border-b-2 border-gray-800 rounded-b-full" />
                            </div>
                          </div>

                          {/* Whiskers */}
                          <div className="absolute top-12 -left-2 w-8 h-0.5 bg-gray-600" />
                          <div className="absolute top-14 -left-2 w-8 h-0.5 bg-gray-600" />
                          <div className="absolute top-12 -right-2 w-8 h-0.5 bg-gray-600" />
                          <div className="absolute top-14 -right-2 w-8 h-0.5 bg-gray-600" />
                        </div>
                      </div>

                      {/* Tail */}
                      <div className="absolute bottom-4 -right-6 w-16 h-6 bg-gradient-to-r from-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-white transform rotate-45" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Cozy Cat</h3>
                <p className="text-gray-600">A gentle, calming presence</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Playful Dog Option */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => setSelectedCompanion('dog')}
              className={`cursor-pointer transition-all duration-300 ${
                selectedCompanion === 'dog'
                  ? 'ring-4 ring-amber-500 shadow-2xl bg-white'
                  : 'hover:shadow-xl bg-white/80'
              }`}
            >
              <CardContent className="p-8 text-center relative">
                {selectedCompanion === 'dog' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}

                {/* Dog Character */}
                <div className="mb-6 flex justify-center">
                  <div className="relative w-48 h-56 flex items-center justify-center">
                    <div className="relative w-40 h-40">
                      {/* Dog body */}
                      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-28 bg-gradient-to-br from-amber-400 to-amber-500 rounded-t-[60px] rounded-b-3xl shadow-2xl border-4 border-white">
                        {/* Spots */}
                        <div className="absolute top-6 left-6 w-5 h-5 rounded-full bg-amber-700 opacity-40" />
                        <div className="absolute top-12 right-8 w-4 h-4 rounded-full bg-amber-700 opacity-40" />
                      </div>

                      {/* Dog head */}
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-28 bg-gradient-to-br from-amber-400 to-amber-500 rounded-full shadow-xl border-4 border-white">
                        {/* Floppy Ears */}
                        <div className="absolute top-2 -left-3 w-10 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full border-2 border-white transform -rotate-12" />
                        <div className="absolute top-2 -right-3 w-10 h-16 bg-gradient-to-br from-amber-500 to-amber-600 rounded-full border-2 border-white transform rotate-12" />

                        {/* Face */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* Eyes - big happy eyes */}
                          <div className="absolute top-9 left-1/2 -translate-x-1/2 flex gap-4">
                            <div className="w-3 h-3 bg-gray-800 rounded-full" />
                            <div className="w-3 h-3 bg-gray-800 rounded-full" />
                          </div>
                          
                          {/* Snout area */}
                          <div className="absolute top-13 left-1/2 -translate-x-1/2 w-16 h-12 bg-gradient-to-b from-amber-300 to-amber-400 rounded-full" />
                          
                          {/* Nose */}
                          <div className="absolute top-14 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-800 rounded-full" />
                          
                          {/* Mouth - big smile */}
                          <div className="absolute top-17 left-1/2 -translate-x-1/2 w-8 h-3 border-b-2 border-gray-800 rounded-b-full" />
                          
                          {/* Tongue */}
                          <div className="absolute top-[4.5rem] left-1/2 -translate-x-1/2 w-3 h-4 bg-pink-400 rounded-b-full" />
                        </div>
                      </div>

                      {/* Tail - wagging */}
                      <div className="absolute bottom-8 -right-8 w-12 h-24 bg-gradient-to-b from-amber-400 to-amber-500 rounded-full shadow-lg border-2 border-white transform rotate-45 origin-top" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Playful Dog</h3>
                <p className="text-gray-600">An energetic, cheerful friend</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Orb Option */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => setSelectedCompanion('orb')}
              className={`cursor-pointer transition-all duration-300 ${
                selectedCompanion === 'orb'
                  ? 'ring-4 ring-teal-500 shadow-2xl bg-white'
                  : 'hover:shadow-xl bg-white/80'
              }`}
            >
              <CardContent className="p-8 text-center relative">
                {selectedCompanion === 'orb' && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center"
                  >
                    <Check className="w-5 h-5 text-white" />
                  </motion.div>
                )}

                {/* Orb Character */}
                <div className="mb-6 flex justify-center">
                  <div className="relative w-48 h-56 flex items-center justify-center">
                    <div className="relative">
                      {/* Glow effect */}
                      <div className="absolute inset-0 w-32 h-32 bg-gradient-to-br from-purple-400 via-teal-400 to-blue-400 rounded-full blur-xl opacity-50" />
                      
                      {/* Main orb */}
                      <div className="relative w-32 h-32 bg-gradient-to-br from-purple-500 via-teal-500 to-blue-500 rounded-full shadow-2xl border-4 border-white flex items-center justify-center overflow-hidden">
                        {/* Inner glow */}
                        <div className="absolute inset-4 bg-gradient-to-br from-white/40 to-transparent rounded-full" />
                        
                        {/* Face */}
                        <div className="relative z-10">
                          {/* Eyes */}
                          <div className="flex gap-4 mb-2">
                            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
                            <div className="w-3 h-3 bg-white rounded-full shadow-lg" />
                          </div>
                          {/* Smile */}
                          <div className="w-8 h-3 border-b-2 border-white rounded-b-full mx-auto" />
                        </div>
                        
                        {/* Sparkle effects */}
                        <div className="absolute top-4 right-6 w-2 h-2 bg-white rounded-full opacity-80" />
                        <div className="absolute top-8 right-4 w-1 h-1 bg-white rounded-full opacity-60" />
                      </div>
                      
                      {/* Floating particles */}
                      <div className="absolute -top-2 -left-2 w-3 h-3 bg-purple-300 rounded-full opacity-70" />
                      <div className="absolute -bottom-1 -right-3 w-2 h-2 bg-teal-300 rounded-full opacity-70" />
                      <div className="absolute top-1/2 -right-4 w-2 h-2 bg-blue-300 rounded-full opacity-70" />
                    </div>
                  </div>
                </div>

                <h3 className="text-2xl font-bold text-gray-900 mb-2">Magic Orb</h3>
                <p className="text-gray-600">A mystical, abstract guide</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={handleSelection}
            disabled={!selectedCompanion || updateUserMutation.isPending}
            className="w-full md:w-auto px-12 py-6 text-lg font-semibold bg-gradient-to-r from-purple-400 via-pink-400 to-yellow-400 hover:from-purple-500 hover:via-pink-500 hover:to-yellow-500 text-gray-900 rounded-full shadow-xl"
          >
            {updateUserMutation.isPending ? "Setting up..." : "Let's get started"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}