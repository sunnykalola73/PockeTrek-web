"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Budget, Transaction } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { formatMonthYearQuery } from "@/lib/dates";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2 } from "lucide-react";

export default function BudgetsPage() {
  const supabase = createClient();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("food");
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);

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
    setHouseholdId(prof.household_id);

    const { data: bds } = await supabase
      .from("budgets")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("category");
    setBudgets(bds ?? []);

    // Get current month spending per category
    const monthYear = formatMonthYearQuery(new Date());
    const { data: txs } = await supabase
      .from("transactions")
      .select("category, amount")
      .eq("household_id", prof.household_id)
      .eq("transaction_type", "expense")
      .gte("transaction_date", `${monthYear}-01`)
      .lte("transaction_date", `${monthYear}-31`);

    const spendMap: Record<string, number> = {};
    txs?.forEach((tx: Pick<Transaction, "category" | "amount">) => {
      spendMap[tx.category] = (spendMap[tx.category] ?? 0) + tx.amount;
    });
    setSpending(spendMap);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addBudget() {
    const limit = parseFloat(newLimit);
    if (!householdId || isNaN(limit) || limit <= 0) return;
    setSaving(true);
    await supabase.from("budgets").insert({
      household_id: householdId,
      category: newCategory,
      monthly_limit: limit,
    });
    setSaving(false);
    setShowAdd(false);
    setNewLimit("");
    loadData();
  }

  async function deleteBudget(id: string) {
    await supabase.from("budgets").delete().eq("id", id);
    loadData();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white shadow-md"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add Budget Form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="theme-card p-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            >
              {[
                "food", "groceries", "transport", "entertainment", "shopping",
                "health", "utilities", "rent", "subscriptions", "education",
                "travel", "gifts", "insurance", "personal", "other",
              ].map((c) => (
                <option key={c} value={c}>
                  {getCategoryEmoji(c)} {getCategoryLabel(c)}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Monthly limit ($)"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[rgb(var(--text-secondary))]"
            >
              Cancel
            </button>
            <button
              onClick={addBudget}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white gradient-accent disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : "Add"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Budget Cards */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-16 text-[rgb(var(--text-secondary))]">
          <p className="font-semibold">No budgets yet</p>
          <p className="text-sm mt-1">Set monthly caps for categories</p>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const spent = spending[b.category] ?? 0;
            const pct = Math.min((spent / b.monthly_limit) * 100, 100);
            const isOver = spent > b.monthly_limit;
            const barColor = isOver
              ? "rgb(var(--expense))"
              : pct > 80
                ? "rgb(var(--caution))"
                : "rgb(var(--safe))";

            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="theme-card p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryEmoji(b.category)}</span>
                    <div>
                      <p className="font-semibold">{getCategoryLabel(b.category)}</p>
                      <p className="text-xs text-[rgb(var(--text-secondary))]">
                        ${spent.toFixed(2)} / ${b.monthly_limit.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/5 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="h-2 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: i * 0.1 }}
                    className="h-full rounded-full"
                    style={{ background: barColor }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2">
                  <span
                    className="text-xs font-semibold"
                    style={{ color: barColor }}
                  >
                    {pct.toFixed(0)}% used
                  </span>
                  {isOver && (
                    <span className="text-xs font-semibold text-[rgb(var(--expense))]">
                      ⚠️ Over budget!
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
