"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BUILTIN_EXPENSE_CATEGORIES,
  BUILTIN_INCOME_CATEGORIES,
  PAYMENT_METHODS,
} from "@/lib/categories";
import { todayISO } from "@/lib/dates";
import { motion } from "framer-motion";
import { X, Check, Loader2 } from "lucide-react";

interface Props {
  householdId: string;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransactionModal({
  householdId,
  userId,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const [txType, setTxType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("0");
  const [category, setCategory] = useState("food");
  const [method, setMethod] = useState("UPI");
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories =
    txType === "expense" ? BUILTIN_EXPENSE_CATEGORIES : BUILTIN_INCOME_CATEGORIES;

  const themeVar = txType === "expense" ? "--expense" : "--income";

  function numpadTap(key: string) {
    if (key === "⌫") {
      setAmount((p) => (p.length > 1 ? p.slice(0, -1) : "0"));
    } else if (key === ".") {
      if (!amount.includes(".")) setAmount((p) => p + ".");
    } else {
      setAmount((p) => (p === "0" ? key : p.length < 8 ? p + key : p));
    }
  }

  async function save() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("transactions").insert({
      household_id: householdId,
      user_id: userId,
      amount: parsed,
      category,
      payment_method: method,
      transaction_date: date,
      transaction_type: txType,
      note: note || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
    } else {
      setSuccess(true);
      setTimeout(onSaved, 600);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[rgb(var(--bg-card))] rounded-t-[var(--radius-hero)] lg:rounded-[var(--radius-hero)] max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(var(--border),0.4)]">
          <h2 className="font-bold text-lg">
            {txType === "expense" ? "Add Expense" : "Add Income"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center hover:bg-[rgba(var(--border),0.6)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Type Toggle */}
          <div className="flex rounded-xl bg-[rgb(var(--bg-secondary))] p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTxType(t);
                  setCategory(t === "expense" ? "food" : "salary");
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                  ${
                    txType === t
                      ? `bg-[rgb(var(${t === "expense" ? "--expense" : "--income"}))] text-white shadow-sm`
                      : "text-[rgb(var(--text-secondary))]"
                  }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Amount Display */}
          <div className="text-center py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-secondary))] mb-2">
              Enter Amount
            </p>
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-2xl text-[rgb(var(--text-secondary))]">$</span>
              <motion.span
                key={amount}
                initial={{ scale: 1.05 }}
                animate={{ scale: 1 }}
                className={`text-5xl font-bold tracking-tight ${
                  amount === "0"
                    ? "text-[rgb(var(--text-secondary))]"
                    : "text-[rgb(var(--text-primary))]"
                }`}
              >
                {amount}
              </motion.span>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2.5 text-center">
              {error}
            </p>
          )}

          {/* Date & Note row */}
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Categories */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--text-secondary))] mb-3">
              Category
            </p>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(categories).map(([key, cat]) => {
                const isSelected = category === key;
                return (
                  <button
                    key={key}
                    onClick={() => setCategory(key)}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl text-center transition-all duration-200
                      ${
                        isSelected
                          ? `bg-[rgb(var(${themeVar}))]/12 ring-2 ring-[rgb(var(${themeVar}))] scale-[1.02]`
                          : "bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                      }`}
                  >
                    <span className="text-xl">{cat.emoji}</span>
                    <span
                      className={`text-[10px] font-semibold leading-tight ${
                        isSelected
                          ? `text-[rgb(var(${themeVar}))]`
                          : "text-[rgb(var(--text-secondary))]"
                      }`}
                    >
                      {cat.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="flex rounded-xl bg-[rgb(var(--bg-secondary))] overflow-hidden">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`flex-1 py-3 text-sm font-semibold transition-all duration-200
                  ${
                    method === m
                      ? `bg-[rgb(var(${themeVar}))] text-white`
                      : "text-[rgb(var(--text-secondary))]"
                  }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"].map(
              (key) => (
                <button
                  key={key}
                  onClick={() => numpadTap(key)}
                  className={`h-14 rounded-xl text-xl font-semibold transition-all duration-150 active:scale-95
                    ${
                      amount !== "0"
                        ? `bg-[rgb(var(${themeVar}))]/8 hover:bg-[rgb(var(${themeVar}))]/15`
                        : "bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.5)]"
                    }`}
                >
                  {key}
                </button>
              )
            )}
          </div>

          {/* Save Button */}
          <button
            onClick={save}
            disabled={amount === "0" || saving}
            className={`w-full py-4 rounded-xl font-bold text-white text-base transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40
              ${txType === "expense" ? "gradient-expense" : "gradient-income"}
              ${amount !== "0" ? "shadow-lg" : ""}`}
            style={
              amount !== "0"
                ? {
                    boxShadow: `0 8px 24px rgba(var(${themeVar}), 0.3)`,
                  }
                : {}
            }
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : success ? (
              <Check className="w-5 h-5" />
            ) : (
              `Save ${txType === "expense" ? "Expense" : "Income"}`
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
