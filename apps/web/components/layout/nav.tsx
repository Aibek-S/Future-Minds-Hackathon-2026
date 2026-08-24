"use client";

import {
  BookOpen,
  Brain,
  GraduationCap,
  Home,
  LayoutDashboard,
  Map,
  ShoppingBag,
  Sparkles,
  Target,
  User,
  Users,
  X,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useT } from "@/lib/i18n/use-t";

export const STUDENT_NAV = [
  { href: "/home", icon: Home, key: "home" },
  { href: "/roadmap", icon: Map, key: "roadmap" },
  { href: "/practice", icon: Target, key: "practice" },
  { href: "/progress", icon: Brain, key: "progress" },
] as const;

export const STUDENT_NAV_SECONDARY = [
  { href: "/learn", icon: BookOpen, key: "learn" as const },
  { href: "/tutor", icon: Sparkles, key: "tutor" as const },
  { href: "/shop", icon: ShoppingBag, key: "shop" as const },
  { href: "/profile", icon: User, key: "profile" as const },
];

export const TEACHER_NAV = [
  { href: "/teacher", icon: LayoutDashboard, label: "Дашборд" },
  { href: "/teacher/planner", icon: Sparkles, label: "ИИ-планировщик" },
];

export function StudentSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { t } = useT();
  return (
    <>
      {/* Mobile drawer backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-lg font-black text-white">
            Z
          </span>
          <span className="text-lg font-black tracking-tight text-primary">ZERTTE</span>
          <button
            onClick={onClose}
            className="ml-auto grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {[...STUDENT_NAV, ...STUDENT_NAV_SECONDARY].map(({ href, icon: Icon, key }) => (
            <NavItem
              key={href}
              href={href}
              icon={<Icon className="size-5" />}
              label={t.nav[key]}
            />
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="rounded-lg bg-primary-subtle p-3">
            <p className="text-xs font-semibold text-primary">ZERTTE знает ваш уровень</p>
            <p className="mt-1 text-[11px] leading-snug text-text-2">
              Мастерство обновляется после каждого ответа.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-bold uppercase tracking-wide transition-all",
        active
          ? "border-2 border-primary bg-primary-light text-primary"
          : "border-2 border-transparent text-text-2 hover:bg-surface-2 hover:text-text",
      )}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      {label}
    </Link>
  );
}

export function TeacherSidebar({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onClose} aria-hidden />
      )}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-surface transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="grid size-9 place-items-center rounded-md bg-text text-lg font-black text-white">
            Z
          </span>
          <div className="leading-none">
            <p className="text-base font-black">ZERTTE</p>
            <p className="text-[11px] font-medium text-text-3">Учитель</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto grid size-8 place-items-center rounded-md text-text-3 hover:bg-surface-2 lg:hidden"
            aria-label="Закрыть меню"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {TEACHER_NAV.map(({ href, icon: Icon, label }) => (
            <NavItem
              key={href}
              href={href}
              icon={<Icon className="size-5" />}
              label={label}
            />
          ))}
        </nav>
        <div className="border-t border-border px-3 py-4 text-[11px] text-text-3">
          <GraduationCap className="mb-1 size-4" />
          Профессиональная аналитика класса
        </div>
      </aside>
    </>
  );
}

export function StudentBottomNav() {
  const { t } = useT();
  const pathname = usePathname();
  const items = [
    { href: "/home", icon: Home, label: t.nav.home },
    { href: "/roadmap", icon: Map, label: t.nav.roadmap },
    { href: "/practice", icon: Target, label: t.nav.practice },
    { href: "/tutor", icon: Sparkles, label: t.nav.ai },
    { href: "/profile", icon: User, label: t.nav.profile },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Основная навигация"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex flex-col items-center gap-0.5 py-2 text-[10px] font-bold uppercase tracking-wide transition",
                active ? "text-primary" : "text-text-3 hover:text-text-2",
              )}
            >
              <span
                className={clsx(
                  "grid size-9 place-items-center rounded-full transition",
                  active && "bg-primary-light scale-105",
                )}
              >
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CalendarIcon() {
  return <CalendarDays className="size-4" />;
}
