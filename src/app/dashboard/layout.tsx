"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  BarChart3,
  Target,
  Repeat,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CategoryProvider } from "@/lib/categories";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/budgets", label: "Budgets", icon: Target },
  { href: "/dashboard/recurring", label: "Recurring", icon: Repeat },
];

const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/budgets", label: "Budgets", icon: Target },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [householdId, setHouseholdId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("household_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.household_id) setHouseholdId(data.household_id);
        });
    });
  }, []);

  function isActive(href: string) {
    return pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-[rgb(var(--bg-primary))]">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[260px] border-r border-[rgba(var(--border),0.5)] bg-[rgb(var(--bg-card))] fixed h-full z-40">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-8">
          <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shadow-md shadow-[rgb(var(--accent))]/20">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <div>
            <h1 className="font-bold text-[1.05rem] tracking-tight">PockeTrek</h1>
            <p className="text-[11px] text-[rgb(var(--text-secondary))] font-medium">
              Family Finance
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5">
          <p className="section-label px-3 mb-2">Menu</p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[0.875rem] font-medium transition-all duration-200
                  ${
                    active
                      ? "bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))]"
                      : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-secondary))]"
                  }`}
              >
                <Icon size={19} strokeWidth={active ? 2.3 : 1.8} />
                <span className="flex-1">{item.label}</span>
                {active && (
                  <ChevronRight size={14} className="opacity-50" />
                )}
              </Link>
            );
          })}

          <div className="divider !my-4 mx-3" />

          <Link
            href="/dashboard/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[0.875rem] font-medium transition-all duration-200
              ${
                isActive("/dashboard/settings")
                  ? "bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))]"
                  : "text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--bg-secondary))]"
              }`}
          >
            <Settings size={19} strokeWidth={isActive("/dashboard/settings") ? 2.3 : 1.8} />
            <span className="flex-1">Settings</span>
          </Link>
        </nav>

        {/* Sign Out */}
        <div className="px-3 pb-6">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-[var(--radius-md)] text-[0.875rem] font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] hover:bg-[rgb(var(--expense))]/5 transition-all duration-200"
          >
            <LogOut size={19} strokeWidth={1.8} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Header ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-subtle">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="font-bold text-[0.9375rem]">PockeTrek</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-[rgb(var(--bg-secondary))] transition-colors"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile slide-down menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[rgba(var(--border),0.4)] bg-[rgb(var(--bg-card))]"
            >
              <div className="px-3 py-3 space-y-0.5">
                {[...NAV_ITEMS, { href: "/dashboard/settings", label: "Settings", icon: Settings }].map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium transition-all
                        ${
                          active
                            ? "bg-[rgb(var(--accent))]/8 text-[rgb(var(--accent))]"
                            : "text-[rgb(var(--text-secondary))]"
                        }`}
                    >
                      <Icon size={19} />
                      {item.label}
                    </Link>
                  );
                })}
                <div className="divider !my-2 mx-4" />
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium text-[rgb(var(--text-secondary))] hover:text-[rgb(var(--expense))] w-full"
                >
                  <LogOut size={19} />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Mobile Bottom Tab Bar ── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-subtle safe-area-pb">
        <div className="flex justify-around py-1.5 px-2">
          {BOTTOM_NAV.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[52px]
                  ${
                    active
                      ? "text-[rgb(var(--accent))]"
                      : "text-[rgb(var(--text-secondary))]"
                  }`}
              >
                <Icon size={20} strokeWidth={active ? 2.3 : 1.6} />
                <span className={`text-[10px] ${active ? "font-bold" : "font-medium"}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="flex-1 lg:ml-[260px] pt-14 pb-20 lg:pt-0 lg:pb-0 overflow-auto">
        <CategoryProvider householdId={householdId}>
          {children}
        </CategoryProvider>
      </main>
    </div>
  );
}
