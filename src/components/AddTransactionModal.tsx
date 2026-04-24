"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import {
  useCategories,
  PAYMENT_METHODS,
} from "@/lib/categories";
import { todayISO } from "@/lib/dates";
import { useData } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, ArrowDownCircle, ArrowUpCircle, Trash2 } from "lucide-react";

interface Props {
  householdId: string;
  userId: string;
  /** If provided, the modal opens in edit mode */
  transaction?: Transaction;
  onClose: () => void;
  onSaved: () => void;
}

export default function AddTransactionModal({
  householdId,
  userId,
  transaction,
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();
  const { addTransaction, updateTransaction, deleteTransaction } = useData();
  const amountRef = useRef<HTMLInputElement>(null);
  const isEdit = !!transaction;

  const [txType, setTxType] = useState<"expense" | "income">(
    transaction?.transaction_type ?? "expense"
  );
  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount) : ""
  );
  const [category, setCategory] = useState(transaction?.category ?? "food");
  const [method, setMethod] = useState(transaction?.payment_method ?? "UPI");
  const [date, setDate] = useState(transaction?.transaction_date ?? todayISO());
  const [note, setNote] = useState(transaction?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { expenseCategories, incomeCategories } = useCategories();

  const categories =
    txType === "expense" ? expenseCategories : incomeCategories;

  const tintVar = txType === "expense" ? "--expense" : "--income";
  const isValid = parseFloat(amount) > 0;

  // Auto-focus amount input
  useEffect(() => {
    setTimeout(() => amountRef.current?.focus(), 100);
  }, []);

  function handleAmountChange(val: string) {
    if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
      setAmount(val);
    }
  }

  async function save() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      household_id: householdId,
      user_id: userId,
      amount: parsed,
      category,
      payment_method: method,
      transaction_date: date,
      transaction_type: txType,
      note: note || null,
    };

    let result;
    if (isEdit && transaction) {
      result = await supabase
        .from("transactions")
        .update(payload)
        .eq("id", transaction.id)
        .select()
        .maybeSingle();
      
      if (!result.error && result.data) {
        updateTransaction(result.data);
      }
    } else {
      result = await supabase
        .from("transactions")
        .insert(payload)
        .select()
        .maybeSingle();
      
      if (!result.error && result.data) {
        addTransaction(result.data);
      }
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
    } else {
      setSuccess(true);
      setTimeout(onSaved, 400);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true);
    setError(null);

    const { error: deleteError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id);

    if (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    } else {
      deleteTransaction(transaction.id);
      setSuccess(true);
      setTimeout(onSaved, 400);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && isValid && !saving) {
      save();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-[rgb(var(--bg-card))] rounded-t-[var(--radius-hero)] lg:rounded-[var(--radius-hero)] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="text-lg font-bold tracking-tight">
            {isEdit ? "Edit Transaction" : "New Transaction"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center hover:bg-[rgba(var(--border),0.7)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-7">
          {/* ── Type Toggle ── */}
          <div className="flex gap-3">
            {(["expense", "income"] as const).map((t) => {
              const active = txType === t;
              const Icon = t === "expense" ? ArrowDownCircle : ArrowUpCircle;
              const colorVar = t === "expense" ? "--expense" : "--income";
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTxType(t);
                    if (!isEdit) {
                      setCategory(t === "expense" ? "food" : "salary");
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-250
                    ${
                      active
                        ? `bg-[rgb(var(${colorVar}))]/10 text-[rgb(var(${colorVar}))] ring-1.5 ring-[rgb(var(${colorVar}))]/30`
                        : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                    }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>

          {/* ── Amount ── */}
          <div>
            <label className="section-label mb-2 block">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-[rgb(var(--text-secondary))]">
                $
              </span>
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="!pl-10 !text-2xl !font-bold !py-4 !rounded-[var(--radius-lg)]"
              />
            </div>
          </div>

          {/* ── Category ── */}
          <div>
            <label className="section-label mb-3 block">Category</label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {categories.map((cat) => {
                const selected = category === cat.name;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-md)] transition-all duration-200
                      ${
                        selected
                          ? `bg-[rgb(var(${tintVar}))]/10 ring-1.5 ring-[rgb(var(${tintVar}))]/40 scale-[1.03]`
                          : "bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                      }`}
                  >
                    <span className="text-[22px] leading-none">{cat.icon_emoji}</span>
                    <span
                      className={`text-[10px] font-semibold leading-tight capitalize ${
                        selected
                          ? `text-[rgb(var(${tintVar}))]`
                          : "text-[rgb(var(--text-secondary))]"
                      }`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Payment Method ── */}
          <div>
            <label className="section-label mb-3 block">Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => {
                const active = method === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`flex-1 py-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all duration-200
                      ${
                        active
                          ? `bg-[rgb(var(${tintVar}))]/10 text-[rgb(var(${tintVar}))] ring-1.5 ring-[rgb(var(${tintVar}))]/30`
                          : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                      }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Date & Note ── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-2 block">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="section-label mb-2 block">Note</label>
              <input
                type="text"
                placeholder="Optional"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          {/* ── Error ── */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/8 rounded-[var(--radius-md)] px-4 py-3 text-center font-medium"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* ── Action Buttons ── */}
          <div className="space-y-3">
            {/* Save / Update */}
            <button
              onClick={save}
              disabled={!isValid || saving}
              className={`w-full py-4 rounded-[var(--radius-lg)] font-bold text-white text-[0.9375rem] transition-all duration-250 flex items-center justify-center gap-2
                ${txType === "expense" ? "gradient-expense" : "gradient-income"}
                ${isValid ? "shadow-lg hover:-translate-y-0.5" : "opacity-40"}`}
              style={
                isValid
                  ? { boxShadow: `0 8px 24px rgba(var(${tintVar}), 0.25)` }
                  : {}
              }
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : success ? (
                <>
                  <Check className="w-5 h-5" />
                  {isEdit ? "Updated!" : "Saved!"}
                </>
              ) : (
                isEdit
                  ? "Update Transaction"
                  : `Save ${txType === "expense" ? "Expense" : "Income"}`
              )}
            </button>

            {/* Delete (edit mode only) */}
            {isEdit && (
              <>
                {confirmDelete ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="flex-1 py-3 rounded-[var(--radius-md)] font-semibold text-white bg-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/90 transition-all flex items-center justify-center gap-2 text-sm"
                    >
                      {deleting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Trash2 size={15} />
                          Confirm Delete
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="w-full py-3 rounded-[var(--radius-md)] font-medium text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/6 hover:bg-[rgb(var(--expense))]/12 transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={15} />
                    Delete Transaction
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
