// Category icons — mirrors iOS CategoryAppearance builtin list

export const BUILTIN_EXPENSE_CATEGORIES: Record<string, { emoji: string; label: string }> = {
  food: { emoji: "🍔", label: "Food" },
  groceries: { emoji: "🛒", label: "Groceries" },
  transport: { emoji: "🚗", label: "Transport" },
  entertainment: { emoji: "🎬", label: "Entertainment" },
  shopping: { emoji: "🛍️", label: "Shopping" },
  health: { emoji: "💊", label: "Health" },
  utilities: { emoji: "💡", label: "Utilities" },
  rent: { emoji: "🏠", label: "Rent" },
  subscriptions: { emoji: "📱", label: "Subscriptions" },
  education: { emoji: "📚", label: "Education" },
  travel: { emoji: "✈️", label: "Travel" },
  gifts: { emoji: "🎁", label: "Gifts" },
  insurance: { emoji: "🛡️", label: "Insurance" },
  personal: { emoji: "💇", label: "Personal" },
  other: { emoji: "📦", label: "Other" },
};

export const BUILTIN_INCOME_CATEGORIES: Record<string, { emoji: string; label: string }> = {
  salary: { emoji: "💰", label: "Salary" },
  freelance: { emoji: "💻", label: "Freelance" },
  investments: { emoji: "📈", label: "Investments" },
  rental: { emoji: "🏘️", label: "Rental" },
  refunds: { emoji: "↩️", label: "Refunds" },
  other: { emoji: "💵", label: "Other" },
};

export const expenseCategories = Object.keys(BUILTIN_EXPENSE_CATEGORIES);
export const incomeCategories = Object.keys(BUILTIN_INCOME_CATEGORIES);
export const paymentMethods = ["UPI", "Card", "Cash"];

export function getCategoryEmoji(key: string, customIcons?: Record<string, string>): string {
  if (customIcons?.[key]) return customIcons[key];
  return (
    BUILTIN_EXPENSE_CATEGORIES[key]?.emoji ??
    BUILTIN_INCOME_CATEGORIES[key]?.emoji ??
    "📁"
  );
}

export function getCategoryLabel(key: string): string {
  return (
    BUILTIN_EXPENSE_CATEGORIES[key]?.label ??
    BUILTIN_INCOME_CATEGORIES[key]?.label ??
    key.charAt(0).toUpperCase() + key.slice(1)
  );
}

export const PAYMENT_METHODS = ["UPI", "Card", "Cash"];
