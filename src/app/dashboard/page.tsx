"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction, Profile, Household } from "@/lib/types";
import { relativeDate } from "@/lib/dates";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import AddTransactionModal from "@/components/AddTransactionModal";

function getGreeting(): { emoji: string; text: string } {
  const h = new Date().getHours();
  if (h < 6) return { emoji: "✨", text: "Good night" };
  if (h < 12) return { emoji: "🌅", text: "Good morning" };
  if (h < 17) return { emoji: "☀️", text: "Good afternoon" };
  if (h < 21) return { emoji: "🌙", text: "Good evening" };
  return { emoji: "✨", text: "Good night" };
}

export default function DashboardPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);

  const totalIncome = transactions
    .filter((t) => t.transaction_type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpenses = transactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpenses;

  const greeting = getGreeting();

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Profile
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setProfile(prof);

    if (!prof?.household_id) {
      setLoading(false);
      return;
    }

    // Household
    const { data: hh } = await supabase
      .from("households")
      .select("*")
      .eq("id", prof.household_id)
      .single();
    setHousehold(hh);

    // Profiles map
    const { data: members } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("household_id", prof.household_id);
    const map: Record<string, string> = {};
    members?.forEach((m) => {
      map[m.id] = m.first_name ?? "User";
    });
    setProfilesMap(map);

    // Recent transactions (last 30)
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(30);
    setTransactions(txs ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold"
          >
            {greeting.emoji} {greeting.text}
            {profile?.first_name ? `, ${profile.first_name}` : ""}
          </motion.h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            {household?.name ?? "Loading..."}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddTx(true)}
          className="w-12 h-12 rounded-2xl gradient-accent flex items-center justify-center shadow-lg shadow-[rgb(var(--accent))]/25 text-white"
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-6 gradient-accent text-white shadow-xl"
      >
        {/* Glass overlay */}
        <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />
        <div className="absolute top-[-50%] right-[-30%] w-[60%] h-[120%] bg-white/5 rounded-full blur-3xl" />

        <div className="relative z-10">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">
            Current Balance
          </p>
          <motion.p
            key={balance}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold tracking-tight"
          >
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </motion.p>

          <div className="flex gap-6 mt-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <TrendingUp size={16} />
              </div>
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">
                  Income
                </p>
                <p className="text-sm font-semibold">
                  ${totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                <TrendingDown size={16} />
              </div>
              <div>
                <p className="text-[10px] text-white/60 uppercase tracking-wider">
                  Expenses
                </p>
                <p className="text-sm font-semibold">
                  ${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Recent Transactions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Recent Transactions</h2>
          {transactions.length > 0 && (
            <a
              href="/dashboard/activity"
              className="text-sm text-[rgb(var(--accent))] font-medium hover:underline"
            >
              View all →
            </a>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16">
            <Wallet className="w-12 h-12 mx-auto text-[rgb(var(--text-secondary))] mb-4 opacity-40" />
            <p className="font-semibold text-[rgb(var(--text-secondary))]">
              No transactions yet
            </p>
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
              Tap + to add your first expense or income
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {transactions.slice(0, 15).map((tx, i) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: i * 0.04,
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="theme-card p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                      tx.transaction_type === "income"
                        ? "bg-[rgb(var(--income))]/10"
                        : "bg-[rgb(var(--expense))]/10"
                    }`}
                  >
                    {getCategoryEmoji(tx.category)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {getCategoryLabel(tx.category)}
                    </p>
                    <p className="text-xs text-[rgb(var(--text-secondary))]">
                      {relativeDate(tx.transaction_date)} · {tx.payment_method}
                      {tx.user_id && profilesMap[tx.user_id]
                        ? ` · ${profilesMap[tx.user_id]}`
                        : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        tx.transaction_type === "income"
                          ? "text-[rgb(var(--income))]"
                          : "text-[rgb(var(--expense))]"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}$
                      {tx.amount.toFixed(2)}
                    </p>
                    {tx.note && (
                      <p className="text-[11px] text-[rgb(var(--text-secondary))] truncate max-w-[120px]">
                        {tx.note}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {showAddTx && profile?.household_id && (
          <AddTransactionModal
            householdId={profile.household_id}
            userId={profile.id}
            onClose={() => setShowAddTx(false)}
            onSaved={() => {
              setShowAddTx(false);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
