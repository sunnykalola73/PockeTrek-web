// Category system — fetches from Supabase, caches in localStorage, seeds defaults

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { LedgerCategory } from "@/lib/types";

// ── Default categories (seeded on first use) ──
export const DEFAULT_EXPENSE_CATEGORIES: Omit<LedgerCategory, "id" | "household_id">[] = [
  { name: "food", transaction_type: "expense", icon_emoji: "🍔", sort_order: 0 },
  { name: "transport", transaction_type: "expense", icon_emoji: "🚗", sort_order: 1 },
  { name: "shopping", transaction_type: "expense", icon_emoji: "🛍️", sort_order: 2 },
];

export const DEFAULT_INCOME_CATEGORIES: Omit<LedgerCategory, "id" | "household_id">[] = [
  { name: "salary", transaction_type: "income", icon_emoji: "💰", sort_order: 0 },
  { name: "freelance", transaction_type: "income", icon_emoji: "💻", sort_order: 1 },
  { name: "investments", transaction_type: "income", icon_emoji: "📈", sort_order: 2 },
];

const ALL_DEFAULTS = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];

// ── Lookup helpers (work with any category array) ──

export function getCategoryEmoji(
  key: string,
  categories?: LedgerCategory[]
): string {
  if (categories) {
    const found = categories.find((c) => c.name === key);
    if (found) return found.icon_emoji;
  }
  // Fallback to defaults
  const def = ALL_DEFAULTS.find((c) => c.name === key);
  return def?.icon_emoji ?? "📁";
}

export function getCategoryLabel(
  key: string,
  categories?: LedgerCategory[]
): string {
  if (categories) {
    const found = categories.find((c) => c.name === key);
    if (found) return found.name.charAt(0).toUpperCase() + found.name.slice(1);
  }
  // Fallback: capitalize
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export const PAYMENT_METHODS = ["UPI", "Card", "Cash"];

// ── Cache keys ──
const CACHE_KEY = "pocketrek_categories";
const CACHE_TS_KEY = "pocketrek_categories_ts";
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

function readCache(): LedgerCategory[] | null {
  try {
    const ts = localStorage.getItem(CACHE_TS_KEY);
    if (ts && Date.now() - parseInt(ts) < CACHE_TTL) {
      const data = localStorage.getItem(CACHE_KEY);
      if (data) return JSON.parse(data);
    }
  } catch {}
  return null;
}

function writeCache(cats: LedgerCategory[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cats));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch {}
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TS_KEY);
  } catch {}
}

// ── Context ──

interface CategoryContextValue {
  categories: LedgerCategory[];
  expenseCategories: LedgerCategory[];
  incomeCategories: LedgerCategory[];
  loading: boolean;
  addCategory: (
    name: string,
    emoji: string,
    txType: "expense" | "income"
  ) => Promise<void>;
  updateCategory: (
    id: string,
    name: string,
    emoji: string
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const CategoryContext = createContext<CategoryContextValue | null>(null);

export function CategoryProvider({
  householdId,
  children,
}: {
  householdId: string | null;
  children: ReactNode;
}) {
  const supabase = createClient();
  const [categories, setCategories] = useState<LedgerCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }

    // Try cache first
    const cached = readCache();
    if (cached && cached.length > 0 && cached[0]?.household_id === householdId) {
      setCategories(cached);
      setLoading(false);
      // Still refresh in background
      fetchFromDb(false);
      return;
    }

    await fetchFromDb(true);
  }, [householdId]);

  async function fetchFromDb(updateLoading: boolean) {
    if (!householdId) return;

    const { data, error } = await supabase
      .from("ledger_categories")
      .select("*")
      .eq("household_id", householdId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Failed to fetch categories:", error);
      if (updateLoading) setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      // Seed defaults
      const seedData = ALL_DEFAULTS.map((c) => ({
        ...c,
        household_id: householdId,
      }));

      const { data: inserted, error: seedError } = await supabase
        .from("ledger_categories")
        .insert(seedData)
        .select();

      if (seedError) {
        console.error("Failed to seed categories:", seedError);
      } else if (inserted) {
        setCategories(inserted);
        writeCache(inserted);
      }
    } else {
      setCategories(data);
      writeCache(data);
    }

    if (updateLoading) setLoading(false);
  }

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = useCallback(
    async (name: string, emoji: string, txType: "expense" | "income") => {
      if (!householdId) return;

      const maxOrder = categories
        .filter((c) => c.transaction_type === txType)
        .reduce((max, c) => Math.max(max, c.sort_order), -1);

      const { data, error } = await supabase
        .from("ledger_categories")
        .insert({
          household_id: householdId,
          name: name.toLowerCase().trim(),
          icon_emoji: emoji,
          transaction_type: txType,
          sort_order: maxOrder + 1,
        })
        .select()
        .maybeSingle();

      if (error) {
        console.error("Failed to add category:", error);
        throw error;
      }

      const updated = [...categories, data];
      setCategories(updated);
      writeCache(updated);
    },
    [householdId, categories, supabase]
  );

  const updateCategory = useCallback(
    async (id: string, name: string, emoji: string) => {
      const { error } = await supabase
        .from("ledger_categories")
        .update({ name: name.toLowerCase().trim(), icon_emoji: emoji })
        .eq("id", id);

      if (error) {
        console.error("Failed to update category:", error);
        throw error;
      }

      const updated = categories.map((c) =>
        c.id === id
          ? { ...c, name: name.toLowerCase().trim(), icon_emoji: emoji }
          : c
      );
      setCategories(updated);
      writeCache(updated);
    },
    [categories, supabase]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      const { error } = await supabase
        .from("ledger_categories")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Failed to delete category:", error);
        throw error;
      }

      const updated = categories.filter((c) => c.id !== id);
      setCategories(updated);
      writeCache(updated);
    },
    [categories, supabase]
  );

  const refresh = useCallback(async () => {
    clearCache();
    await fetchFromDb(true);
  }, [householdId]);

  const expenseCategories = categories.filter(
    (c) => c.transaction_type === "expense"
  );
  const incomeCategories = categories.filter(
    (c) => c.transaction_type === "income"
  );

  return (
    <CategoryContext.Provider
      value={{
        categories,
        expenseCategories,
        incomeCategories,
        loading,
        addCategory,
        updateCategory,
        deleteCategory,
        refresh,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
}

export function useCategories() {
  const ctx = useContext(CategoryContext);
  if (!ctx) {
    // Return a fallback for pages outside the provider
    return {
      categories: [] as LedgerCategory[],
      expenseCategories: [] as LedgerCategory[],
      incomeCategories: [] as LedgerCategory[],
      loading: false,
      addCategory: async () => {},
      updateCategory: async () => {},
      deleteCategory: async () => {},
      refresh: async () => {},
    };
  }
  return ctx;
}
