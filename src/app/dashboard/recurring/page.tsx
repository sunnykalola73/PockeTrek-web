"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RecurringTransaction } from "@/lib/types";
import { getCategoryEmoji, getCategoryLabel } from "@/lib/categories";
import { motion } from "framer-motion";
import { Repeat } from "lucide-react";

export default function RecurringPage() {
  const supabase = createClient();
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

  function frequencyLabel(f: string) {
    return { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" }[f] ?? f;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">Recurring</h1>

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
