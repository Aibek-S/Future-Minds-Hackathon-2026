"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Sparkles, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/lib/services/search";
import { topicsService } from "@/lib/services/topics";
import type { SearchResult } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CardSkeleton, EmptyState } from "@/components/ui/states";

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageContent />
    </Suspense>
  );
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get("q") ?? "";
  const topicId = searchParams.get("topicId") ?? undefined;

  const [topicNames, setTopicNames] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery<SearchResult>({
    queryKey: ["search", query, topicId],
    queryFn: () => searchService.search(query, topicId),
    enabled: query.length >= 2,
  });

  useEffect(() => {
    if (data?.materials.length) {
      const uniqueTopicIds = [...new Set(data.materials.map((m) => m.topicId))];
      topicsService.list().then((topics) => {
        const map: Record<string, string> = {};
        topics.forEach((t) => (map[t.id] = t.name));
        setTopicNames(map);
      });
    }
  }, [data]);

  const handleBack = () => {
    router.back();
  };

  if (query.length < 2) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4 text-center">
        <ArrowLeft className="mx-auto mb-6 size-12 text-text-3" />
        <h1 className="text-2xl font-black">Введите запрос для поиска</h1>
        <p className="mt-2 text-text-2">Минимум 2 символа. Поиск работает по векторной базе материалов.</p>
        <Button variant="ghost" onClick={handleBack} className="mt-6">
          <ArrowLeft className="mr-2 size-4" /> Назад
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6 px-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          className="grid size-10 place-items-center rounded-md text-text-2 hover:bg-surface-2"
          onClick={handleBack}
          aria-label="Назад"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-black">Результаты поиска</h1>
          <p className="text-sm text-text-2">«{query}»{topicId && ` в теме`}</p>
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <CardSkeleton key={i} className="h-24" />
          ))}
        </div>
      )}

      {isError && (
        <EmptyState
          emoji="⚠️"
          title="Ошибка поиска"
          body="Не удалось выполнить поиск. Проверьте подключение и попробуйте снова."
          action={
            <Button onClick={() => refetch()}>Повторить</Button>
          }
        />
      )}

      {data && !isLoading && (
        <>
          {data.materials.length === 0 ? (
            <EmptyState
              emoji="🔍"
              title="Ничего не найдено"
              body={data.fallbackToGeneralKnowledge
                ? "По вашему запросу материалов в базе нет. Попробуйте спросить у ИИ-тьютора — он может помочь обобщить знания."
                : `Ничего не найдено по запросу «${query}». Попробуйте другие слова или проверьте орфографию.`}
              action={
                data.fallbackToGeneralKnowledge ? (
                  <Link href="/tutor">
                    <Button>
                      <Sparkles className="mr-2 size-4" /> Спросить у Zere
                    </Button>
                  </Link>
                ) : (
                  <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="mr-2 size-4" /> Назад
                  </Button>
                )
              }
            />
          ) : (
            <div className="space-y-3">
              {data.materials.map((material) => (
                <Link
                  key={material.id}
                  href={`/lesson/${material.topicId}`}
                  className="block"
                >
                  <div className="rounded-xl border border-border bg-surface p-4 hover:bg-surface-2 transition-colors">
                    <div className="flex items-start gap-3">
                      <BookOpen className="size-6 shrink-0 text-primary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-text-2">
                            {topicNames[material.topicId] ?? `Тема ${material.topicId.slice(0, 8)}`}
                          </span>
                          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                            {Math.round(material.similarity * 100)}% совпадения
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-text-3 line-clamp-3">{material.content}</p>
                        {material.metadata && Object.keys(material.metadata).length > 0 && (
                          <p className="mt-2 text-xs text-text-3">
                            Метаданные:{" "}
                            {Object.entries(material.metadata)
                              .map(([k, v]) => `${k}: ${String(v)}`)
                              .join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}