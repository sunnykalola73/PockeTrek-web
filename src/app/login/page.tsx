"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [ledgerName, setLedgerName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleSignUp() {
    setLoading(true);
    setError(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setError("Sign-up succeeded but no user ID was returned.");
      setLoading(false);
      return;
    }

    try {
      let householdId: string;

      if (inviteCode.trim()) {
        // Join existing household
        householdId = inviteCode.trim();
        const { data: existingHousehold } = await supabase
          .from("households")
          .select("id")
          .eq("id", householdId)
          .single();

        if (!existingHousehold) {
          setError("Invalid invite code. No household found.");
          setLoading(false);
          return;
        }
      } else {
        // Create new household
        const hName = ledgerName.trim() || `${firstName}'s Ledger`;
        const { data: newHousehold, error: hError } = await supabase
          .from("households")
          .insert({ name: hName, created_by: userId })
          .select()
          .single();
        if (hError || !newHousehold) {
          setError("Failed to create household.");
          setLoading(false);
          return;
        }
        householdId = newHousehold.id;
      }

      // Create profile
      await supabase.from("profiles").insert({
        id: userId,
        first_name: firstName,
        last_name: lastName,
        household_id: householdId,
      });

      router.push("/dashboard");
    } catch {
      setError("Something went wrong during setup.");
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSignUp) handleSignUp();
    else handleSignIn();
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))] via-[rgb(var(--accent-secondary))] to-[#1a1a3e]" />
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-[rgb(var(--accent))] blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[rgb(var(--accent-secondary))] blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Floating shield icon */}
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="flex justify-center mb-6"
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-[rgb(var(--accent))]/30">
            <Shield className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        {/* Card */}
        <div className="glass rounded-[var(--radius-hero)] p-8 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-white/60 text-sm mt-2">
              {isSignUp
                ? "Set up your family ledger"
                : "Sign in to manage your finances"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Ledger name (e.g. The Smiths)"
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40"
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/20" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 text-white/50 bg-transparent">
                        or join with invite code
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Invite code (optional)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 font-mono text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!bg-white/10 !border-white/20 !text-white placeholder:!text-white/40 pr-12"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-300 bg-red-500/20 rounded-xl px-4 py-2.5 text-center"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white gradient-accent shadow-lg shadow-[rgb(var(--accent))]/25 hover:shadow-[rgb(var(--accent))]/40 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
              }}
              className="text-sm text-white/60 hover:text-white/90 transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
