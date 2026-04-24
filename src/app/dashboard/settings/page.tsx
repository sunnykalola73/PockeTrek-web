"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Household } from "@/lib/types";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Copy, Check, LogOut, Download, Users, Mail, Shield, Tags } from "lucide-react";
import CategoryManagerModal from "@/components/CategoryManagerModal";
import { useData } from "@/lib/data";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const { profile, household, profilesMap, transactions, refresh } = useData();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);

  const memberCount = Object.keys(profilesMap).length;
  const loading = !profile;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setEmail(user.email);
    });
  }, [supabase]);

  async function copyInvite() {
    if (!household) return;
    await navigator.clipboard.writeText(household.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function joinHousehold() {
    if (!inviteCode.trim() || !profile) return;
    setJoining(true);
    setJoinMsg(null);

    const { data: existing } = await supabase
      .from("households")
      .select("id, name")
      .eq("id", inviteCode.trim())
      .single();

    if (!existing) {
      setJoinMsg("Invalid invite code");
      setJoining(false);
      return;
    }

    await supabase
      .from("profiles")
      .update({ household_id: existing.id })
      .eq("id", profile.id);

    setJoinMsg(`Joined "${existing.name}" successfully!`);
    setJoining(false);
    refresh();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function exportCSV() {
    if (!profile?.household_id) return;
    if (!transactions || transactions.length === 0) return;

    const headers = ["Date", "Type", "Category", "Amount", "Payment Method", "Note"];
    const rows = transactions.map((tx) => [
      tx.transaction_date,
      tx.transaction_type,
      tx.category,
      tx.amount,
      tx.payment_method,
      `"${(tx.note ?? "").replace(/"/g, '""')}"`,
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pocketrek-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-[80px]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <h1 className="text-[1.75rem] font-bold tracking-tight">Settings</h1>

      {/* ── Profile ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-card p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center text-white text-2xl font-bold shadow-md shadow-[rgb(var(--accent))]/15">
            {(profile?.first_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg tracking-tight">
              {profile?.first_name ?? ""} {profile?.last_name ?? ""}
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-[rgb(var(--text-secondary))]">
              <Mail size={13} />
              {email}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Household ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="theme-card p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgb(var(--accent))]/8 flex items-center justify-center">
            <Home size={18} className="text-[rgb(var(--accent))]" />
          </div>
          <h2 className="font-bold text-[0.9375rem]">Household</h2>
        </div>

        {household ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[rgb(var(--text-secondary))]">Ledger</span>
              <span className="font-semibold text-sm">{household.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[rgb(var(--text-secondary))]">Members</span>
              <span className="badge bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))]">
                <Users size={11} /> {memberCount}
              </span>
            </div>

            <div className="divider" />

            <div>
              <p className="section-label mb-2">Invite Code</p>
              <div className="flex gap-2">
                <code className="flex-1 px-4 py-2.5 rounded-[var(--radius-md)] bg-[rgb(var(--bg-secondary))] text-xs font-mono truncate border border-[rgba(var(--border),0.4)] flex items-center">
                  {household.id}
                </code>
                <button
                  onClick={copyInvite}
                  className={`px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
                    copied
                      ? "bg-[rgb(var(--safe))]/10 text-[rgb(var(--safe))]"
                      : "bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/15"
                  }`}
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-[11px] text-[rgb(var(--text-secondary))] mt-2">
                Share this code with your partner to join your ledger
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-[rgb(var(--text-secondary))]">
              Join a household with an invite code:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="font-mono text-sm"
              />
              <button
                onClick={joinHousehold}
                disabled={joining}
                className="btn-primary !text-sm !px-5 whitespace-nowrap"
              >
                Join
              </button>
            </div>
            {joinMsg && (
              <p className="text-sm text-[rgb(var(--accent))] font-medium">{joinMsg}</p>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-2.5"
      >
        <p className="section-label mb-1 px-1">Actions</p>

        <button
          onClick={() => setShowCatModal(true)}
          className="theme-card p-4 w-full flex items-center gap-4 hover:border-[rgb(var(--accent))]/30 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgb(var(--accent))]/10 flex items-center justify-center text-[rgb(var(--accent))] shadow-sm">
            <Tags size={17} />
          </div>
          <div>
            <p className="font-semibold text-sm">Manage Categories</p>
            <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5">
              Add, edit, or remove transaction categories
            </p>
          </div>
        </button>

        <button
          onClick={exportCSV}
          className="theme-card p-4 w-full flex items-center gap-4 hover:border-[rgb(var(--accent))]/30 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-[var(--radius-md)] gradient-accent flex items-center justify-center text-white shadow-sm">
            <Download size={17} />
          </div>
          <div>
            <p className="font-semibold text-sm">Export Transactions</p>
            <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5">
              Download all data as CSV
            </p>
          </div>
        </button>

        <button
          onClick={signOut}
          className="theme-card p-4 w-full flex items-center gap-4 hover:border-[rgb(var(--expense))]/30 transition-all text-left"
        >
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgb(var(--expense))]/8 flex items-center justify-center text-[rgb(var(--expense))]">
            <LogOut size={17} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[rgb(var(--expense))]">Sign Out</p>
            <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5">
              Log out of your account
            </p>
          </div>
        </button>
      </motion.div>

      {/* ── Footer ── */}
      <div className="text-center pt-4">
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-[rgb(var(--text-secondary))]">
          <Shield size={11} />
          PockeTrek · Your data stays private
        </div>
      </div>

      <AnimatePresence>
        {showCatModal && (
          <CategoryManagerModal onClose={() => setShowCatModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
