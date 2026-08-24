"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { useRegister } from "@/lib/hooks/use-auth";

export default function RegisterPage() {
  const router = useRouter();
  const register = useRegister();
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await register.mutateAsync({
        name: String(form.get("name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
        role,
        ...(role === "STUDENT" ? { grade: Number(form.get("grade")) } : {}),
      });
      router.replace(role === "TEACHER" ? "/teacher" : "/onboarding");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("409") || /exists|занят/i.test(msg)
          ? "Этот email уже зарегистрирован."
          : msg || "Не удалось создать аккаунт. Проверьте данные и попробуйте ещё раз.",
      );
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-6">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-primary text-2xl font-black text-white shadow-pop font-display">
            Z
          </span>
          <span className="text-2xl font-black tracking-tight text-primary font-display">ZERTTE</span>
        </Link>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8">
          <h1 className="text-2xl font-black">Создать аккаунт</h1>
          <p className="mt-1 text-sm text-text-2">
            ZERTTE построит персональный путь обучения под ваш уровень.
          </p>

          {/* Role switch */}
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-md bg-surface-2 p-1">
            {(["STUDENT", "TEACHER"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`rounded-sm py-2.5 text-sm font-bold transition ${
                  role === r ? "bg-surface text-primary shadow-card" : "text-text-2 hover:text-text"
                }`}
                aria-pressed={role === r}
              >
                {r === "STUDENT" ? "Я ученик" : "Я учитель"}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <Field label="Имя" name="name" required placeholder="Алтаир" />
            <Field label="Электронная почта" name="email" type="email" required autoComplete="email" />
            {role === "STUDENT" && (
              <Field label="Класс (7–12)" name="grade" type="number" min={7} max={12} defaultValue={9} required />
            )}
            <Field
              label="Пароль (от 8 символов)"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
            {error && (
              <p role="alert" className="rounded-md bg-[#FEF2F2] px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" fullWidth loading={register.isPending}>
              Начать обучение
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-text-2">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-bold text-primary hover:underline">
            Войти
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
