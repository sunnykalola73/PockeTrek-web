"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecurringTransaction } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel, expenseCategories, incomeCategories, paymentMethods } from "@/lib/categories";
import { motion } from "framer-motion";
import { Repeat, Plus, Loader2 } from "lucide-react";
import { todayISO } from "@/lib/dates";

export default function RecurringPage() {
  const supabase = createClient();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    type: "expense" as "expense" | "income",
    category: "food",
    amount: "",
    frequency: "monthly" as "daily" | "weekly" | "monthly" | "yearly",
    paymentMethod: "card",
    startDate: todayISO(),
    endDate: "",
    note: "",
  });

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

    const { data: recs } = await supabase
      .from("recurring_transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("start_date", { ascending: false });
    setItems(recs ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function addRecurring() {
    const amount = parseFloat(form.amount);
    if (!householdId || !userId || isNaN(amount) || amount <= 0) return;

    setSaving(true);

    await supabase.from("recurring_transactions").insert({
      household_id: householdId,
      user_id: userId,
      amount,
      category: form.category,
      payment_method: form.paymentMethod,
      frequency: form.frequency,
      start_date: form.startDate,
      end_date: form.endDate || null,
      transaction_type: form.type,
      note: form.note || null,
      is_active: true,
    });

    setSaving(false);
    setShowAdd(false);
    setForm({
      type: "expense",
      category: "food",
      amount: "",
      frequency: "monthly",
      paymentMethod: "card",
      startDate: todayISO(),
      endDate: "",
      note: "",
    });
    loadData();
  }

  function frequencyLabel(f: string) {
    return { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[f] ?? f;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recurring</h1>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white shadow-md"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Add Recurring Form */}
      {showAdd && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="theme-card p-5 space-y-4"
        >
          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setForm({ ...form, type: "expense", category: "food" })}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${form.type === "expense"
                  ? "bg-[rgb(var(--expense))] text-white"
                  : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]"
                }`}
            >
              Expense
            </button>
            <button
              onClick={() => setForm({ ...form, type: "income", category: "salary" })}
              className={`flex-1 py-2 rounded-lg font-medium transition-all ${form.type === "income"
                  ? "bg-[rgb(var(--income))] text-white"
                  : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]"
                }`}
            >
              Income
            </button>
          </div>

          {/* Category Grid */}
          <div>
            <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
              Category
            </label>
            <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto p-1">
              {(form.type === "expense" ? expenseCategories : incomeCategories).map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, category: c })}
                  className={`p-3 rounded-lg text-center text-sm font-medium transition-all ${form.category === c
                      ? "bg-[rgb(var(--accent))] text-white"
                      : "bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                    }`}
                >
                  <div className="text-lg mb-1">{getCategoryEmoji(c)}</div>
                  <div className="text-xs line-clamp-1">{getCategoryLabel(c)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Amount and Frequency Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                Amount ($)
              </label>
              <input
                type="number"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                min="0"
                step="0.01"
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                Frequency
              </label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}
                className="w-full"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
              Payment Method
            </label>
            <div className="flex gap-2">
              {paymentMethods.map((m) => (
                <button
                  key={m}
                  onClick={() => setForm({ ...form, paymentMethod: m })}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${form.paymentMethod === m
                      ? "bg-[rgb(var(--accent))] text-white"
                      : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                Start Date
              </label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
                End Date (Optional)
              </label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-1 block">
              Note (Optional)
            </label>
            <input
              type="text"
              placeholder="Add a note..."
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="w-full"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-[rgb(var(--text-secondary))]"
            >
              Cancel
            </button>
            <button
              onClick={addRecurring}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white gradient-accent disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Add Recurring"
              )}
            </button>
          </div>
        </motion.div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-20 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-[rgb(var(--text-secondary))]">
          <Repeat className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="font-semibold">No recurring transactions</p>
          <p className="text-sm mt-1">
            Set up recurring entries from the iOS app
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((rec, i) => {
            const tint = rec.transaction_type === "income" ? "--income" : "--expense";
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="theme-card p-5 flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-[rgb(var(${tint}))]/10`}
                >
                  {getCategoryEmoji(rec.category)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{getCategoryLabel(rec.category)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[rgb(var(--accent))]/10 text-[rgb(var(--accent))] font-semibold">
                      {frequencyLabel(rec.frequency)}
                    </span>
                    <span className="text-xs text-[rgb(var(--text-secondary))]">
                      {rec.payment_method}
                    </span>
                    {rec.user_id && profilesMap[rec.user_id] && (
                      <span className="text-xs text-[rgb(var(--text-secondary))]">
                        · {profilesMap[rec.user_id]}
                      </span>
                    )}
                  </div>
                  {!rec.is_active && (
                    <span className="text-xs text-[rgb(var(--caution))] font-medium mt-1 inline-block">
                      Paused
                    </span>
                  )}
                </div>

                <p
                  className="font-bold text-lg"
                  style={{ color: `rgb(var(${tint}))` }}
                >
                  {rec.transaction_type === "income" ? "+" : "-"}${rec.amount.toFixed(2)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
