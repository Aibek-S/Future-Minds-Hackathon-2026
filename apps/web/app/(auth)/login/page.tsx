"use client";

import { motion } from "framer-motion";
import { Brain, Flame } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { homeFor, useLogin } from "@/lib/hooks/use-auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const login = useLogin();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await login.mutateAsync({
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      const me = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002/v1"}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("zertte.accessToken")}`,
          },
        },
      ).then((r) => (r.ok ? r.json() : null));
      router.replace(next ?? homeFor(me));
    } catch {
      setError("Не удалось войти. Проверьте почту и пароль.");
    }
  }

  function fillDemo(role: "student" | "teacher") {
    const email = role === "student" ? "demo_student@hackathon.com" : "demo_teacher@hackathon.com";
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = "password123";
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background:
              "radial-gradient(600px circle at 20% 20%, #A78BFA, transparent), radial-gradient(500px circle at 80% 70%, #6366F1, transparent)",
          }}
          aria-hidden
        />
        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white text-2xl font-black text-primary">
            Z
          </span>
          <span className="text-2xl font-black tracking-tight">ZERTTE</span>
        </Link>
        <div className="relative">
          <h1 className="max-w-md text-4xl font-black leading-tight">
            Знаешь. Не знаешь.
            <br />
            Учим то, что нужно.
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Карта знаний, реальное мастерство и ИИ-наставник, который видит твой прогресс.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Brain, text: "Мастерство по каждой теме — из бэкенда, не выдумка" },
              { icon: Flame, text: "Карта знаний открывает темы по пререквизитам" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-lg bg-white/10 px-4 py-3">
                <Icon className="size-5 shrink-0" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/60">© 2026 ZERTTE · Adaptive AI learning</p>
      </div>

      {/* Form */}
      <motion.div
        className="flex items-center justify-center p-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="inline-grid size-12 place-items-center rounded-xl bg-primary text-2xl font-black text-white">
              Z
            </span>
            <h1 className="mt-3 text-2xl font-black">С возвращением</h1>
            <p className="text-sm text-text-2">Продолжим обучение с того места.</p>
          </div>
          <h2 className="hidden text-3xl font-black lg:block">Вход</h2>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Электронная почта" name="email" type="email" required autoComplete="email" />
            <Field
              label="Пароль"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
            />
            {error && (
              <p role="alert" className="rounded-md bg-[#FEF2F2] px-3 py-2 text-sm text-error">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" fullWidth loading={login.isPending}>
              Войти
            </Button>
          </form>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => fillDemo("student")} type="button">
              Демо-ученик
            </Button>
            <Button variant="outline" onClick={() => fillDemo("teacher")} type="button">
              Демо-учитель
            </Button>
          </div>

          <p className="mt-6 text-center text-sm text-text-2">
            Нет аккаунта?{" "}
            <Link href="/register" className="font-bold text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
