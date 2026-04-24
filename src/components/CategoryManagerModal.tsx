"use client";

import { useState } from "react";
import { useCategories } from "@/lib/categories";
import type { LedgerCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Loader2, Save } from "lucide-react";

export default function CategoryManagerModal({
  onClose,
}: {
  onClose: () => void;
}) {
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-md flex items-end lg:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 30, stiffness: 350 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[480px] bg-[rgb(var(--bg-card))] rounded-t-[var(--radius-hero)] lg:rounded-[var(--radius-hero)] max-h-[92vh] overflow-hidden flex flex-col shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-[rgba(var(--border),0.4)]">
          <h2 className="text-lg font-bold tracking-tight">Categories</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[rgb(var(--bg-secondary))] flex items-center justify-center hover:bg-[rgba(var(--border),0.7)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex px-6 pt-4 gap-2">
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

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {error && (
            <p className="text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/10 p-3 rounded-lg mb-4 font-medium">
              {error}
            </p>
          )}

          {categories.map((c) => (
            <div key={c.id} className="theme-card p-3 flex items-center gap-3">
              {editingId === c.id ? (
                <>
                  <input
                    type="text"
                    value={editEmoji}
                    onChange={(e) => setEditEmoji(e.target.value)}
                    className="w-12 h-10 text-center !p-0 !text-xl"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 h-10 !px-3"
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
            </div>
          ))}

          {isAdding ? (
            <div className="theme-card p-3 flex items-center gap-3 border-[rgb(var(--accent))]/30 border-2 border-dashed">
              <input
                type="text"
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                className="w-12 h-10 text-center !p-0 !text-xl"
                maxLength={2}
              />
              <input
                type="text"
                placeholder="Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 h-10 !px-3"
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
            </div>
          ) : (
            <button
              onClick={startAdd}
              className="w-full py-4 rounded-[var(--radius-md)] border-2 border-dashed border-[rgba(var(--border),0.6)] text-[rgb(var(--text-secondary))] font-semibold flex items-center justify-center gap-2 hover:bg-[rgb(var(--bg-secondary))] transition-colors"
            >
              <Plus size={16} />
              Add Category
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
