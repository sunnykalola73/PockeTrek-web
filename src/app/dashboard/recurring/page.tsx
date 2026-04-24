"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecurringTransaction } from "@/lib/types";
import { getCategoryEmoji, useCategories, PAYMENT_METHODS } from "@/lib/categories";
import { useData } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import {
  Repeat,
  CalendarClock,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Save,
  ArrowDownCircle,
  ArrowUpCircle,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

const FREQUENCIES = ["daily", "weekly", "monthly", "yearly"] as const;
type Frequency = typeof FREQUENCIES[number];

const FREQ_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const FREQ_MULTIPLIER: Record<string, number> = {
  daily: 30,
  weekly: 4.3,
  monthly: 1,
  yearly: 1 / 12,
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Add / Edit Modal ─────────────────────────────────────────────────────────

function RecurringFormModal({
  householdId,
  userId,
  item,
  onClose,
  onSaved,
}: {
  householdId: string;
  userId: string;
  item?: RecurringTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = createClient();
  const { expenseCategories, incomeCategories, getCategoryById } = useCategories();
  const isEdit = !!item;

  const [txType, setTxType] = useState<"expense" | "income">(item?.transaction_type ?? "expense");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [categoryId, setCategoryId] = useState(() => {
    if (item?.category_id) return item.category_id;
    const cats = (item?.transaction_type ?? "expense") === "expense" ? expenseCategories : incomeCategories;
    return cats[0]?.id ?? "";
  });
  const [method, setMethod] = useState(item?.payment_method ?? "UPI");
  const [frequency, setFrequency] = useState<Frequency>((item?.frequency as Frequency) ?? "monthly");
  const [startDate, setStartDate] = useState(item?.start_date ?? todayISO());
  const [note, setNote] = useState(item?.note ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = txType === "expense" ? expenseCategories : incomeCategories;
  const tintVar = txType === "expense" ? "--expense" : "--income";
  const isValid = parseFloat(amount) > 0 && !!categoryId;

  async function save() {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) { setError("Enter a valid amount"); return; }
    setSaving(true);
    setError(null);

    const selectedCat = categories.find((c) => c.id === categoryId);
    const payload = {
      household_id: householdId,
      user_id: userId,
      amount: parsed,
      category: selectedCat?.name ?? "",
      category_id: categoryId || null,
      payment_method: method,
      frequency,
      start_date: startDate,
      transaction_type: txType,
      note: note || null,
      is_active: true,
    };

    let err;
    if (isEdit && item) {
      ({ error: err } = await supabase.from("recurring_transactions").update(payload).eq("id", item.id));
    } else {
      ({ error: err } = await supabase.from("recurring_transactions").insert(payload));
    }

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSaved();
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
        className="w-full max-w-[500px] bg-[rgb(var(--bg-card))] rounded-t-[var(--radius-hero)] lg:rounded-[var(--radius-hero)] max-h-[92vh] overflow-y-auto flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(var(--border),0.4)] sticky top-0 bg-[rgb(var(--bg-card))] z-10">
          <h2 className="text-lg font-bold tracking-tight">
            {isEdit ? "Edit Recurring" : "New Recurring"}
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center hover:bg-[rgba(var(--border),0.7)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Type toggle */}
          <div className="flex gap-3">
            {(["expense", "income"] as const).map((t) => {
              const active = txType === t;
              const Icon = t === "expense" ? ArrowDownCircle : ArrowUpCircle;
              const cv = t === "expense" ? "--expense" : "--income";
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTxType(t);
                    const cats = t === "expense" ? expenseCategories : incomeCategories;
                    setCategoryId(cats[0]?.id ?? "");
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all
                    ${active
                      ? `bg-[rgb(var(${cv}))]/10 text-[rgb(var(${cv}))] ring-1.5 ring-[rgb(var(${cv}))]/30`
                      : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                    }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div>
            <label className="section-label mb-2 block">Amount</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-[rgb(var(--text-secondary))]">$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || /^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
                }}
                className="!pl-10 !text-2xl !font-bold !py-4 !rounded-[var(--radius-lg)]"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="section-label mb-3 block">Category</label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {categories.map((cat) => {
                const selected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-[var(--radius-md)] transition-all duration-200
                      ${selected
                        ? `bg-[rgb(var(${tintVar}))]/10 ring-1.5 ring-[rgb(var(${tintVar}))]/40 scale-[1.03]`
                        : "bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                      }`}
                  >
                    <span className="text-[22px] leading-none">{cat.icon_emoji}</span>
                    <span className={`text-[10px] font-semibold leading-tight capitalize ${selected ? `text-[rgb(var(${tintVar}))]` : "text-[rgb(var(--text-secondary))]"}`}>
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="section-label mb-3 block">Frequency</label>
            <div className="grid grid-cols-4 gap-2">
              {FREQUENCIES.map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all
                    ${frequency === f
                      ? `bg-[rgb(var(${tintVar}))]/10 text-[rgb(var(${tintVar}))] ring-1.5 ring-[rgb(var(${tintVar}))]/30`
                      : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                    }`}
                >
                  {FREQ_LABELS[f]}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="section-label mb-3 block">Payment Method</label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className={`flex-1 py-3 rounded-[var(--radius-md)] text-sm font-semibold transition-all
                    ${method === m
                      ? `bg-[rgb(var(${tintVar}))]/10 text-[rgb(var(${tintVar}))] ring-1.5 ring-[rgb(var(${tintVar}))]/30`
                      : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.4)]"
                    }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Start date & Note */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label mb-2 block">Start Date</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="section-label mb-2 block">Note</label>
              <input type="text" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/8 rounded-[var(--radius-md)] px-4 py-3 font-medium text-center"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Save */}
          <button
            onClick={save}
            disabled={!isValid || saving}
            className={`w-full py-4 rounded-[var(--radius-lg)] font-bold text-white text-[0.9375rem] flex items-center justify-center gap-2 transition-all
              ${txType === "expense" ? "gradient-expense" : "gradient-income"}
              ${isValid ? "shadow-lg hover:-translate-y-0.5 opacity-100" : "opacity-40 cursor-not-allowed"}`}
            style={isValid ? { boxShadow: `0 8px 24px rgba(var(${tintVar}), 0.25)` } : {}}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save size={18} />}
            {isEdit ? "Update Recurring" : "Create Recurring"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RecurringPage() {
  const supabase = createClient();
  const { categories: cats, getCategoryById } = useCategories();
  const { recurring: items, profile, loading: dataLoading, refresh } = useData();

  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTransaction | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const totalMonthly = items
    .filter((r) => r.is_active && r.transaction_type === "expense")
    .reduce((sum, r) => sum + r.amount * (FREQ_MULTIPLIER[r.frequency] ?? 1), 0);

  async function deleteItem(id: string) {
    if (!confirm("Delete this recurring transaction?")) return;
    setDeletingId(id);
    await supabase.from("recurring_transactions").delete().eq("id", id);
    setDeletingId(null);
    refresh();
  }

  async function toggleActive(item: RecurringTransaction) {
    setTogglingId(item.id);
    await supabase.from("recurring_transactions").update({ is_active: !item.is_active }).eq("id", item.id);
    setTogglingId(null);
    refresh();
  }

  function openEdit(item: RecurringTransaction) {
    setEditingItem(item);
    setShowForm(true);
  }

  function closeModal() {
    setShowForm(false);
    setEditingItem(null);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight">Recurring</h1>
          {items.length > 0 && (
            <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
              ~${totalMonthly.toFixed(2)}/mo in recurring expenses
            </p>
          )}
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="btn-primary !py-2.5 !px-4 !text-sm"
        >
          <Plus size={16} />
          Add Recurring
        </button>
      </div>

      {/* Content */}
      {dataLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-[88px]" />)}
        </div>
      ) : items.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">No recurring transactions</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5 mb-5">
            Set up bills, subscriptions, and salaries that repeat automatically
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary !text-sm">
            <Plus size={16} /> Create your first recurring
          </button>
        </motion.div>
      ) : (
        <div className="space-y-2.5">
          {items.map((rec, i) => {
            const tint = rec.transaction_type === "income" ? "--income" : "--expense";
            const cat = getCategoryById(rec.category_id);
            const emoji = cat ? cat.icon_emoji : getCategoryEmoji(rec.category, cats);
            const name = cat ? cat.name : rec.category;
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`theme-card p-4 flex items-center gap-4 ${!rec.is_active ? "opacity-60" : ""}`}
              >
                {/* Icon */}
                <div
                  className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `rgba(var(${tint}), 0.08)` }}
                >
                  {emoji}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-[0.9375rem] capitalize">{name}</p>
                    {!rec.is_active && (
                      <span className="badge bg-[rgb(var(--caution))]/10 text-[rgb(var(--caution))] !text-[10px]">Paused</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="badge bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))] !text-[10px]">
                      <Repeat size={9} />
                      {FREQ_LABELS[rec.frequency] ?? rec.frequency}
                    </span>
                    <span className="text-[11px] text-[rgb(var(--text-secondary))]">{rec.payment_method}</span>
                    {rec.note && (
                      <span className="text-[11px] text-[rgb(var(--text-secondary))] truncate max-w-[140px]">· {rec.note}</span>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <p
                  className="font-bold text-lg shrink-0 tabular-nums"
                  style={{ color: `rgb(var(${tint}))` }}
                >
                  {rec.transaction_type === "income" ? "+" : "−"}${rec.amount.toFixed(2)}
                </p>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(rec)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/10 transition-all"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(rec)}
                    disabled={togglingId === rec.id}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--caution))] hover:bg-[rgb(var(--caution))]/10 transition-all"
                    title={rec.is_active ? "Pause" : "Resume"}
                  >
                    {togglingId === rec.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : rec.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                  </button>
                  <button
                    onClick={() => deleteItem(rec.id)}
                    disabled={deletingId === rec.id}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/10 transition-all"
                    title="Delete"
                  >
                    {deletingId === rec.id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showForm && profile?.household_id && (
          <RecurringFormModal
            householdId={profile.household_id}
            userId={profile.id}
            item={editingItem ?? undefined}
            onClose={closeModal}
            onSaved={() => { closeModal(); refresh(); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
