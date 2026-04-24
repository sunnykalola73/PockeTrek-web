"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  Transaction,
  Profile,
  Household,
  Budget,
  RecurringTransaction,
} from "@/lib/types";

interface DataContextValue {
  profile: Profile | null;
  household: Household | null;
  profilesMap: Record<string, string>;
  transactions: Transaction[];
  budgets: Budget[];
  recurring: RecurringTransaction[];
  loading: boolean;
  refresh: () => Promise<void>;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (tx: Transaction) => void;
  deleteTransaction: (id: string) => void;
  globalStats: { total_income: number; total_expenses: number; balance: number };
  loadMoreTransactions: () => Promise<void>;
  hasMoreTransactions: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({ total_income: 0, total_expenses: 0, balance: 0 });
  const [hasMoreTransactions, setHasMoreTransactions] = useState(true);
  const PAGE_SIZE = 50;

  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    setProfile(prof);

    if (!prof?.household_id) {
      setLoading(false);
      return;
    }

    const [hhRes, membersRes, txRes, budgetsRes, recRes, statsRes] = await Promise.all([
      supabase.from("households").select("*").eq("id", prof.household_id).maybeSingle(),
      supabase.from("profiles").select("id, first_name").eq("household_id", prof.household_id),
      supabase
        .from("transactions")
        .select("*")
        .eq("household_id", prof.household_id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase.from("budgets").select("*").eq("household_id", prof.household_id),
      supabase
        .from("recurring_transactions")
        .select("*")
        .eq("household_id", prof.household_id)
        .order("start_date", { ascending: false }),
      supabase.rpc("get_household_stats", { h_id: prof.household_id }),
    ]);

    setHousehold(hhRes.data);

    const map: Record<string, string> = {};
    membersRes.data?.forEach((m) => {
      map[m.id] = m.first_name ?? "User";
    });
    setProfilesMap(map);

    setTransactions(txRes.data ?? []);
    setHasMoreTransactions((txRes.data?.length ?? 0) === PAGE_SIZE);
    setBudgets(budgetsRes.data ?? []);
    setRecurring(recRes.data ?? []);
    setGlobalStats(statsRes.data || { total_income: 0, total_expenses: 0, balance: 0 });

    setLoading(false);
  }, [supabase]);

  const loadMoreTransactions = useCallback(async () => {
    if (!profile?.household_id || !hasMoreTransactions || transactions.length === 0) return;
    
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(transactions.length, transactions.length + PAGE_SIZE - 1);
      
    if (data && data.length > 0) {
      setTransactions((prev) => {
        // Prevent duplicates in case of race conditions
        const existingIds = new Set(prev.map(t => t.id));
        const newTxs = data.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTxs];
      });
      setHasMoreTransactions(data.length === PAGE_SIZE);
    } else {
      setHasMoreTransactions(false);
    }
  }, [profile?.household_id, hasMoreTransactions, transactions.length, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Optimistic UI updates
  const addTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) => [tx, ...prev].sort((a, b) => 
      new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
    ));
  }, []);

  const updateTransaction = useCallback((tx: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === tx.id ? tx : t)).sort((a, b) => 
        new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
      )
    );
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <DataContext.Provider
      value={{
        profile,
        household,
        profilesMap,
        transactions,
        budgets,
        recurring,
        loading,
        refresh: loadData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        globalStats,
        loadMoreTransactions,
        hasMoreTransactions,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within a DataProvider");
  }
  return ctx;
}
