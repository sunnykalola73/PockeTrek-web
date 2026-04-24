-- Sample Data Seed Script for PockeTrek
-- This script will automatically find the FIRST available user and household in your database,
-- and populate them with realistic sample data (Budgets, Recurring, and Transactions).

DO $$ 
DECLARE
  target_user_id UUID;
  target_household_id UUID;
  i INTEGER;
  random_amount NUMERIC;
  random_category TEXT;
  random_date DATE;
  expense_categories TEXT[] := ARRAY['food', 'housing', 'utilities', 'entertainment', 'transportation', 'health', 'shopping', 'personal'];
  income_categories TEXT[] := ARRAY['salary', 'freelance', 'investments', 'gifts', 'other'];
  payment_methods TEXT[] := ARRAY['Credit Card', 'Debit Card', 'UPI', 'Cash', 'Bank Transfer'];
BEGIN
  -- 1. Find the first available user and household
  SELECT id, household_id INTO target_user_id, target_household_id
  FROM public.profiles
  WHERE household_id IS NOT NULL
  LIMIT 1;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'No user with an assigned household found. Please sign up first.';
  END IF;

  -- 2. Clear out any existing sample budgets and recurring items to prevent duplicates
  DELETE FROM public.budgets WHERE household_id = target_household_id;
  DELETE FROM public.recurring_transactions WHERE household_id = target_household_id;

  -- 3. Insert Sample Budgets
  INSERT INTO public.budgets (household_id, category, monthly_limit) VALUES
  (target_household_id, 'food', 600.00),
  (target_household_id, 'housing', 1500.00),
  (target_household_id, 'utilities', 200.00),
  (target_household_id, 'entertainment', 150.00),
  (target_household_id, 'transportation', 300.00);

  -- 4. Insert Sample Recurring Transactions
  INSERT INTO public.recurring_transactions (household_id, user_id, amount, category, payment_method, frequency, start_date, is_active, transaction_type, note) VALUES
  (target_household_id, target_user_id, 1500.00, 'housing', 'Bank Transfer', 'monthly', CURRENT_DATE - INTERVAL '2 months', true, 'expense', 'Monthly Rent'),
  (target_household_id, target_user_id, 4500.00, 'salary', 'Bank Transfer', 'monthly', CURRENT_DATE - INTERVAL '2 months', true, 'income', 'Software Engineer Salary'),
  (target_household_id, target_user_id, 15.99, 'entertainment', 'Credit Card', 'monthly', CURRENT_DATE - INTERVAL '1 month', true, 'expense', 'Netflix Subscription');

  -- 5. Insert 80 Random Transactions across the last 90 days
  FOR i IN 1..80 LOOP
    -- Generate random dates within the last 90 days
    random_date := CURRENT_DATE - (floor(random() * 90)::INT);
    
    -- 80% chance of expense, 20% chance of income
    IF random() < 0.8 THEN
      random_amount := floor(random() * 100) + 5.00 + (floor(random() * 99)::numeric / 100); -- Random amount between 5.00 and 105.99
      random_category := expense_categories[floor(random() * array_length(expense_categories, 1)) + 1];
      
      -- Occasional large expense
      IF random() < 0.05 THEN
        random_amount := random_amount + 500; 
      END IF;

      INSERT INTO public.transactions (household_id, user_id, amount, category, payment_method, transaction_date, transaction_type, note)
      VALUES (target_household_id, target_user_id, random_amount, random_category, payment_methods[floor(random() * array_length(payment_methods, 1)) + 1], random_date, 'expense', 'Sample Expense ' || i);
    ELSE
      random_amount := floor(random() * 500) + 50.00 + (floor(random() * 99)::numeric / 100); -- Random amount between 50.00 and 550.99
      random_category := income_categories[floor(random() * array_length(income_categories, 1)) + 1];

      INSERT INTO public.transactions (household_id, user_id, amount, category, payment_method, transaction_date, transaction_type, note)
      VALUES (target_household_id, target_user_id, random_amount, random_category, payment_methods[floor(random() * array_length(payment_methods, 1)) + 1], random_date, 'income', 'Sample Income ' || i);
    END IF;
  END LOOP;

  RAISE NOTICE 'Sample data successfully injected for Household ID: %', target_household_id;
END $$;
