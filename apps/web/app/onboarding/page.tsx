"use client";

import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Flag, GraduationCap, Languages, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useMe } from "@/lib/hooks/use-auth";
import { useOnboarding } from "@/lib/stores/onboarding";
import { LANGUAGES } from "@/lib/i18n/dictionaries";
import type { UiLanguage } from "@/lib/types";
import { api } from "@/lib/api/client";

const STEPS = ["language", "grade", "subjects", "goals", "diagnostic"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const me = useMe();
  const draft = useOnboarding();
  const [saving, setSaving] = useState(false);

  const subjects = useQuery({
    queryKey: ["all-subjects"],
    queryFn: () => api.get<{ subjects?: Array<{ id: string; name: string }> }>("/subjects").then((r) => r.subjects ?? []),
  });

  const step = draft.step;
  const total = STEPS.length;
  const set = draft.set;

  function go(n: number) {
    set({ step: Math.max(0, Math.min(total - 1, n)) });
  }

  async function finish() {
    if (!me.data?.student) {
      router.replace(step === total - 1 ? "/diagnostic" : "/home");
      return;
    }
    setSaving(true);
    try {
      await api.put(`/students/${me.data.student.id}`, {
        goals: draft.goalTarget
          ? [{ subject: draft.subjectIds[0] ? "math" : undefined, target: draft.goalTarget, deadline: draft.goalDeadline || undefined }]
          : [],
        preferences: {
          language: draft.language ?? "ru",
          contentLanguage: draft.language ?? "ru",
          subjects: draft.subjectIds,
        },
      });
      router.push("/diagnostic");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-text-3">
            <span>Шаг {step + 1} из {total}</span>
            <span className="flex items-center gap-1 text-primary"><Sparkles className="size-3.5" /> ZERTTE</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((step + 1) / total) * 100}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="rounded-xl border border-border bg-surface p-6 shadow-card sm:p-8"
          >
            {step === 0 && (
              <StepShell icon={<Languages className="size-6" />} title="На каком языке учиться?">
                <OptionGrid>
                  {LANGUAGES.map((l) => (
                    <OptionCard
                      key={l.code}
                      selected={draft.language === l.code}
                      onClick={() => {
                        set({ language: l.code as UiLanguage });
                        setTimeout(() => go(1), 180);
                      }}
                      title={`${l.flag} ${l.label}`}
                      desc={l.code === "ru" ? "Контент и интерфейс" : "Интерфейс; контент — по мере поддержки"}
                    />
                  ))}
                </OptionGrid>
              </StepShell>
            )}

            {step === 1 && (
              <StepShell icon={<GraduationCap className="size-6" />} title="В каком вы классе?">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {[7, 8, 9, 10, 11, 12].map((g) => (
                    <button
                      key={g}
                      onClick={() => {
                        set({ grade: g });
                        setTimeout(() => go(2), 160);
                      }}
                      className={`rounded-md border-2 py-4 text-lg font-black transition-all ${
                        draft.grade === g
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell icon={<Check className="size-6" />} title="Какие предметы вам интересны?">
                {subjects.isLoading ? (
                  <p className="text-sm text-text-3">Загружаем предметы…</p>
                ) : (
                  <OptionGrid columns={2}>
                    {(subjects.data ?? []).map((s, i) => {
                      const selected = draft.subjectIds.includes(s.id);
                      return (
                        <OptionCard
                          key={s.id}
                          selected={selected}
                          accentIndex={i}
                          onClick={() =>
                            set({
                              subjectIds: selected
                                ? draft.subjectIds.filter((id) => id !== s.id)
                                : [...draft.subjectIds, s.id],
                            })
                          }
                          title={s.name}
                          multi
                        />
                      );
                    })}
                  </OptionGrid>
                )}
                <Button size="lg" fullWidth className="mt-6" disabled={!draft.subjectIds.length} onClick={() => go(3)}>
                  Далее <ArrowRight className="size-4" />
                </Button>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell icon={<Flag className="size-6" />} title="Какая у вас цель?">
                <input
                  value={draft.goalTarget}
                  onChange={(e) => set({ goalTarget: e.target.value })}
                  placeholder="Например: ЕНТ по математике"
                  className="h-12 w-full rounded-md border-2 border-border px-4 outline-none transition focus:border-primary"
                />
                <label className="mt-3 block text-[13px] font-semibold text-text-2">
                  Дедлайн (необязательно)
                  <input
                    type="date"
                    value={draft.goalDeadline}
                    onChange={(e) => set({ goalDeadline: e.target.value })}
                    className="mt-1 h-11 w-full rounded-md border-2 border-border px-3 outline-none focus:border-primary"
                  />
                </label>
                <Button size="lg" fullWidth className="mt-6" loading={saving} onClick={finish}>
                  Сохранить и пройти диагностику <ArrowRight className="size-4" />
                </Button>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell icon={<Sparkles className="size-6" />} title="Проверим, что вы уже знаете">
                <p className="text-sm leading-relaxed text-text-2">
                  Короткая диагностика с ИИ покажет ваш текущий уровень по темам и точку старта.
                  Отвечайте честно — это ни на что не влияет, кроме вашего пути.
                </p>
                <Button size="xl" fullWidth className="mt-6" onClick={() => router.push("/diagnostic")}>
                  Начать диагностику
                </Button>
                <button onClick={() => router.push("/home")} className="mt-3 w-full text-center text-sm font-semibold text-text-3 hover:text-text-2">
                  Пропустить
                </button>
              </StepShell>
            )}
          </motion.div>
        </AnimatePresence>

        {step > 0 && step < 4 && (
          <button onClick={() => go(step - 1)} className="mt-4 text-sm font-semibold text-text-3 hover:text-text-2">
            ← Назад
          </button>
        )}
      </div>
    </div>
  );
}

function StepShell({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-lg bg-primary-light text-primary">{icon}</span>
        <h1 className="text-xl font-black sm:text-2xl">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function OptionGrid({ children, columns = 1 }: { children: React.ReactNode; columns?: number }) {
  return <div className={`grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>{children}</div>;
}

function OptionCard({
  title,
  desc,
  selected,
  onClick,
  multi,
  accentIndex,
}: {
  title: string;
  desc?: string;
  selected: boolean;
  onClick: () => void;
  multi?: boolean;
  accentIndex?: number;
}) {
  const accents = ["#7C3AED", "#0EA5E9", "#10B981", "#F59E0B", "#EC4899", "#6366F1"];
  const accent = accentIndex != null ? accents[accentIndex % accents.length] : "#7C3AED";
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={`relative rounded-lg border-2 p-4 text-left transition-all ${
        selected ? "border-primary bg-primary-subtle" : "border-border hover:border-primary/40"
      }`}
      style={accentIndex != null && !selected ? { borderColor: `${accent}33` } : undefined}
    >
      {selected && (
        <span
          className="absolute right-3 top-3 grid size-5 place-items-center rounded-full text-white"
          style={{ background: accent }}
        >
          <Check className="size-3.5" />
        </span>
      )}
      <p className="font-bold">{title}</p>
      {desc && <p className="mt-0.5 text-xs text-text-2">{desc}</p>}
      {!multi && desc == null && null}
    </button>
  );
}
