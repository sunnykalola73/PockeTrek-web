"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";
import { relativeDate } from "@/lib/dates";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";

export default function ActivityPage() {
  const supabase = createClient();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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
                ${
                  typeFilter === t
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
        Object.entries(grouped).map(([dateKey, txs], sectionIdx) => (
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
                  className="theme-card p-4 flex items-center gap-4"
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl
                      ${
                        tx.transaction_type === "income"
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
                    className={`font-bold text-sm ${
                      tx.transaction_type === "income"
                        ? "text-[rgb(var(--income))]"
                        : "text-[rgb(var(--expense))]"
                    }`}
                  >
                    {tx.transaction_type === "income" ? "+" : "-"}${tx.amount.toFixed(2)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
