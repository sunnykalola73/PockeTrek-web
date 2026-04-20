"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, Household } from "@/lib/types";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Home, Copy, Check, LogOut, Download, Moon, Sun } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [joinMsg, setJoinMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [darkMode, setDarkMode] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setEmail(user.email ?? "");

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(prof);
    setFirstName(prof?.first_name ?? "");
    setLastName(prof?.last_name ?? "");

    if (prof?.household_id) {
      const { data: hh } = await supabase
        .from("households")
        .select("*")
        .eq("id", prof.household_id)
        .single();
      setHousehold(hh);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedDarkMode);
    if (savedDarkMode) {
      document.documentElement.classList.add("dark");
    }
  }, [loadData]);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
      })
      .eq("id", profile.id);

    setSaving(false);
    setEditingProfile(false);
    loadData();
  }

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
    loadData();
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  function toggleDarkMode() {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem("darkMode", String(newDarkMode));
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }

  async function exportCSV() {
    if (!profile?.household_id) return;
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("transaction_date", { ascending: false });

    if (!txs || txs.length === 0) return;

    const headers = ["Date", "Type", "Category", "Amount", "Payment Method", "Note"];
    const rows = txs.map((tx) => [
      tx.transaction_date,
      tx.transaction_type,
      tx.category,
      tx.amount,
      tx.payment_method,
      tx.note ?? "",
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
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="theme-card p-5 space-y-4"
      >
        {editingProfile ? (
          <>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center text-white text-xl font-bold shadow-md">
                {(firstName ?? "?").charAt(0).toUpperCase()}
              </div>
              <p className="text-sm text-[rgb(var(--text-secondary))]">{email}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                  First Name
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                  Last Name
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setEditingProfile(false);
                  setFirstName(profile?.first_name ?? "");
                  setLastName(profile?.last_name ?? "");
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[rgb(var(--text-secondary))]"
              >
                Cancel
              </button>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white gradient-accent disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-4 flex-1">
                <div className="w-14 h-14 rounded-2xl gradient-accent flex items-center justify-center text-white text-xl font-bold shadow-md">
                  {(profile?.first_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {profile?.first_name ?? ""} {profile?.last_name ?? ""}
                  </p>
                  <p className="text-sm text-[rgb(var(--text-secondary))]">{email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProfile(true)}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/20 transition-colors"
              >
                Edit
              </button>
            </div>
          </>
        )}
      </motion.div>

      {/* Household */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="theme-card p-5 space-y-4"
      >
        <div className="flex items-center gap-3 mb-2">
          <Home size={20} className="text-[rgb(var(--accent))]" />
          <h2 className="font-bold">Your Household</h2>
        </div>

        {household ? (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                Ledger Name
              </p>
              <p className="font-medium">{household.name}</p>
            </div>
            <div>
              <p className="text-xs text-[rgb(var(--text-secondary))] mb-2">
                Invite Code
              </p>
              <div className="flex gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-[rgb(var(--bg-secondary))] text-xs font-mono truncate">
                  {household.id}
                </code>
                <button
                  onClick={copyInvite}
                  className="px-3 py-2 rounded-lg bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/20 transition-colors"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="text-xs text-[rgb(var(--text-secondary))] mt-2">
                Share this code with your partner to join your ledger.
              </p>
            </div>
          </>
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
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-accent disabled:opacity-50 whitespace-nowrap"
              >
                Join
              </button>
            </div>
            {joinMsg && (
              <p className="text-sm text-[rgb(var(--accent))]">{joinMsg}</p>
            )}
          </div>
        )}
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <button
          onClick={exportCSV}
          className="theme-card p-4 w-full flex items-center gap-4 hover:bg-[rgb(var(--bg-secondary))] transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white">
            <Download size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm">Export CSV</p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              Download all transactions
            </p>
          </div>
        </button>

        <button
          onClick={toggleDarkMode}
          className="theme-card p-4 w-full flex items-center gap-4 hover:bg-[rgb(var(--bg-secondary))] transition-colors text-left"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${darkMode
                ? "bg-[rgb(var(--accent-secondary))]"
                : "bg-[rgb(var(--accent))]"
              }`}
          >
            {darkMode ? <Moon size={18} /> : <Sun size={18} />}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm">
              {darkMode ? "Dark Mode" : "Light Mode"}
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              {darkMode ? "Currently enabled" : "Currently enabled"}
            </p>
          </div>
          <div
            className={`w-12 h-7 rounded-full transition-colors ${darkMode ? "bg-[rgb(var(--accent))]" : "bg-[rgb(var(--bg-secondary))]"
              } flex items-center p-1`}
          >
            <motion.div
              layout
              className="w-5 h-5 bg-white rounded-full"
              initial={false}
              animate={{ x: darkMode ? 20 : 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          </div>
        </button>

        <button
          className="theme-card p-4 w-full flex items-center gap-4 hover:bg-[rgb(var(--expense))]/5 transition-colors text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-[rgb(var(--expense))]/10 flex items-center justify-center text-[rgb(var(--expense))]">
            <LogOut size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm text-[rgb(var(--expense))]">
              Sign Out
            </p>
            <p className="text-xs text-[rgb(var(--text-secondary))]">
              Log out of PockeTrek
            </p>
          </div>
        </button>
      </motion.div>
    </div>
  );
}
