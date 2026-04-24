"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction, CategoryReport } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel, useCategories } from "@/lib/categories";
import { formatMonthYear, getMonthRange, relativeDate } from "@/lib/dates";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Pencil,
} from "lucide-react";
import AddTransactionModal from "@/components/AddTransactionModal";

export default function ReportsPage() {
  const supabase = createClient();
  const { categories: cats } = useCategories();
  const [month, setMonth] = useState(new Date());
  const [breakdown, setBreakdown] = useState<CategoryReport[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userComp, setUserComp] = useState<Record<string, number>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const totalIncome = breakdown
    .filter((r) => r.transaction_type === "income")
    .reduce((s, r) => s + r.total_amount, 0);
  const totalExpenses = breakdown
    .filter((r) => r.transaction_type === "expense")
    .reduce((s, r) => s + r.total_amount, 0);
  const net = totalIncome - totalExpenses;

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: prof } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();
    if (!prof?.household_id) return;
    setHouseholdId(prof.household_id);

    const { data: members } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("household_id", prof.household_id);
    const map: Record<string, string> = {};
    members?.forEach((m) => (map[m.id] = m.first_name ?? "User"));
    setProfilesMap(map);

    const { start, end } = getMonthRange(month);

    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .gte("transaction_date", start)
      .lt("transaction_date", end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (txs) {
      setTransactions(txs);

      const catMap: Record<string, CategoryReport> = {};
      const userMap: Record<string, number> = {};

      for (const tx of txs) {
        const key = `${tx.category}_${tx.transaction_type}`;
        if (!catMap[key]) {
          catMap[key] = {
            category: tx.category,
            total_amount: 0,
            transaction_count: 0,
            transaction_type: tx.transaction_type,
          };
        }
        catMap[key].total_amount += tx.amount;
        catMap[key].transaction_count += 1;

        if (tx.transaction_type === "expense" && tx.user_id) {
          userMap[tx.user_id] = (userMap[tx.user_id] ?? 0) + tx.amount;
        }
      }

      setBreakdown(
        Object.values(catMap).sort((a, b) => b.total_amount - a.total_amount)
      );
      setUserComp(userMap);
    } else {
      setTransactions([]);
      setBreakdown([]);
      setUserComp({});
    }
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset expanded category when month changes
  useEffect(() => {
    setExpandedCategory(null);
  }, [month]);

  const maxAmount = Math.max(...breakdown.map((r) => r.total_amount), 1);

  function toggleCategory(key: string) {
    setExpandedCategory((prev) => (prev === key ? null : key));
  }

  function getCategoryTransactions(category: string, txType: string) {
    return transactions.filter(
      (tx) => tx.category === category && tx.transaction_type === txType
    );
  }

  const summaryCards = [
    { label: "Income", value: totalIncome, Icon: TrendingUp, color: "--income" },
    { label: "Expenses", value: totalExpenses, Icon: TrendingDown, color: "--expense" },
    { label: "Net", value: net, Icon: Activity, color: net >= 0 ? "--safe" : "--expense" },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-8">
      <h1 className="text-[1.75rem] font-bold tracking-tight">Reports</h1>

      {/* ── Month Picker ── */}
      <div className="flex items-center justify-between theme-card px-5 py-3.5">
        <button
          onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
          className="w-9 h-9 rounded-xl hover:bg-[rgb(var(--bg-secondary))] flex items-center justify-center transition-colors text-[rgb(var(--accent))]"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-[0.9375rem]">{formatMonthYear(month)}</span>
        <button
          onClick={() => setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-xl hover:bg-[rgb(var(--bg-secondary))] flex items-center justify-center transition-colors text-[rgb(var(--accent))]"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {summaryCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="theme-card p-5 flex items-center gap-4"
          >
            <div
              className="w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{ background: `rgba(var(${card.color}), 0.08)` }}
            >
              <card.Icon size={20} style={{ color: `rgb(var(${card.color}))` }} />
            </div>
            <div>
              <p className="section-label">{card.label}</p>
              <p className="text-xl font-bold mt-0.5" style={{ color: `rgb(var(${card.color}))` }}>
                ${Math.abs(card.value).toFixed(2)}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-[80px]" />
          ))}
        </div>
      ) : breakdown.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">No activity this month</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            Try selecting a different month
          </p>
        </div>
      ) : (
        <>
          {/* ── Category Breakdown (expandable) ── */}
          <div>
            <h2 className="text-lg font-bold tracking-tight mb-4">Category Breakdown</h2>
            <div className="space-y-2.5">
              {breakdown.map((r, i) => {
                const barPct = (r.total_amount / maxAmount) * 100;
                const tint = r.transaction_type === "income" ? "--income" : "--expense";
                const catKey = `${r.category}_${r.transaction_type}`;
                const isExpanded = expandedCategory === catKey;
                const catTxs = isExpanded
                  ? getCategoryTransactions(r.category, r.transaction_type)
                  : [];

                return (
                  <motion.div
                    key={catKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="theme-card overflow-hidden"
                  >
                    {/* Category header — clickable to expand */}
                    <button
                      onClick={() => toggleCategory(catKey)}
                      className="w-full p-4 flex items-center gap-3 text-left hover:bg-[rgb(var(--bg-secondary))]/30 transition-colors"
                    >
                      <div
                        className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center text-lg shrink-0"
                        style={{ background: `rgba(var(${tint}), 0.08)` }}
                      >
                        {getCategoryEmoji(r.category, cats)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">
                          {getCategoryLabel(r.category, cats)}
                        </p>
                        <p className="text-[11px] text-[rgb(var(--text-secondary))]">
                          {r.transaction_count} transaction
                          {r.transaction_count > 1 ? "s" : ""}
                        </p>
                      </div>
                      <p
                        className="font-bold text-sm mr-2"
                        style={{ color: `rgb(var(${tint}))` }}
                      >
                        ${r.total_amount.toFixed(2)}
                      </p>
                      <ChevronDown
                        size={16}
                        className={`text-[rgb(var(--text-secondary))] transition-transform duration-300 shrink-0 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {/* Progress bar */}
                    <div className="px-4 pb-3">
                      <div className="h-1.5 rounded-full bg-[rgb(var(--bg-secondary))]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${barPct}%` }}
                          transition={{ duration: 0.6, delay: 0.15 + i * 0.04 }}
                          className="h-full rounded-full"
                          style={{ background: `rgb(var(${tint}))` }}
                        />
                      </div>
                    </div>

                    {/* Expanded transactions list */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-[rgba(var(--border),0.4)] mx-4" />
                          <div className="px-3 py-2 space-y-0.5">
                            {catTxs.map((tx) => (
                              <div
                                key={tx.id}
                                className="flex items-center gap-3 px-2 py-2.5 rounded-[var(--radius-sm)] hover:bg-[rgb(var(--bg-secondary))]/50 transition-colors"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-medium truncate">
                                    {relativeDate(tx.transaction_date)}
                                    {tx.note ? ` — ${tx.note}` : ""}
                                  </p>
                                  <p className="text-[11px] text-[rgb(var(--text-secondary))] truncate">
                                    {tx.payment_method}
                                    {tx.user_id && profilesMap[tx.user_id]
                                      ? ` · ${profilesMap[tx.user_id]}`
                                      : ""}
                                  </p>
                                </div>
                                <p
                                  className="font-bold text-[13px] shrink-0"
                                  style={{ color: `rgb(var(${tint}))` }}
                                >
                                  {tx.transaction_type === "income" ? "+" : "−"}$
                                  {tx.amount.toFixed(2)}
                                </p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingTx(tx);
                                  }}
                                  className="w-7 h-7 rounded-md flex items-center justify-center text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/8 transition-all shrink-0"
                                  title="Edit transaction"
                                >
                                  <Pencil size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Member Spending ── */}
          {Object.keys(userComp).length > 1 && (
            <div>
              <h2 className="text-lg font-bold tracking-tight mb-4">Spending by Member</h2>
              <div className="space-y-2.5">
                {Object.entries(userComp)
                  .sort(([, a], [, b]) => b - a)
                  .map(([uid, amt], i) => (
                    <motion.div
                      key={uid}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="theme-card p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-sm shadow-sm">
                        {(profilesMap[uid] ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold flex-1">{profilesMap[uid] ?? "Unknown"}</p>
                      <p className="font-bold text-[rgb(var(--expense))]">${amt.toFixed(2)}</p>
                    </motion.div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {editingTx && householdId && userId && (
          <AddTransactionModal
            householdId={householdId}
            userId={userId}
            transaction={editingTx}
            onClose={() => setEditingTx(null)}
            onSaved={() => {
              setEditingTx(null);
              loadData();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
