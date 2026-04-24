// Types mirroring iOS Models.swift — shared Supabase schema

export interface Transaction {
  id: string;
  household_id: string;
  user_id: string | null;
  amount: number;
  category: string;         // legacy – kept for iOS compat
  category_id: string | null; // FK to ledger_categories
  payment_method: string;
  transaction_date: string; // yyyy-MM-dd
  transaction_type: "expense" | "income";
  note: string | null;
  created_at: string | null;
  recurring_transaction_id: string | null;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  household_id: string | null;
  created_at: string | null;
}

export interface Household {
  id: string;
  name: string;

  created_at: string | null;
}

export interface Budget {
  id: string;
  household_id: string;
  category: string;         // legacy
  category_id: string | null; // FK to ledger_categories
  monthly_limit: number;
  created_at: string | null;
}

export interface RecurringTransaction {
  id: string;
  household_id: string;
  user_id: string;
  amount: number;
  category: string;         // legacy
  category_id: string | null; // FK to ledger_categories
  payment_method: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  start_date: string;
  end_date: string | null;
  last_executed: string | null;
  is_active: boolean;
  transaction_type: "expense" | "income";
  note: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CategoryReport {
  category: string;
  total_amount: number;
  transaction_count: number;
  transaction_type: string;
}

export interface LedgerCategory {
  id: string;
  household_id: string;
  name: string;
  transaction_type: string;
  icon_emoji: string;
  sort_order: number;
}
