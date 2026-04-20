"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import { relativeDate } from "@/lib/dates";
import { getCategoryEmoji, getCategoryLabel, expenseCategories, incomeCategories, paymentMethods } from "@/lib/categories";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, Edit, Trash2, Loader2 } from "lucide-react";

export default function ActivityPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageSize = 50;

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (pageOffset: number = 0) => {
    const isFirstPage = pageOffset === 0;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

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

    if (isFirstPage) {
      const { data: members } = await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("household_id", prof.household_id);
      const map: Record<string, string> = {};
      members?.forEach((m) => (map[m.id] = m.first_name ?? "User"));
      setProfilesMap(map);
    }

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(pageOffset, pageOffset + pageSize);

    if (typeFilter) query = query.eq("transaction_type", typeFilter);
    if (search) query = query.or(`note.ilike.%${search}%,category.ilike.%${search}%`);

    const { data: txs } = await query;

    if (isFirstPage) {
      setTransactions(txs ?? []);
    } else {
      setTransactions((prev) => [...prev, ...(txs ?? [])]);
    }

    // Check if there are more results
    setHasMore((txs?.length ?? 0) === pageSize + 1);

    if (isFirstPage) setLoading(false);
    else setLoadingMore(false);
  }, [supabase, typeFilter, search, pageSize]);

  useEffect(() => {
    setOffset(0);
    const timer = setTimeout(() => loadData(0), search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search, typeFilter]);

  const loadMore = useCallback(() => {
    const nextOffset = offset + pageSize;
    setOffset(nextOffset);
    loadData(nextOffset);
  }, [offset, pageSize, loadData]);

  function openEdit(tx: Transaction) {
    setEditingId(tx.id);
    setEditForm({
      amount: tx.amount,
      category: tx.category,
      payment_method: tx.payment_method,
      transaction_date: tx.transaction_date,
      transaction_type: tx.transaction_type,
      note: tx.note,
    });
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSavingEdit(true);

    await supabase
      .from("transactions")
      .update({
        amount: editForm.amount,
        category: editForm.category,
        payment_method: editForm.payment_method,
        transaction_date: editForm.transaction_date,
        note: editForm.note,
      })
      .eq("id", editingId);

    setSavingEdit(false);
    setEditingId(null);
    setOffset(0);
    loadData(0);
  }

  async function deleteTransaction() {
    if (!deleteConfirmId) return;
    setDeleting(true);

    await supabase.from("transactions").delete().eq("id", deleteConfirmId);

    setDeleting(false);
    setDeleteConfirmId(null);
    setOffset(0);
    loadData(0);
  }

  // Group by date
  const grouped: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const key = relativeDate(tx.transaction_date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(tx);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Activity</h1>

      {/* Search + Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))]"
          />
          <input
            type="text"
            placeholder="Search notes or categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="!pl-10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 rounded-xl bg-[rgb(var(--bg-secondary))] border border-[rgba(var(--border),0.6)] hover:bg-[rgba(var(--border),0.4)] transition-colors"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          {[null, "expense", "income"].map((t) => (
            <button
              key={t ?? "all"}
              onClick={() => setTypeFilter(t)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                ${typeFilter === t
                  ? "bg-[rgb(var(--accent))] text-white"
                  : "bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]"
                }`}
            >
              {t ? t.charAt(0).toUpperCase() + t.slice(1) : "All"}
            </button>
          ))}
          {typeFilter && (
            <button
              onClick={() => setTypeFilter(null)}
              className="px-3 py-2 text-sm text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))]"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Transactions */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16 rounded-[var(--radius-md)]" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 text-[rgb(var(--text-secondary))]">
          <p className="font-semibold">No transactions found</p>
          <p className="text-sm mt-1">Adjust your search or filters</p>
        </div>
      ) : (
        <>
          {Object.entries(grouped).map(([dateKey, txs], sectionIdx) => (
            <div key={dateKey}>
              <p className="text-xs font-bold uppercase tracking-wider text-[rgb(var(--text-secondary))] mb-2 px-1">
                {dateKey}
              </p>
              <div className="space-y-2">
                {txs.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: (sectionIdx * 3 + i) * 0.03,
                      duration: 0.35,
                    }}
                    className="theme-card p-4 flex items-center gap-4 group relative"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl
                        ${tx.transaction_type === "income"
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
                        {tx.payment_method}
                        {tx.user_id && profilesMap[tx.user_id]
                          ? ` · ${profilesMap[tx.user_id]}`
                          : ""}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </p>
                    </div>
                    <p
                      className={`font-bold text-sm ${tx.transaction_type === "income"
                        ? "text-[rgb(var(--income))]"
                        : "text-[rgb(var(--expense))]"
                        }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </p>
                    {/* Action buttons */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(tx)}
                        className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/10 transition-all"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(tx.id)}
                        className="p-1.5 rounded-lg text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/10 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full py-3 mt-4 rounded-xl bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.4)] text-[rgb(var(--text-secondary))] font-medium transition-colors disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load More"}
            </motion.button>
          )}
        </>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[rgb(var(--bg-card))] rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl border border-[rgba(var(--border),0.5)] modal-content"
          >
            <div>
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">Edit Transaction</h2>
              <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Update the details below</p>
            </div>

            <div className="space-y-4">
              {/* Amount */}
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--text-secondary))] font-medium">
                    $
                  </span>
                  <input
                    type="number"
                    value={editForm.amount ?? 0}
                    onChange={(e) =>
                      setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })
                    }
                    min="0"
                    step="0.01"
                    className="w-full pl-7"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
                  Category
                </label>
                <select
                  value={editForm.category ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full"
                >
                  {(editForm.transaction_type === "income"
                    ? incomeCategories
                    : expenseCategories
                  ).map((c) => (
                    <option key={c} value={c}>
                      {getCategoryEmoji(c)} {getCategoryLabel(c)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
                  Payment Method
                </label>
                <select
                  value={editForm.payment_method ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, payment_method: e.target.value })
                  }
                  className="w-full"
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
                  Date
                </label>
                <input
                  type="date"
                  value={editForm.transaction_date ?? ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, transaction_date: e.target.value })
                  }
                  className="w-full"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold uppercase text-[rgb(var(--text-secondary))] mb-2 block">
                  Note (Optional)
                </label>
                <input
                  type="text"
                  value={editForm.note ?? ""}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Add a note..."
                  className="w-full"
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 justify-end pt-2 border-t border-[rgba(var(--border),0.3)]">
              <button
                onClick={() => setEditingId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white gradient-accent disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 modal-backdrop">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[rgb(var(--bg-card))] rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-[rgba(var(--border),0.5)] modal-content"
          >
            <div className="space-y-1 mb-6">
              <h2 className="text-xl font-bold text-[rgb(var(--text-primary))]">
                Delete Transaction?
              </h2>
              <p className="text-sm text-[rgb(var(--text-secondary))]">
                This action cannot be undone. The transaction will be permanently removed.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t border-[rgba(var(--border),0.3)]">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))] transition-colors"
              >
                Keep It
              </button>
              <button
                onClick={deleteTransaction}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
