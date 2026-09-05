"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MasteryBar } from "@/components/ui/progress";
import { Badge } from "@/components/ui/card";
import { CardSkeleton } from "@/components/ui/states";
import { Modal } from "@/components/ui/modal";
import { AiChatPanel } from "@/components/ai/chat-panel";
import { studentsService } from "@/lib/services/students";
import { api } from "@/lib/api/client";
import { useMe } from "@/lib/hooks/use-auth";
import { useLanguage } from "@/lib/stores/language";
import { useGamification } from "@/lib/stores/gamification";
import { LANGUAGES } from "@/lib/i18n/dictionaries";
import type { UiLanguage } from "@/lib/types";

export default function ProfilePage() {
  const me = useMe();
  const qc = useQueryClient();
  const studentId = me.data?.student?.id;
  const streak = useGamification((s) => s.streak);
  const lang = useLanguage((s) => s.ui);
  const setLang = useLanguage((s) => s.setUi);

  const subjects = useQuery({
    queryKey: ["subjects", studentId],
    queryFn: () => studentsService.subjects(studentId!),
    enabled: !!studentId,
  });

  const [goalTarget, setGoalTarget] = useState("");
  const [style, setStyle] = useState("socratic");
  const [personalizationOpen, setPersonalizationOpen] = useState(false);
  const profile = useQuery({
    queryKey: ["student-profile", studentId],
    queryFn: () => studentsService.get(studentId!),
    enabled: !!studentId,
  });

  useEffect(() => {
    if (profile.data) {
      setGoalTarget(profile.data.goals?.[0]?.target ?? "");
      setStyle(profile.data.preferences?.explanationStyle ?? "socratic");
    }
  }, [profile.data]);

  const save = useMutation({
    mutationFn: () =>
      api.put(`/students/${studentId}`, {
        goals: goalTarget ? [{ target: goalTarget }] : [],
        preferences: {
          ...profile.data?.preferences,
          language: lang,
          contentLanguage: lang,
          explanationStyle: style,
        },
      }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["student-profile", studentId] }),
  });

  if (me.isLoading) return <CardSkeleton />;

  const overall =
    subjects.data && subjects.data.length
      ? subjects.data.reduce((a, s) => a + s.avgMastery, 0) / subjects.data.length
      : null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header card */}
      <section className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface p-6 text-center shadow-card sm:flex-row sm:text-left">
        <span className="grid size-20 place-items-center rounded-full bg-gradient-to-br from-primary to-[#6366F1] text-3xl font-black text-white shadow-pop">
          {(me.data?.name ?? "Я").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black">{me.data?.name}</h1>
          <p className="truncate text-sm text-text-2">{me.data?.email}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            {me.data?.role === "TEACHER" ? (
              <Badge tone="primary">Учитель</Badge>
            ) : (
              <>
                <Badge tone="primary">{me.data?.student?.grade} класс</Badge>
                <Badge tone="warning">🔥 {streak} дн.</Badge>
                {overall != null && <Badge tone="success">Мастерство {Math.round(overall * 100)}%</Badge>}
              </>
            )}
          </div>
        </div>
      </section>

      {/* Subjects */}
      <section>
        <h3 className="mb-3 text-lg font-black">Предметы</h3>
        <div className="space-y-4 rounded-xl border border-border bg-surface p-5 shadow-card">
          {(subjects.data ?? []).map((s) => (
            <div key={s.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-bold">{s.name}</span>
                <span className="text-text-2">
                  {s.topicsCompleted}/{s.topicCount} тем
                </span>
              </div>
              <MasteryBar mastery={s.avgMastery} />
            </div>
          ))}
          {(subjects.data ?? []).length === 0 && <p className="text-sm text-text-3">Пока нет предметов.</p>}
        </div>
      </section>

      {/* Preferences */}
      <section>
        <h3 className="mb-3 text-lg font-black">Настройки обучения</h3>
        <div className="space-y-5 rounded-xl border border-border bg-surface p-5 shadow-card">
          <div>
            <p className="mb-2 text-sm font-bold text-text-2">Язык интерфейса</p>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code as UiLanguage)}
                  aria-pressed={lang === l.code}
                  className={`rounded-full border-2 px-4 py-2 text-sm font-bold transition ${
                    lang === l.code ? "border-primary bg-primary-light text-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  {l.flag} {l.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-text-3">
              Контент задач приходит с сервера на языке оригинала — перевод контента появится позже.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-text-2">Стиль объяснений ИИ</label>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="h-11 w-full rounded-md border-2 border-border px-3 text-sm outline-none focus:border-primary"
            >
              <option value="socratic">Сократический — наводящие вопросы</option>
              <option value="direct">Прямой — сразу к решению</option>
              <option value="friendly">Дружелюбный — простыми словами</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-bold text-text-2">Моя цель</label>
            <input
              value={goalTarget}
              onChange={(e) => setGoalTarget(e.target.value)}
              placeholder="Например: ЕНТ по математике"
              className="h-11 w-full rounded-md border-2 border-border px-3 outline-none focus:border-primary"
            />
          </div>

          <Button loading={save.isPending} onClick={() => save.mutate()} disabled={me.data?.role === "TEACHER"}>
            <Save className="size-4" /> Сохранить настройки
          </Button>
        </div>
      </section>

      {/* AI Personalization */}
      {me.data?.role !== "TEACHER" && (
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-2 font-black">ИИ персонализация</h3>
          <p className="mb-4 text-sm text-text-2">
            Ответь на несколько вопросов — ИИ заполнит твой профиль автоматически.
          </p>
          <Button onClick={() => setPersonalizationOpen(true)}>
            <Sparkles className="mr-2 size-4" /> Начать персонализацию
          </Button>
        </section>
      )}

      <Modal
        open={personalizationOpen}
        onClose={() => {
          setPersonalizationOpen(false);
          void qc.invalidateQueries({ queryKey: ["student-profile", studentId] });
          void qc.invalidateQueries({ queryKey: ["me"] });
        }}
        title="ИИ персонализация"
        wide
      >
        {personalizationOpen && (
          <AiChatPanel
            scenario="personalization"
            className="h-[70vh]"
            greeting="Привет! Давай заполним твой профиль. Я задам несколько вопросов — это займёт 2 минуты."
            quickPrompts={["Хочу готовиться к ЕНТ", "Нужно подтянуть математику", "Готовлюсь к олимпиаде"]}
          />
        )}
      </Modal>
    </div>
  );
}
