"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, Wallet } from "lucide-react";

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
        householdId = inviteCode.trim();
        const { data: existingHousehold } = await supabase
          .from("households")
          .select("id")
          .eq("id", householdId)
          .maybeSingle();

        if (!existingHousehold) {
          setError("Invalid invite code. No household found.");
          setLoading(false);
          return;
        }
      } else {
        const hName = ledgerName.trim() || `${firstName}'s Ledger`;
        const generatedHouseholdId = crypto.randomUUID();
        
        const { error: hError } = await supabase
          .from("households")
          .insert({ id: generatedHouseholdId, name: hName });
          
        if (hError) {
          setError("Failed to create household.");
          setLoading(false);
          return;
        }
        householdId = generatedHouseholdId;
      }

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
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgb(var(--accent))] via-[rgb(var(--accent-secondary))] to-[#14142e]" />
      <div className="absolute inset-0">
        <div className="absolute top-[-25%] left-[-15%] w-[55%] h-[55%] rounded-full bg-[rgb(var(--accent))]/40 blur-[100px]" />
        <div className="absolute bottom-[-25%] right-[-15%] w-[45%] h-[45%] rounded-full bg-[rgb(var(--accent-secondary))]/30 blur-[80px]" />
        <div className="absolute top-[40%] right-[15%] w-[20%] h-[20%] rounded-full bg-white/[0.03] blur-[60px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[420px]"
      >
        {/* Logo */}
        <motion.div
          animate={{ y: [-5, 5, -5] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex justify-center mb-7"
        >
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center shadow-xl shadow-black/20 ring-1 ring-white/10">
            <Wallet className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        {/* Card */}
        <div className="glass rounded-[var(--radius-hero)] p-7 shadow-2xl shadow-black/20">
          <div className="text-center mb-7">
            <h1 className="text-[1.5rem] font-bold text-white tracking-tight">
              {isSignUp ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="text-white/50 text-sm mt-1.5">
              {isSignUp
                ? "Set up your family finance ledger"
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
                  className="space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="First name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 !rounded-[var(--radius-md)]"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Last name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 !rounded-[var(--radius-md)]"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Ledger name (e.g. The Smiths)"
                    value={ledgerName}
                    onChange={(e) => setLedgerName(e.target.value)}
                    className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 !rounded-[var(--radius-md)]"
                  />

                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-white/15" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-[11px] text-white/40 uppercase tracking-wider font-semibold bg-transparent">
                        or join existing
                      </span>
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder="Invite code (optional)"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 font-mono text-sm !rounded-[var(--radius-md)]"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 !rounded-[var(--radius-md)]"
              required
            />

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="!bg-white/8 !border-white/15 !text-white placeholder:!text-white/35 !pr-12 !rounded-[var(--radius-md)]"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="text-sm text-red-300 bg-red-500/15 rounded-[var(--radius-md)] px-4 py-2.5 text-center font-medium"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-[var(--radius-md)] font-semibold text-white bg-white/15 hover:bg-white/20 border border-white/20 shadow-lg shadow-black/10 transition-all duration-200 disabled:opacity-40 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Create Account" : "Sign In"}
                  <ArrowRight size={16} />
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
              className="text-sm text-white/45 hover:text-white/75 transition-colors"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/25 mt-6 flex items-center justify-center gap-1.5">
          <Shield size={11} />
          Secured with end-to-end encryption
        </p>
      </motion.div>
    </div>
  );
}
