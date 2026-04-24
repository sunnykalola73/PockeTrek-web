"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecurringTransaction } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel, useCategories } from "@/lib/categories";
import { motion } from "framer-motion";
import { Repeat, CalendarClock } from "lucide-react";

export default function RecurringPage() {
  const supabase = createClient();
  const { categories: cats } = useCategories();
  const [items, setItems] = useState<RecurringTransaction[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

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

  const frequencyMap: Record<string, string> = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  };

  const totalMonthly = items
    .filter((r) => r.is_active && r.transaction_type === "expense")
    .reduce((sum, r) => {
      const multiplier = { daily: 30, weekly: 4.3, monthly: 1, yearly: 1 / 12 }[r.frequency] ?? 1;
      return sum + r.amount * multiplier;
    }, 0);

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-[1.75rem] font-bold tracking-tight">Recurring</h1>
        {items.length > 0 && (
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            ~${totalMonthly.toFixed(2)}/mo in recurring expenses
          </p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton h-[84px]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[rgb(var(--bg-secondary))] flex items-center justify-center mx-auto mb-4">
            <CalendarClock className="w-7 h-7 text-[rgb(var(--text-secondary))] opacity-50" />
          </div>
          <p className="font-semibold text-[rgb(var(--text-secondary))]">No recurring transactions</p>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1.5 max-w-[260px] mx-auto">
            Set up recurring entries from the iOS app to see them here
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((rec, i) => {
            const tint = rec.transaction_type === "income" ? "--income" : "--expense";
            return (
              <motion.div
                key={rec.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="theme-card p-5 flex items-center gap-4"
              >
                <div
                  className="w-12 h-12 rounded-[var(--radius-md)] flex items-center justify-center text-2xl shrink-0"
                  style={{ background: `rgba(var(${tint}), 0.08)` }}
                >
                  {getCategoryEmoji(rec.category, cats)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[0.9375rem]">{getCategoryLabel(rec.category, cats)}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="badge bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))]">
                      <Repeat size={10} />
                      {frequencyMap[rec.frequency] ?? rec.frequency}
                    </span>
                    <span className="text-[11px] text-[rgb(var(--text-secondary))]">
                      {rec.payment_method}
                    </span>
                    {rec.user_id && profilesMap[rec.user_id] && (
                      <span className="text-[11px] text-[rgb(var(--text-secondary))]">
                        · {profilesMap[rec.user_id]}
                      </span>
                    )}
                    {!rec.is_active && (
                      <span className="badge bg-[rgb(var(--caution))]/10 text-[rgb(var(--caution))]">
                        Paused
                      </span>
                    )}
                  </div>
                </div>

                <p
                  className="font-bold text-lg shrink-0"
                  style={{ color: `rgb(var(${tint}))` }}
                >
                  {rec.transaction_type === "income" ? "+" : "−"}${rec.amount.toFixed(2)}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
