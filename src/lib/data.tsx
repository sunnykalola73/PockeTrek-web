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

    const [hhRes, membersRes, txRes, budgetsRes, recRes] = await Promise.all([
      supabase.from("households").select("*").eq("id", prof.household_id).maybeSingle(),
      supabase.from("profiles").select("id, first_name").eq("household_id", prof.household_id),
      supabase
        .from("transactions")
        .select("*")
        .eq("household_id", prof.household_id)
        .order("transaction_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(3000),
      supabase.from("budgets").select("*").eq("household_id", prof.household_id),
      supabase
        .from("recurring_transactions")
        .select("*")
        .eq("household_id", prof.household_id)
        .order("start_date", { ascending: false }),
    ]);

    setHousehold(hhRes.data);

    const map: Record<string, string> = {};
    membersRes.data?.forEach((m) => {
      map[m.id] = m.first_name ?? "User";
    });
    setProfilesMap(map);

    setTransactions(txRes.data ?? []);
    setBudgets(budgetsRes.data ?? []);
    setRecurring(recRes.data ?? []);

    setLoading(false);
  }, [supabase]);

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
