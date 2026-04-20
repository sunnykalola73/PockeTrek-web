"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CategoryReport } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { formatMonthYear, formatMonthYearQuery } from "@/lib/dates";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, LineChart } from "lucide-react";

export default function ReportsPage() {
  const supabase = createClient();
  const [month, setMonth] = useState(new Date());
  const [breakdown, setBreakdown] = useState<CategoryReport[]>([]);
  const [userComp, setUserComp] = useState<Record<string, number>>({});
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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
    const { data: prof } = await supabase
      .from("profiles")
      .select("household_id")
      .eq("id", user.id)
      .single();
    if (!prof?.household_id) return;

    const { data: members } = await supabase
      .from("profiles")
      .select("id, first_name")
      .eq("household_id", prof.household_id);
    const map: Record<string, string> = {};
    members?.forEach((m) => (map[m.id] = m.first_name ?? "User"));
    setProfilesMap(map);

    const mq = formatMonthYearQuery(month);

    // Get all transactions for the month
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .gte("transaction_date", `${mq}-01`)
      .lte("transaction_date", `${mq}-31`);

    if (txs) {
      // Build category breakdown
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

      setBreakdown(Object.values(catMap).sort((a, b) => b.total_amount - a.total_amount));
      setUserComp(userMap);
    }
    setLoading(false);
  }, [supabase, month]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const maxAmount = Math.max(
    ...breakdown.map((r) => r.total_amount),
    1
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <h1 className="text-2xl font-bold">Reports</h1>

      {/* Month Picker */}
      <div className="flex items-center justify-between theme-card px-5 py-3">
        <button
          onClick={() =>
            setMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
          }
          className="p-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors text-[rgb(var(--accent))]"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold">{formatMonthYear(month)}</span>
        <button
          onClick={() =>
            setMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
          }
          className="p-2 rounded-xl hover:bg-[rgb(var(--bg-secondary))] transition-colors text-[rgb(var(--accent))]"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Income", amount: totalIncome, icon: TrendingUp, color: "--income", emoji: "💰" },
          { label: "Expenses", amount: totalExpenses, icon: TrendingDown, color: "--expense", emoji: "💸" },
          { label: "Net", amount: net, icon: LineChart, color: net >= 0 ? "--safe" : "--expense", emoji: net >= 0 ? "📈" : "📉" },
        ].map((card) => (
          <div key={card.label} className="theme-card p-5 flex items-start gap-3">
            <div
              className="w-1 h-12 rounded-full"
              style={{
                background: `linear-gradient(to bottom, rgb(var(${card.color})), rgba(var(${card.color}), 0.3))`,
              }}
            />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-secondary))]">
                {card.emoji} {card.label}
              </p>
              <p
                className="text-xl font-bold mt-1"
                style={{ color: `rgb(var(${card.color}))` }}
              >
                ${Math.abs(card.amount).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : breakdown.length === 0 ? (
        <div className="text-center py-16 text-[rgb(var(--text-secondary))]">
          <p className="font-semibold">No activity this month</p>
        </div>
      ) : (
        <>
          {/* Category Breakdown */}
          <div>
            <h2 className="text-lg font-bold mb-4">Category Breakdown</h2>
            <div className="space-y-3">
              {breakdown.map((r, i) => {
                const barPct = (r.total_amount / maxAmount) * 100;
                const tint = r.transaction_type === "income" ? "--income" : "--expense";
                return (
                  <motion.div
                    key={`${r.category}_${r.transaction_type}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="theme-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{getCategoryEmoji(r.category)}</span>
                        <div>
                          <p className="font-semibold text-sm">
                            {getCategoryLabel(r.category)}
                          </p>
                          <p className="text-xs text-[rgb(var(--text-secondary))]">
                            {r.transaction_count} transactions
                          </p>
                        </div>
                      </div>
                      <p
                        className="font-bold"
                        style={{ color: `rgb(var(${tint}))` }}
                      >
                        ${r.total_amount.toFixed(2)}
                      </p>
                    </div>
                    {/* Bar */}
                    <div className="h-1.5 rounded-full bg-[rgb(var(--bg-secondary))]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${barPct}%` }}
                        transition={{ duration: 0.7, delay: 0.2 + i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: `rgba(var(${tint}), 0.7)` }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Member Spending */}
          {Object.keys(userComp).length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-4">Spending by Member</h2>
              <div className="space-y-3">
                {Object.entries(userComp)
                  .sort(([, a], [, b]) => b - a)
                  .map(([uid, amt]) => (
                    <div key={uid} className="theme-card p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full gradient-accent flex items-center justify-center text-white font-bold text-sm">
                        {(profilesMap[uid] ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold flex-1">
                        {profilesMap[uid] ?? "Unknown"}
                      </p>
                      <p className="font-bold text-[rgb(var(--expense))]">
                        ${amt.toFixed(2)}
                      </p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
