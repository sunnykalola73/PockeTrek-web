"use client";

import { useState } from "react";
import { useCategories } from "@/lib/categories";
import type { LedgerCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Loader2, Save, Tags } from "lucide-react";

export default function CategoriesPage() {
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [activeTab, setActiveTab] = useState<"expense" | "income">("expense");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");
  
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = activeTab === "expense" ? expenseCategories : incomeCategories;

  function startEdit(c: LedgerCategory) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditEmoji(c.icon_emoji);
    setIsAdding(false);
    setError(null);
  }

  function startAdd() {
    setIsAdding(true);
    setNewName("");
    setNewEmoji("📁");
    setEditingId(null);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setIsAdding(false);
    setError(null);
  }

  async function handleSaveEdit() {
    if (!editName.trim() || !editEmoji.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await updateCategory(editingId!, editName, editEmoji);
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || "Failed to update category");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAdd() {
    if (!newName.trim() || !newEmoji.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await addCategory(newName, newEmoji, activeTab);
      setIsAdding(false);
    } catch (err: any) {
      setError(err.message || "Failed to add category");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure? Transactions using this category will still exist but won't have an icon.")) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCategory(id);
    } catch (err: any) {
      setError(err.message || "Failed to delete category");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center text-white shadow-sm">
          <Tags size={20} />
        </div>
        <div>
          <h1 className="text-[1.75rem] font-bold tracking-tight leading-none">Categories</h1>
          <p className="text-sm text-[rgb(var(--text-secondary))] mt-1">
            Manage your transaction categories
          </p>
        </div>
      </div>

      <div className="theme-card overflow-hidden">
        <div className="flex p-4 gap-2 border-b border-[rgba(var(--border),0.4)]">
          <button
            onClick={() => setActiveTab("expense")}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
              activeTab === "expense"
                ? "bg-[rgb(var(--expense))]/10 text-[rgb(var(--expense))]"
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))]"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
              activeTab === "income"
                ? "bg-[rgb(var(--income))]/10 text-[rgb(var(--income))]"
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))]"
            }`}
          >
            Income
          </button>
        </div>

        <div className="p-4 space-y-3">
          {error && (
            <p className="text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/10 p-3 rounded-lg mb-4 font-medium">
              {error}
            </p>
          )}

          {categories.map((c) => (
            <motion.div 
              layout
              key={c.id} 
              className="p-3 flex items-center gap-3 bg-[rgb(var(--bg-primary))] rounded-[var(--radius-md)] border border-[rgba(var(--border),0.4)]"
            >
              {editingId === c.id ? (
                <>
                  <input
                    type="text"
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    maxLength={2}
                    className="w-12 h-10 text-center !p-0 !text-xl bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-md outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/50 transition-all"
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-10 !px-3 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-md outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/50 transition-all"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-[rgb(var(--safe))]/10 text-[rgb(var(--safe))] hover:bg-[rgb(var(--safe))]/20"
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  </button>
                  <button
                    onClick={cancelEdit}
                    disabled={loading}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.5)]"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-[rgb(var(--bg-secondary))] shrink-0">
                    {c.icon_emoji}
                  </div>
                  <p className="flex-1 font-semibold text-[0.9375rem] capitalize">
                    {c.name}
                  </p>
                  <button
                    onClick={() => startEdit(c)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--accent))] hover:bg-[rgb(var(--accent))]/10"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </motion.div>
          ))}

          {isAdding ? (
            <motion.div 
              layout
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 flex items-center gap-3 border-[rgb(var(--accent))]/30 border-2 border-dashed rounded-[var(--radius-md)] bg-[rgb(var(--bg-primary))]"
            >
              <input
                type="text"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                maxLength={2}
                className="w-12 h-10 text-center !p-0 !text-xl bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-md outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/50 transition-all"
              />
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 h-10 !px-3 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-md outline-none focus:ring-2 focus:ring-[rgb(var(--accent))]/50 transition-all"
                autoFocus
              />
              <button
                onClick={handleSaveAdd}
                disabled={loading}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[rgb(var(--safe))]/10 text-[rgb(var(--safe))] hover:bg-[rgb(var(--safe))]/20"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              </button>
              <button
                onClick={cancelEdit}
                disabled={loading}
                className="w-10 h-10 flex items-center justify-center rounded-lg bg-[rgb(var(--bg-secondary))] hover:bg-[rgba(var(--border),0.5)]"
              >
                <X size={16} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              layout
              onClick={startAdd}
              className="w-full py-4 mt-2 rounded-[var(--radius-md)] border-2 border-dashed border-[rgba(var(--border),0.6)] text-[rgb(var(--text-secondary))] font-semibold flex items-center justify-center gap-2 hover:bg-[rgb(var(--bg-secondary))] transition-colors"
            >
              <Plus size={16} />
              Add Category
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
