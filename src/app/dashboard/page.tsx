"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction, Profile, Household } from "@/lib/types";
import { relativeDate } from "@/lib/dates";
import { getCategoryEmoji, getCategoryLabel, useCategories } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Wallet,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import AddTransactionModal from "@/components/AddTransactionModal";

function getGreeting(): { emoji: string; text: string } {
  const h = new Date().getHours();
  if (h < 6) return { emoji: "✨", text: "Good night" };
  if (h < 12) return { emoji: "🌅", text: "Good morning" };
  if (h < 17) return { emoji: "☀️", text: "Good afternoon" };
  if (h < 21) return { emoji: "🌇", text: "Good evening" };
  return { emoji: "✨", text: "Good night" };
}

export default function DashboardPage() {
  const supabase = createClient();
  const { categories: cats } = useCategories();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAddTx, setShowAddTx] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Search & Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

    const { data: hh } = await supabase
      .from("households")
      .select("*")
      .eq("id", prof.household_id)
      .single();
    setHousehold(hh);

    const { data: members } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("household_id", prof.household_id);
    const map: Record<string, string> = {};
    members?.forEach((m) => {
      map[m.id] = m.first_name ?? "User";
    });
    setProfilesMap(map);

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeFilter) query = query.eq("transaction_type", typeFilter);
    if (search)
      query = query.or(
        `note.ilike.%${search}%,category.ilike.%${search}%`
      );

    const { data: txs } = await query;
    setTransactions(txs ?? []);
    setLoading(false);
  }, [supabase, typeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(loadData, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  // Group transactions by date
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const key = relativeDate(tx.transaction_date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  }

  const filterLabels = [
    { value: null, label: "All" },
    { value: "expense", label: "Expenses" },
    { value: "income", label: "Income" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-[1.75rem] font-bold tracking-tight">
            {greeting.emoji} {greeting.text}
            {profile?.first_name ? `, ${profile.first_name}` : ""}
          </h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            {household?.name ?? "Your financial overview"}
          </p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddTx(true)}
          className="btn-primary !px-5 !py-3 !rounded-[var(--radius-lg)]"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span className="hidden sm:inline">Add</span>
        </motion.button>
      </div>

      {/* ── Balance Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[var(--radius-hero)] p-7 gradient-accent text-white"
        style={{ boxShadow: "0 12px 40px rgba(var(--accent), 0.2)" }}
      >
        {/* Decorative shapes */}
        <div className="absolute top-[-40%] right-[-20%] w-[50%] h-[140%] bg-white/[0.04] rounded-full blur-2xl" />
        <div className="absolute bottom-[-30%] left-[-15%] w-[40%] h-[100%] bg-white/[0.03] rounded-full blur-3xl" />

        <div className="relative z-10">
          <p className="text-white/60 text-[11px] font-bold uppercase tracking-[0.1em] mb-1.5">
            Current Balance
          </p>
          <p className="text-[2.5rem] font-extrabold tracking-tight leading-none">
            $
            {balance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>

          <div className="flex gap-8 mt-6">
            {[
              { label: "Income", value: totalIncome, Icon: TrendingUp },
              { label: "Expenses", value: totalExpenses, Icon: TrendingDown },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <Icon size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="text-[10px] text-white/50 uppercase tracking-wider font-semibold">
                    {label}
                  </p>
                  <p className="text-sm font-bold">
                    ${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Search + Filters ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">Transactions</h2>
          <span className="badge bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]">
            {transactions.length}
          </span>
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1 relative">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))]"
            />
            <input
              type="text"
              placeholder="Search transactions…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-ghost !px-3.5 ${
              showFilters
                ? "!bg-[rgb(var(--accent))]/8 !text-[rgb(var(--accent))] !border-[rgb(var(--accent))]/20"
                : ""
            }`}
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 flex-wrap overflow-hidden"
            >
              {filterLabels.map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setTypeFilter(value)}
                  className={`badge transition-all ${
                    typeFilter === value
                      ? "bg-[rgb(var(--accent))] text-white"
                      : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.5)]"
                  } !py-2 !px-4 cursor-pointer`}
                >
                  {label}
                </button>
              ))}
              {typeFilter && (
                <button
                  onClick={() => setTypeFilter(null)}
                  className="badge bg-[rgb(var(--expense))]/8 text-[rgb(var(--expense))] !py-2 !px-3 cursor-pointer"
                >
                  <X size={12} /> Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Transaction List ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-[68px]" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">
            {search || typeFilter ? "No transactions found" : "No transactions yet"}
          </p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5 mb-5 max-w-[240px] mx-auto">
            {search || typeFilter
              ? "Adjust your search or filters"
              : "Add your first expense or income to get started"}
          </p>
          {!search && !typeFilter && (
            <button onClick={() => setShowAddTx(true)} className="btn-primary">
              <Plus size={16} />
              Add Transaction
            </button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([dateKey, txs], sectionIdx) => (
            <div key={dateKey}>
              <p className="section-label mb-2.5 px-1">{dateKey}</p>
              <div className="space-y-2">
                {txs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: Math.min((sectionIdx * 3 + i) * 0.025, 0.4),
                      duration: 0.3,
                    }}
                    className="theme-card px-4 py-3.5 flex items-center gap-4"
                  >
                    <div
                      className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0
                        ${
                          tx.transaction_type === "income"
                            ? "bg-[rgb(var(--income))]/8"
                            : "bg-[rgb(var(--expense))]/8"
                        }`}
                    >
                      {getCategoryEmoji(tx.category, cats)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm leading-tight">
                        {getCategoryLabel(tx.category, cats)}
                      </p>
                      <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5 truncate">
                        {tx.payment_method}
                        {tx.user_id && profilesMap[tx.user_id]
                          ? ` · ${profilesMap[tx.user_id]}`
                          : ""}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right">
                        <p
                          className={`font-bold text-sm ${
                            tx.transaction_type === "income"
                              ? "text-[rgb(var(--income))]"
                              : "text-[rgb(var(--expense))]"
                          }`}
                        >
                          {tx.transaction_type === "income" ? "+" : "−"}$
                          {tx.amount.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => setEditingTx(tx)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/8 transition-all"
                        title="Edit transaction"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Transaction Modal ── */}
      <AnimatePresence>
        {(showAddTx || editingTx) && profile?.household_id && (
          <AddTransactionModal
            householdId={profile.household_id}
            userId={profile.id}
            transaction={editingTx ?? undefined}
            onClose={() => {
              setShowAddTx(false);
              setEditingTx(null);
            }}
            onSaved={() => {
              setShowAddTx(false);
              setEditingTx(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
