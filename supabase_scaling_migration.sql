-- 1. Covering Index for Transactions
-- This drastically improves query speeds for household transactions and sorts them perfectly for pagination.
CREATE INDEX IF NOT EXISTS idx_transactions_household_date
ON public.transactions (household_id, transaction_date DESC, created_at DESC);

-- 2. RPC to get global household stats (Total Balance, Income, Expenses)
-- This takes milliseconds thanks to the index above, returning aggregates instead of thousands of rows.
CREATE OR REPLACE FUNCTION get_household_stats(h_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_income NUMERIC := 0;
  total_expense NUMERIC := 0;
BEGIN
  -- Sum income
  SELECT COALESCE(SUM(amount), 0) INTO total_income
  FROM public.transactions
  WHERE household_id = h_id AND transaction_type = 'income';

  -- Sum expense
  SELECT COALESCE(SUM(amount), 0) INTO total_expense
  FROM public.transactions
  WHERE household_id = h_id AND transaction_type = 'expense';

  RETURN json_build_object(
    'total_income', total_income,
    'total_expenses', total_expense,
    'balance', total_income - total_expense
  );
END;
$$;

-- 3. RPC to get category spending dynamically (e.g. for this month's budgets or custom date ranges)
CREATE OR REPLACE FUNCTION get_category_spending(h_id UUID, start_date DATE, end_date DATE)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(COALESCE(category, 'Uncategorized'), total_amount) INTO result
  FROM (
    SELECT category, SUM(amount) AS total_amount
    FROM public.transactions
    WHERE household_id = h_id
      AND transaction_type = 'expense'
      AND transaction_date >= start_date
      AND transaction_date <= end_date
    GROUP BY category
  ) sub;

  RETURN COALESCE(result, '{}'::JSON);
END;
$$;
