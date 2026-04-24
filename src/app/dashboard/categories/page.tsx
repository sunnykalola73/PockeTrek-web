"use client";

import { useState } from "react";
import { useCategories } from "@/lib/categories";
import type { LedgerCategory } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Pencil, Trash2, Loader2, Save, Tags, Smile } from "lucide-react";

// ── Reusable form card shown when adding or editing ──────────
function CategoryForm({
  emoji,
  name,
  onEmojiChange,
  onNameChange,
  onSave,
  onCancel,
  loading,
  label,
}: {
  emoji: string;
  name: string;
  onEmojiChange: (v: string) => void;
  onNameChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  loading: boolean;
  label: string;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="p-4 space-y-4 border-2 border-dashed border-[rgb(var(--accent))]/30 rounded-[var(--radius-md)] bg-[rgb(var(--bg-primary))]"
    >
      <p className="text-xs font-bold uppercase tracking-widest text-[rgb(var(--accent))] opacity-70">
        {label}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Icon input */}
        <div className="space-y-1.5">
          <label className="section-label flex items-center gap-1.5">
            <Smile size={11} />
            Icon
          </label>
          <div className="relative">
            <input
              type="text"
              value={emoji}
              onChange={(e) => onEmojiChange(e.target.value)}
              maxLength={2}
              placeholder="😀"
              className="w-full h-12 text-center !text-2xl !p-0 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-[var(--radius-md)] outline-none border border-[rgba(var(--border),0.5)] focus:border-[rgb(var(--accent))]/50 focus:ring-2 focus:ring-[rgb(var(--accent))]/20 transition-all"
            />
            <p className="text-[10px] text-[rgb(var(--text-secondary))] text-center mt-1">
              Press ⌃⌘Space for emoji
            </p>
          </div>
        </div>

        {/* Name input */}
        <div className="space-y-1.5">
          <label className="section-label flex items-center gap-1.5">
            <Tags size={11} />
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g. Groceries"
            autoFocus
            className="w-full h-12 !px-3 bg-[rgb(var(--bg-secondary))] text-[rgb(var(--foreground))] rounded-[var(--radius-md)] outline-none border border-[rgba(var(--border),0.5)] focus:border-[rgb(var(--accent))]/50 focus:ring-2 focus:ring-[rgb(var(--accent))]/20 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) onSave();
              if (e.key === "Escape") onCancel();
            }}
          />
          <p className="text-[10px] text-[rgb(var(--text-secondary))]">
            Press Enter to save
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={loading || !name.trim() || !emoji.trim()}
          className="flex-1 h-10 flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold bg-[rgb(var(--safe))]/10 text-[rgb(var(--safe))] hover:bg-[rgb(var(--safe))]/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          Save
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="h-10 px-4 flex items-center justify-center gap-2 rounded-[var(--radius-md)] text-sm font-semibold bg-[rgb(var(--bg-secondary))] text-[rgb(var(--text-secondary))] hover:bg-[rgba(var(--border),0.6)] transition-all"
        >
          <X size={14} />
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

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
  const [newEmoji, setNewEmoji] = useState("📁");

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
        {/* Tab switcher */}
        <div className="flex p-4 gap-2 border-b border-[rgba(var(--border),0.4)]">
          <button
            onClick={() => { setActiveTab("expense"); cancelEdit(); }}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
              activeTab === "expense"
                ? "bg-[rgb(var(--expense))]/10 text-[rgb(var(--expense))]"
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))]"
            }`}
          >
            Expenses
          </button>
          <button
            onClick={() => { setActiveTab("income"); cancelEdit(); }}
            className={`flex-1 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold transition-all ${
              activeTab === "income"
                ? "bg-[rgb(var(--income))]/10 text-[rgb(var(--income))]"
                : "text-[rgb(var(--text-secondary))] hover:bg-[rgb(var(--bg-secondary))]"
            }`}
          >
            Income
          </button>
        </div>

        <div className="p-4 space-y-2.5">
          {error && (
            <p className="text-sm text-[rgb(var(--expense))] bg-[rgb(var(--expense))]/10 p-3 rounded-lg font-medium">
              {error}
            </p>
          )}

          <AnimatePresence initial={false}>
            {categories.map((c) => (
              <motion.div layout key={c.id} className="space-y-2">
                {/* Normal row */}
                {editingId !== c.id && (
                  <motion.div
                    layout
                    className="p-3 flex items-center gap-3 bg-[rgb(var(--bg-primary))] rounded-[var(--radius-md)] border border-[rgba(var(--border),0.4)]"
                  >
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
                  </motion.div>
                )}

                {/* Expanded edit form — replaces the row */}
                {editingId === c.id && (
                  <CategoryForm
                    emoji={editEmoji}
                    name={editName}
                    onEmojiChange={setEditEmoji}
                    onNameChange={setEditName}
                    onSave={handleSaveEdit}
                    onCancel={cancelEdit}
                    loading={loading}
                    label={`Editing "${c.name}"`}
                  />
                )}
              </motion.div>
            ))}

            {/* Add form */}
            {isAdding && (
              <CategoryForm
                key="add-form"
                emoji={newEmoji}
                name={newName}
                onEmojiChange={setNewEmoji}
                onNameChange={setNewName}
                onSave={handleSaveAdd}
                onCancel={cancelEdit}
                loading={loading}
                label="New Category"
              />
            )}
          </AnimatePresence>

          {/* Add button */}
          {!isAdding && (
            <motion.button
              layout
              onClick={startAdd}
              className="w-full py-4 mt-1 rounded-[var(--radius-md)] border-2 border-dashed border-[rgba(var(--border),0.6)] text-[rgb(var(--text-secondary))] font-semibold flex items-center justify-center gap-2 hover:bg-[rgb(var(--bg-secondary))] hover:border-[rgb(var(--accent))]/30 hover:text-[rgb(var(--accent))] transition-all"
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
