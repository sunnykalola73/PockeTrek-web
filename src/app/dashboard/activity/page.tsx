"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import { relativeDate } from "@/lib/dates";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X, Inbox } from "lucide-react";
import AddTransactionModal from "@/components/AddTransactionModal";

export default function ActivityPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

    let query = supabase
      .from("transactions")
      .select("*")
      .eq("household_id", prof.household_id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    if (typeFilter) query = query.eq("transaction_type", typeFilter);
    if (search) query = query.or(`note.ilike.%${search}%,category.ilike.%${search}%`);

    const { data: txs } = await query;
    setTransactions(txs ?? []);
    setLoading(false);
  }, [supabase, typeFilter, search]);

  useEffect(() => {
    const timer = setTimeout(loadData, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [loadData, search]);

  // Group by date
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
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[1.75rem] font-bold tracking-tight">Activity</h1>
        <span className="badge bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))]">
          {transactions.length} transactions
        </span>
      </div>

      {/* ── Search + Filters ── */}
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
          className={`btn-ghost !px-3.5 ${showFilters ? "!bg-[rgb(var(--accent))]/8 !text-[rgb(var(--accent))] !border-[rgb(var(--accent))]/20" : ""}`}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>

      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
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

      {/* ── Transactions ── */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-[68px]" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <Inbox className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">No transactions found</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">Adjust your search or filters</p>
        </div>
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
                    className="theme-card px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:border-[rgb(var(--accent))]/20"
                    onClick={() => setEditingTx(tx)}
                  >
                    <div
                      className={`w-11 h-11 rounded-[var(--radius-md)] flex items-center justify-center text-xl shrink-0
                        ${
                          tx.transaction_type === "income"
                            ? "bg-[rgb(var(--income))]/8"
                            : "bg-[rgb(var(--expense))]/8"
                        }`}
                    >
                      {getCategoryEmoji(tx.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{getCategoryLabel(tx.category)}</p>
                      <p className="text-[12px] text-[rgb(var(--text-secondary))] mt-0.5 truncate">
                        {tx.payment_method}
                        {tx.user_id && profilesMap[tx.user_id] ? ` · ${profilesMap[tx.user_id]}` : ""}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </p>
                    </div>
                    <p
                      className={`font-bold text-sm shrink-0 ${
                        tx.transaction_type === "income"
                          ? "text-[rgb(var(--income))]"
                          : "text-[rgb(var(--expense))]"
                      }`}
                    >
                      {tx.transaction_type === "income" ? "+" : "−"}${tx.amount.toFixed(2)}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
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
