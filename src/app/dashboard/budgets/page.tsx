"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Budget, Transaction } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel, useCategories } from "@/lib/categories";
import { useData } from "@/lib/data";
import { getMonthRange } from "@/lib/dates";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2, Target, X } from "lucide-react";

export default function BudgetsPage() {
  const supabase = createClient();
  const { categories: cats, expenseCategories: expCats } = useCategories();
  const {
    household,
    budgets,
    transactions: globalTransactions,
    loading: dataLoading,
    refresh,
  } = useData();

  const [showAdd, setShowAdd] = useState(false);
  const [newCategory, setNewCategory] = useState("food");
  const [newLimit, setNewLimit] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derive spending from current month's transactions
  const { start, end } = getMonthRange(new Date());
  const spending: Record<string, number> = {};
  
  for (const tx of globalTransactions) {
    if (
      tx.transaction_type === "expense" &&
      tx.transaction_date >= start &&
      tx.transaction_date < end
    ) {
      spending[tx.category] = (spending[tx.category] ?? 0) + tx.amount;
    }
  }

  async function addBudget() {
    const limit = parseFloat(newLimit);
    if (!household || isNaN(limit) || limit <= 0) return;
    setSaving(true);
    await supabase.from("budgets").insert({
      household_id: household.id,
      category: newCategory,
      monthly_limit: limit,
    });
    setSaving(false);
    setShowAdd(false);
    setNewLimit("");
    refresh();
  }

  async function deleteBudget(id: string) {
    setDeletingId(id);
    await supabase.from("budgets").delete().eq("id", id);
    setDeletingId(null);
    refresh();
  }

  const totalBudget = budgets.reduce((s, b) => s + b.monthly_limit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spending[b.category] ?? 0), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">Budgets</h1>
          {budgets.length > 0 && (
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
              ${totalSpent.toFixed(2)} of ${totalBudget.toFixed(2)} spent this month
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className={showAdd ? "btn-ghost" : "btn-primary !py-2.5 !px-4 !text-sm"}
        >
          {showAdd ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Add Budget</>}
        </button>
      </div>

      {/* ── Add Budget Form ── */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="theme-card p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="section-label mb-2 block">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    {expCats.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon_emoji} {c.name.charAt(0).toUpperCase() + c.name.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="section-label mb-2 block">Monthly Limit</label>
                  <input
                    type="number"
                    placeholder="$0.00"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <button
                onClick={addBudget}
                disabled={saving || !newLimit}
                className="btn-primary w-full !text-sm"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : "Create Budget"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Budget Cards ── */}
      {dataLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-[100px]" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <Target className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">No budgets yet</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5 mb-5">
            Set monthly spending limits by category
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary !text-sm">
            <Plus size={16} /> Create your first budget
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {budgets.map((b, i) => {
            const spent = spending[b.category] ?? 0;
            const pct = Math.min((spent / b.monthly_limit) * 100, 100);
            const isOver = spent > b.monthly_limit;
            const colorVar = isOver ? "--expense" : pct > 80 ? "--caution" : "--safe";
            const remaining = b.monthly_limit - spent;

            return (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="theme-card p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl bg-[rgb(var(${colorVar}))]/8`}>
                      {getCategoryEmoji(b.category, cats)}
                    </div>
                    <div>
                      <p className="font-semibold">{getCategoryLabel(b.category, cats)}</p>
                      <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5">
                        {isOver ? (
                          <span className="text-[rgb(var(--expense))] font-semibold">
                            ${Math.abs(remaining).toFixed(2)} over budget
                          </span>
                        ) : (
                          <>${remaining.toFixed(2)} remaining</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteBudget(b.id)}
                    disabled={deletingId === b.id}
                    className="p-2 rounded-lg text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/5 transition-all"
                  >
                    {deletingId === b.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                  </button>
                </div>

                {/* Progress */}
                <div className="h-2 rounded-full bg-[rgb(var(--bg-secondary))] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ background: `rgb(var(${colorVar}))` }}
                  />
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-[12px] font-semibold" style={{ color: `rgb(var(${colorVar}))` }}>
                    {pct.toFixed(0)}%
                  </span>
                  <span className="text-[12px] text-[rgb(var(--text-secondary))]">
                    ${spent.toFixed(2)} / ${b.monthly_limit.toFixed(2)}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
