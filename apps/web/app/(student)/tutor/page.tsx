"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Sigma, ListChecks, Lightbulb } from "lucide-react";
import { AiChatPanel } from "@/components/ai/chat-panel";
import { ZereAvatar } from "@/components/ai/zere";
import { studentsService } from "@/lib/services/students";
import { useMe } from "@/lib/hooks/use-auth";

const FEATURES = [
  { icon: <BookOpen className="size-4" />, color: "#7C3AED", text: "Объясню тему простыми словами" },
  { icon: <Sigma className="size-4" />, color: "#0EA5E9", text: "Покажу формулу и разберу по шагам" },
  { icon: <ListChecks className="size-4" />, color: "#10B981", text: "Дам задачу и проверю ответ" },
] as const;

export default function TutorPage() {
  const me = useMe();
  const studentId = me.data?.student?.id;

  const roadmaps = useQuery({
    queryKey: ["tutor-context", studentId],
    queryFn: async () => {
      const subs = await studentsService.subjects(studentId!);
      const withCurrent = await Promise.all(
        subs.slice(0, 2).map(async (s) => ({ subject: s, roadmap: await studentsService.roadmap(studentId!, s.id) })),
      );
      return withCurrent;
    },
    enabled: !!studentId,
    staleTime: 60_000,
  });

  const currentTopic = roadmaps.data?.find((r) => r.roadmap.current)?.roadmap.current;
  const quickPrompts = [
    ...(currentTopic ? [`Объясни тему «${currentTopic.topicName}»`] : []),
    "Почему это работает так?",
    "Дай мне задачу потренироваться",
    "Разбери мою ошибку по шагам",
  ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-3xl flex-col lg:h-[calc(100dvh-8rem)]">
      {/* Hero: mascot + greeting */}
      <header className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-primary-subtle via-surface to-surface p-5 shadow-card">
        <div
          className="pointer-events-none absolute -right-10 -top-14 size-44 rounded-full opacity-25 blur-2xl"
          style={{ background: "radial-gradient(circle,#A78BFA,transparent)" }}
          aria-hidden
        />
        <div className="flex items-center gap-4 sm:gap-5">
          <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
            <ZereAvatar size={96} mood="happy" float />
          </motion.div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl font-display">Zere AI</h1>
              <span className="rounded-full bg-primary-light px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-primary">
                ИИ-наставник
              </span>
            </div>
            <p className="mt-1 text-sm leading-snug text-text-2">
              Привет{me.data?.name ? `, ${me.data.name.split(" ")[0]}` : ""}! Я знаю твой уровень и вижу, где ты
              остановился{currentTopic ? (
                <> — сейчас вы изучаете <b className="text-text">{currentTopic.topicName}</b>.</>
              ) : (
                "."
              )}
            </p>
          </div>
        </div>

        {/* Feature chips */}
        <ul className="mt-4 grid gap-2 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.text}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * i }}
              className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-text shadow-sm ring-1 ring-border"
            >
              <span
                className="grid size-7 shrink-0 place-items-center rounded-md text-white"
                style={{ background: f.color }}
              >
                {f.icon}
              </span>
              {f.text}
            </motion.li>
          ))}
        </ul>
      </header>

      {/* Chat */}
      <AiChatPanel
        scenario="chat"
        className="min-h-0 flex-1 pt-3"
        contextPrefix={
          currentTopic ? `Ученик сейчас изучает тему «${currentTopic.topicName}».` : undefined
        }
        quickPrompts={quickPrompts}
        assistantAvatar={<ZereAvatar size={30} mood="happy" />}
      />

      {/* Footer hint */}
      <p className="flex items-center justify-center gap-1.5 pb-1 pt-2 text-center text-[11px] text-text-3">
        <Lightbulb className="size-3.5" /> Зере видит твою текущую тему — спрашивай прямо по ней
      </p>
    </div>
  );
}
