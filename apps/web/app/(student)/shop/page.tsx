"use client";

import { motion } from "framer-motion";
import { Gem, Rocket, Shirt, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/card";
import { CoinBalance } from "@/components/gamification/badges";
import { useGamification } from "@/lib/stores/gamification";

const CATEGORIES = [
  { icon: <Shirt className="size-6" />, title: "Аватары", desc: "Настройте своего героя обучения" },
  { icon: <Wand2 className="size-6" />, title: "Темы оформления", desc: "Акценты и цвета интерфейса" },
  { icon: <Gem className="size-6" />, title: "Косметика", desc: "Рамки, эффекты, титулы профиля" },
  { icon: <Rocket className="size-6" />, title: "Бустеры", desc: "Ускорение прогресса по темам" },
] as const;

export default function ShopPage() {
  const coins = useGamification((s) => s.coins);
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Магазин</h1>
          <p className="mt-1 text-text-2">Зарабатывайте монеты за серию дней — тратьте их здесь.</p>
        </div>
        <CoinBalance />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-dashed border-primary/40 bg-primary-subtle p-6 text-center"
      >
        <Badge tone="primary">Скоро</Badge>
        <p className="mt-3 text-sm text-text-2">
          Магазин появится, когда серверная часть добавит геймификацию. Ваш баланс уже копится локально.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2">
        {CATEGORIES.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-surface p-5 shadow-card"
          >
            <span className="grid size-12 place-items-center rounded-lg bg-primary-light text-primary">{c.icon}</span>
            <h3 className="mt-3 flex items-center gap-2 text-lg font-black">
              {c.title} <Badge tone="neutral">скоро</Badge>
            </h3>
            <p className="mt-1 text-sm text-text-2">{c.desc}</p>
          </motion.div>
        ))}
      </div>

      <p className="text-center text-xs text-text-3">Баланс: {coins} монет (локальный демо-счётчик)</p>
    </div>
  );
}
