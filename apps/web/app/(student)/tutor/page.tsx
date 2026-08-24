"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { AiChatPanel } from "@/components/ai/chat-panel";
import { studentsService } from "@/lib/services/students";
import { useMe } from "@/lib/hooks/use-auth";

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
    "Почему важно то, что мы проходим?",
    "Дай мне задачу потренироваться",
  ];

  return (
    <div className="mx-auto flex h-[calc(100dvh-10rem)] max-w-3xl flex-col lg:h-[calc(100dvh-8rem)]">
      <div className="pb-4">
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <span className="grid size-10 place-items-center rounded-lg bg-gradient-to-br from-primary to-[#6366F1] text-white">
            <Sparkles className="size-5" />
          </span>
          ИИ-наставник
        </h1>
        {currentTopic && (
          <p className="mt-1 text-sm text-text-2">
            Я вижу, что вы сейчас изучаете: <b>{currentTopic.topicName}</b>. Спросите что угодно.
          </p>
        )}
      </div>

      <AiChatPanel
        scenario="chat"
        className="min-h-0 flex-1"
        contextPrefix={
          currentTopic ? `Ученик сейчас изучает тему «${currentTopic.topicName}».` : undefined
        }
        quickPrompts={quickPrompts}
      />
    </div>
  );
}

