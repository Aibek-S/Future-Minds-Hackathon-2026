"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardList, FilePlus2, Plus, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/card";
import { MasteryBar } from "@/components/ui/progress";
import { Modal } from "@/components/ui/modal";
import { CardSkeleton, ErrorState, TableSkeleton } from "@/components/ui/states";
import { Heatmap, MetricCard, StudentTable, studentStatus } from "@/components/teacher/dashboard";
import { teacherService } from "@/lib/services/teacher";
import { lessonsService, assignmentsService } from "@/lib/services/lessons";
import { classesService, contentService } from "@/lib/services/classes";
import { topicsService } from "@/lib/services/topics";
import type { ClassStudent, LessonSummary, PlanJson, Task } from "@/lib/types";
import { SearchBar } from "@/components/ui/search-bar";

const TABS = ["overview", "heatmap", "students", "lessons", "assignments", "content"] as const;
const TAB_LABELS: Record<(typeof TABS)[number], string> = {
  overview: "Обзор",
  heatmap: "Тепловая карта",
  students: "Ученики",
  lessons: "Уроки",
  assignments: "Домашка",
  content: "Контент",
};

export default function ClassPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");

  const classes = useQuery({ queryKey: ["teacher-classes"], queryFn: () => teacherService.classes("").catch(() => []) });
  const overview = useQuery({
    queryKey: ["overview", classId],
    queryFn: () => teacherService.overview(classId),
  });
  // class meta (name) — reuse list endpoint via any teacher id is not available here; fallback to overview only
  void classes;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.25em] text-text-3">Класс</p>
          <h1 className="text-3xl font-black">Обзор класса</h1>
        </div>
        <Badge tone="primary">ID: {classId.slice(0, 8)}…</Badge>
      </div>

      {/* Tabs */}
      <div className="scroll-thin -mx-4 flex gap-1 overflow-x-auto px-4">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-selected={tab === t}
            role="tab"
            className={`shrink-0 rounded-md px-4 py-2.5 text-sm font-bold uppercase tracking-wide transition ${
              tab === t ? "bg-primary-light text-primary" : "text-text-2 hover:bg-surface hover:text-text"
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "overview" && <OverviewTab classId={classId} overviewQuery={overview} />}
        {tab === "heatmap" && <HeatmapTab classId={classId} />}
        {tab === "students" && <StudentsTab classId={classId} />}
        {tab === "lessons" && <LessonsTab classId={classId} />}
        {tab === "assignments" && <AssignmentsTab classId={classId} />}
        {tab === "content" && <ContentTab classId={classId} />}
      </motion.div>
    </div>
  );
}

/* ================= Tabs ================= */

function OverviewTab({
  classId,
  overviewQuery,
}: {
  classId: string;
  overviewQuery: ReturnType<typeof useQuery<Awaited<ReturnType<typeof teacherService.overview>>>>;
}) {
  const students = useQuery({ queryKey: ["class-students", classId], queryFn: () => teacherService.students(classId) });
  if (overviewQuery.isLoading || !overviewQuery.data) return <CardSkeleton />;
  const o = overviewQuery.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard value={students.data?.length ?? 0} label="Учеников" />
        <MetricCard value={`${Math.round(o.classMastery * 100)}%`} label="Среднее мастерство" accent="#10B981" />
        <MetricCard value={o.studentsNeedingRemediation} label="Нужна помощь" accent="#EF4444" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-4 font-black">Слабые темы</h3>
          {(o.weakTopics ?? []).map((t) => (
            <div key={t.topicId} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-sm">
                <span>{t.topicName}</span>
                <b className="text-error">{Math.round(t.mastery * 100)}%</b>
              </div>
              <MasteryBar mastery={t.mastery} color="#EF4444" showLabel={false} size="sm" />
            </div>
          ))}
          {!o.weakTopics?.length && <p className="text-sm text-text-3">Нет данных.</p>}
        </section>
        <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
          <h3 className="mb-4 font-black">Сильные темы</h3>
          {(o.strongTopics ?? []).map((t) => (
            <div key={t.topicId} className="mb-3 last:mb-0">
              <div className="mb-1 flex justify-between text-sm">
                <span>{t.topicName}</span>
                <b className="text-success">{Math.round(t.mastery * 100)}%</b>
              </div>
              <MasteryBar mastery={t.mastery} color="#10B981" showLabel={false} size="sm" />
            </div>
          ))}
          {!o.strongTopics?.length && <p className="text-sm text-text-3">Нет данных.</p>}
        </section>
      </div>
    </div>
  );
}

function HeatmapTab({ classId }: { classId: string }) {
  const heatmap = useQuery({ queryKey: ["heatmap", classId], queryFn: () => teacherService.heatmap(classId) });
  const [studentId, setStudentId] = useState<string | null>(null);
  const [topicId, setTopicId] = useState<string | null>(null);
  return (
    <>
      {heatmap.isError ? (
        <ErrorState onRetry={() => void heatmap.refetch()} />
      ) : (
        <Heatmap data={heatmap.data} onStudentClick={(id) => setStudentId(id)} onTopicClick={(id) => setTopicId(id)} />
      )}

      {/* Class performance for a single topic (from the same heatmap payload) */}
      <Modal open={!!topicId} onClose={() => setTopicId(null)} title="Тема в классе">
        {(() => {
          const topic = heatmap.data?.topics?.find((t) => t.id === topicId);
          if (!heatmap.data || !topic) return <TableSkeleton rows={3} />;
          const rows = (heatmap.data.students ?? [])
            .map((s) => ({ name: s.studentName, id: s.studentId, cell: s.topics?.find((x) => x.topicId === topicId) }))
            .filter((r) => r.cell != null)
            .sort((a, b) => (a.cell!.mastery ?? 0) - (b.cell!.mastery ?? 0));
          const avg = rows.length ? rows.reduce((acc, r) => acc + (r.cell!.mastery ?? 0), 0) / rows.length : 0;
          const struggling = rows.filter((r) => (r.cell!.mastery ?? 0) < 0.4).length;
          return (
            <div className="space-y-5">
              <div>
                <p className="text-lg font-black">{topic.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <MetricCard value={`${Math.round(avg * 100)}%`} label="Среднее по теме" accent={avg >= 0.7 ? "#10B981" : avg >= 0.4 ? "#F59E0B" : "#EF4444"} />
                  <MetricCard value={struggling} label="Ниже 40%" accent="#EF4444" />
                </div>
              </div>
              <ul className="space-y-2">
                {rows.map((r) => {
                  const m = r.cell!.mastery;
                  const st = heat_status(m);
                  return (
                    <li key={r.id} className="flex items-center gap-3">
                      <span className="w-28 truncate text-sm font-bold">{r.name}</span>
                      <MasteryBar mastery={m} color={st === "GREEN" ? "#10B981" : st === "YELLOW" ? "#F59E0B" : "#EF4444"} showLabel={false} size="sm" />
                      <span className="w-10 text-right text-xs font-extrabold text-text-2">{Math.round(m * 100)}%</span>
                    </li>
                  );
                })}
                {rows.length === 0 && <p className="text-sm text-text-3">Нет данных по теме.</p>}
              </ul>
            </div>
          );
        })()}
      </Modal>

      <StudentProfileModal studentId={studentId} onClose={() => setStudentId(null)} />
    </>
  );
}

/** local alias to avoid clashing with the type import below */
function heat_status(m: number): "GREEN" | "YELLOW" | "RED" {
  if (m >= 0.7) return "GREEN";
  if (m >= 0.4) return "YELLOW";
  return "RED";
}

function StudentsTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const students = useQuery({ queryKey: ["class-students", classId], queryFn: () => teacherService.students(classId) });
  const [selected, setSelected] = useState<ClassStudent | null>(null);
  const profile = useQuery({
    queryKey: ["teacher-student", selected?.id],
    queryFn: () => teacherService.studentProfile(selected!.id),
    enabled: !!selected,
  });

  const studentIds = (students.data ?? []).map((s) => s.id).join(",");
  // Weakest topic per student for the table column (parallel profile fetches).
  const profiles = useQuery({
    queryKey: ["student-profiles", studentIds],
    queryFn: async () => {
      const ids = studentIds ? studentIds.split(",") : [];
      const entries = await Promise.all(
        ids.map(async (id) => [id, await teacherService.studentProfile(id)] as const),
      );
      return Object.fromEntries(entries) as Record<string, Awaited<ReturnType<typeof teacherService.studentProfile>>>;
    },
    enabled: ids_count(studentIds) > 0,
    staleTime: 60_000,
  });
  const weakByStudent = Object.fromEntries(
    Object.entries(profiles.data ?? {}).map(([id, p]) => [id, p.weakTopics?.[0] ?? "—"]),
  );

  const remove = useMutation({
    mutationFn: (sid: string) => classesService.removeStudent(classId, sid).then(() => undefined),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["class-students", classId] });
      void qc.invalidateQueries({ queryKey: ["student-profiles"] });
    },
  });

  return (
    <>
      {!students.isLoading ? (
        <StudentTable
          students={students.data ?? []}
          weakByStudent={weakByStudent}
          onRowClick={(s) => setSelected(s)}
        />
      ) : (
        <TableSkeleton />
      )}

      {/* Student detail */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name}>
        {profile.isLoading || !profile.data ? (
          <TableSkeleton rows={2} />
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <MetricCard value={`${Math.round(profile.data.overallMastery * 100)}%`} label="Мастерство" />
              <MetricCard
                value={studentStatus(profile.data.overallMastery).label}
                label="Статус"
                accent={studentStatus(profile.data.overallMastery).color}
              />
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-success">Сильные темы</p>
              <div className="flex flex-wrap gap-2">
                {(profile.data.strongTopics ?? []).map((t) => (
                  <Badge key={t} tone="success">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-error">Слабые темы</p>
              <div className="flex flex-wrap gap-2">
                {(profile.data.weakTopics ?? []).map((t) => (
                  <Badge key={t} tone="error">{t}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-widest text-warning">Последние ошибки</p>
              {(profile.data.recentMistakes ?? []).length ? (
                (profile.data.recentMistakes ?? []).map((m) => (
                  <p key={`${m.topicId}-${m.type}`} className="text-sm text-text-2">
                    {m.type.replace("_", " ").toLowerCase()} × {m.count}
                  </p>
                ))
              ) : (
                <p className="text-sm text-text-3">Нет данных.</p>
              )}
            </div>

            {/* Recent attempts history — real backend data */}
            <AttemptsHistory classId={classId} studentId={selected!.id} />

            <Button
              variant="danger"
              fullWidth
              loading={remove.isPending}
              onClick={() => selected && remove.mutate(selected.id)}
            >
              Исключить из класса
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
}

function AttemptsHistory({ classId, studentId }: { classId: string; studentId: string }) {
  const attempts = useQuery({
    queryKey: ["student-attempts", classId, studentId],
    queryFn: () => teacherService.studentAttempts(classId, studentId),
    staleTime: 30_000,
  });

  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-text-3">Последняя активность</p>
      {attempts.isLoading ? (
        <TableSkeleton rows={2} />
      ) : (attempts.data ?? []).length === 0 ? (
        <p className="text-sm text-text-3">Попыток пока нет.</p>
      ) : (
        <ul className="scroll-thin max-h-56 space-y-1.5 overflow-y-auto pr-1">
          {(attempts.data ?? []).slice(0, 8).map((a) => (
            <li
              key={a.id}
              className={`flex items-start gap-2 rounded-md px-3 py-2 text-sm ${
                a.correct ? "bg-[#F0FDF4]" : "bg-[#FEF2F2]"
              }`}
            >
              <span className={`mt-0.5 font-black ${a.correct ? "text-success" : "text-error"}`}>
                {a.correct ? "✓" : "✕"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{a.topicName ?? a.topicId}</span>
                <span className="block truncate text-xs text-text-3">
                  попытка {a.attemptNumber} · {new Date(a.createdAt).toLocaleDateString("ru-RU")}
                  {a.answer && ` · «${a.answer.slice(0, 24)}${a.answer.length > 24 ? "…" : ""}»`}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** tiny helper so the enabled expression stays readable */
function ids_count(joined: string): number {
  return joined ? joined.split(",").length : 0;
}

function LessonsTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const lessons = useQuery({ queryKey: ["lessons", classId], queryFn: () => lessonsService.list(classId) });
  const topics = useQuery({ queryKey: ["topics-all"], queryFn: () => topicsService.list() });
  const [createOpen, setCreateOpen] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ["lesson", detail],
    queryFn: () => lessonsService.get(detail!),
    enabled: !!detail,
  });

  return (
    <>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-black">
          <ClipboardList className="size-5 text-primary" /> Календарь уроков
        </h3>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" /> Новый урок
        </Button>
      </div>

      {lessons.isLoading ? (
        <TableSkeleton rows={4} />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          {(lessons.data ?? []).map((l: LessonSummary) => (
            <li key={l.id}>
              <button
                onClick={() => setDetail(l.id)}
                className="flex w-full items-center gap-4 border-b border-border/60 px-4 py-3.5 text-left transition last:border-0 hover:bg-primary-subtle/40"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-subtle text-primary">
                  <ClipboardList className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{l.topicName ?? l.topicId}</p>
                  <p className="text-xs text-text-3">
                    {new Date(l.date).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                    {l.taskCount != null && ` · ${l.taskCount} заданий`}
                  </p>
                </div>
              </button>
            </li>
          ))}
          {(lessons.data ?? []).length === 0 && (
            <li className="px-4 py-10 text-center text-text-3">Уроков пока нет.</li>
          )}
        </ul>
      )}

      {/* Create lesson modal */}
      <CreateLessonModal open={createOpen} onClose={() => setCreateOpen(false)} classId={classId} topics={topics.data ?? []} />

      {/* Lesson details incl. assignments statuses + verify */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Детали урока" wide>
        {detailQuery.isLoading || !detailQuery.data ? (
          <CardSkeleton />
        ) : (
          <LessonDetails lessonId={detail!} data={detailQuery.data} onChanged={() => void qc.invalidateQueries({ queryKey: ["lesson", detail] })} />
        )}
      </Modal>
    </>
  );
}

function LessonDetails({ data, onChanged }: { lessonId: string; data: Awaited<ReturnType<typeof lessonsService.get>>; onChanged: () => void }) {
  const verify = useMutation({
    mutationFn: ({ saId, action }: { saId: string; action: "APPROVE" | "REJECT" }) =>
      assignmentsService.verify(saId, action, action === "REJECT" ? "Нужно перерешать" : undefined),
    onSuccess: onChanged,
  });
  const plan: PlanJson | undefined = data.planJson;
  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold text-text-2">
        {new Date(data.date).toLocaleString("ru-RU")}
      </p>
      {plan && (
        <div className="space-y-3 rounded-lg bg-background p-4 text-sm">
          <Section title="Цели" items={plan.objectives} />
          <p><b>Разминка:</b> {plan.warmup}</p>
          <p><b>Объяснение:</b> {plan.explanation}</p>
          <Section title="Практика" items={plan.practice} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="font-bold text-error">Для слабых</p>
              {(plan.differentiatedTasks?.weak ?? []).map((x, i) => <p key={i}>• {x}</p>)}
            </div>
            <div>
              <p className="font-bold text-success">Для сильных</p>
              {(plan.differentiatedTasks?.strong ?? []).map((x, i) => <p key={i}>• {x}</p>)}
            </div>
          </div>
          <p><b>Оценивание:</b> {plan.assessment}</p>
          <p><b>Домашнее:</b> {plan.homework}</p>
        </div>
      )}

      {(data.assignments ?? []).map((a) => (
        <div key={a.id} className="rounded-lg border border-border p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-bold">Домашнее задание · {a.mode}</p>
            <Badge tone={a.mode === "ONLINE" ? "info" : "warning"}>{a.mode}</Badge>
          </div>
          <ul className="space-y-1.5">
            {(a.students ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
                <span className="font-semibold">{s.name}</span>
                <span className="flex items-center gap-2">
                  <Badge
                    tone={
                      s.status === "TEACHER_VERIFIED" || s.status === "AI_GRADED"
                        ? "success"
                        : s.status === "REVISION_REQUIRED"
                          ? "error"
                          : "neutral"
                    }
                  >
                    {s.status}
                  </Badge>
                  {s.status === "PENDING_VERIFICATION" && (
                    <>
                      <Button size="sm" variant="success" loading={verify.isPending} onClick={() => verify.mutate({ saId: s.id, action: "APPROVE" })}>
                        ✓
                      </Button>
                      <Button size="sm" variant="danger" loading={verify.isPending} onClick={() => verify.mutate({ saId: s.id, action: "REJECT" })}>
                        ✕
                      </Button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function Section({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="font-bold">{title}</p>
      {items.map((x, i) => <p key={i}>• {x}</p>)}
    </div>
  );
}

function CreateLessonModal({
  open,
  onClose,
  classId,
  topics,
}: {
  open: boolean;
  onClose: () => void;
  classId: string;
  topics: Array<{ id: string; name: string }>;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [topicId, setTopicId] = useState("");
  const [objectives, setObjectives] = useState("Повторить пререквизиты\nВвести новое правило");
  const [warmup, setWarmup] = useState("Устный счёт");
  const [explanation, setExplanation] = useState("Разбор ключевого приёма у доски");
  const [practice, setPractice] = useState("Задача 1\nЗадача 2");
  const [weak, setWeak] = useState("Карточка-подсказка");
  const [strong, setStrong] = useState("Задача со звёздочкой");
  const [assessment, setAssessment] = useState("Exit ticket");
  const [homework, setHomework] = useState("Упражнения 1–5");

  async function submit() {
    const planJson: PlanJson = {
      objectives: objectives.split("\n").filter(Boolean),
      warmup,
      explanation,
      practice: practice.split("\n").filter(Boolean),
      differentiatedTasks: {
        weak: weak.split("\n").filter(Boolean),
        strong: strong.split("\n").filter(Boolean),
      },
      assessment,
      homework,
    };
    await lessonsService.create(classId, { date: new Date(date).toISOString(), topicId, planJson });
    void qc.invalidateQueries({ queryKey: ["lessons", classId] });
    onClose();
  }

  const lines = (v: string, setter: (s: string) => void, label: string, area = false) =>
    area ? (
      <textarea value={v} onChange={(e) => setter(e.target.value)} rows={2} className="w-full rounded-md border-2 border-border px-3 py-2 text-sm outline-none focus:border-primary" placeholder={label} />
    ) : (
      <input value={v} onChange={(e) => setter(e.target.value)} className="h-11 w-full rounded-md border-2 border-border px-3 text-sm outline-none focus:border-primary" placeholder={label} />
    );

  return (
    <Modal open={open} onClose={onClose} title="Новый урок" wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Дата и время</span>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-md border-2 border-border px-3 text-sm outline-none focus:border-primary" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Тема</span>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="h-11 w-full rounded-md border-2 border-border px-2 text-sm outline-none focus:border-primary">
              <option value="">— выберите —</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        {lines(objectives, setObjectives, "Цели (строка = пункт)", true)}
        {lines(warmup, setWarmup, "Разминка")}
        {lines(explanation, setExplanation, "Объяснение")}
        {lines(practice, setPractice, "Практика (строка = задача)", true)}
        <div className="grid grid-cols-2 gap-3">
          {lines(weak, setWeak, "Для слабых")}
          {lines(strong, setStrong, "Для сильных")}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {lines(assessment, setAssessment, "Оценивание")}
          {lines(homework, setHomework, "Домашнее")}
        </div>
        <Button size="lg" fullWidth disabled={!topicId} onClick={() => void submit()}>
          Создать урок
        </Button>
      </div>
    </Modal>
  );
}

function AssignmentsTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const topics = useQuery({ queryKey: ["topics-all"], queryFn: () => topicsService.list() });
  const students = useQuery({ queryKey: ["class-students", classId], queryFn: () => teacherService.students(classId) });
  const [topicId, setTopicId] = useState("");
  const tasks = useQuery({
    queryKey: ["tasks-for-asg", topicId],
    queryFn: () => topicsService.tasks(topicId),
    enabled: !!topicId,
  });
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<"ONLINE" | "OFFLINE">("ONLINE");
  const [isUnique, setIsUnique] = useState(false);
  const [targets, setTargets] = useState<Set<string>>(new Set());
  const [createdIds, setCreatedIds] = useState<Array<{ id: string; topic: string }>>([]);

  const create = useMutation({
    mutationFn: () =>
      assignmentsService.create(classId, {
        topicId,
        mode,
        isUnique,
        targetIds: isUnique ? [...targets] : undefined,
        taskIds: mode === "ONLINE" ? [...picked] : undefined,
      }),
    onSuccess: (a) => {
      setCreatedIds((ids) => [{ id: a.id, topic: topics.data?.find((t) => t.id === topicId)?.name ?? "" }, ...ids]);
      setPicked(new Set());
      void qc.invalidateQueries({ queryKey: ["lessons", classId] });
    },
  });

  function toggle(set: Set<string>, v: string, apply: (s: Set<string>) => void) {
    const n = new Set(set);
    if (n.has(v)) n.delete(v);
    else n.add(v);
    apply(n);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-4 flex items-center gap-2 font-black">
          <FilePlus2 className="size-5 text-primary" /> Выдать домашнее задание
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Тема</span>
            <select value={topicId} onChange={(e) => setTopicId(e.target.value)} className="h-11 w-full rounded-md border-2 border-border px-2 text-sm focus:border-primary focus:outline-none">
              <option value="">— выберите тему —</option>
              {(topics.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-text-2">Режим</span>
            <div className="grid grid-cols-2 gap-2">
              {(["ONLINE", "OFFLINE"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} aria-pressed={mode === m} className={`rounded-md border-2 py-2.5 text-sm font-bold ${mode === m ? "border-primary bg-primary-light text-primary" : "border-border"}`}>
                  {m === "ONLINE" ? "Онлайн" : "В классе"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {topicId && (
          <>
            <p className="mt-4 mb-2 text-[13px] font-semibold text-text-2">Задачи темы {mode === "ONLINE" ? "(обязательны для онлайн)" : ""}</p>
            {tasks.isLoading ? (
              <p className="text-sm text-text-3">Загрузка…</p>
            ) : (tasks.data ?? []).length === 0 ? (
              <p className="text-sm text-text-3">У этой темы нет задач.</p>
            ) : (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto scroll-thin">
                {(tasks.data as Task[]).map((task) => (
                  <li key={task.id}>
                    <label className={`flex cursor-pointer items-start gap-2 rounded-md border p-2.5 text-sm ${picked.has(task.id) ? "border-primary bg-primary-subtle" : "border-border"}`}>
                      <input type="checkbox" checked={picked.has(task.id)} onChange={() => toggle(picked, task.id, setPicked)} className="mt-0.5 accent-[#7C3AED]" />
                      <span className="line-clamp-2">{task.content}</span>
                      <Badge tone="neutral" className="ml-auto shrink-0">{task.difficulty}</Badge>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <label className="mt-4 flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={isUnique} onChange={(e) => setIsUnique(e.target.checked)} className="accent-[#7C3AED]" />
              Индивидуальное задание (выбрать учеников)
            </label>
            {isUnique && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(students.data ?? []).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggle(targets, s.id, setTargets)}
                    className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${targets.has(s.id) ? "border-primary bg-primary-light text-primary" : "border-border text-text-2"}`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            )}

            <Button
              className="mt-4"
              size="lg"
              loading={create.isPending}
              disabled={!topicId || (mode === "ONLINE" && picked.size === 0) || (isUnique && targets.size === 0)}
              onClick={() => create.mutate()}
            >
              Выдать задание
            </Button>
          </>
        )}
      </section>

      {createdIds.length > 0 && (
        <section>
          <h3 className="mb-2 font-black">Выданные задания</h3>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
            {createdIds.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border-b border-border/60 px-4 py-3 text-sm last:border-0">
                <Users className="size-4 text-text-3" /> {c.topic || "Тема"} · ID {c.id.slice(0, 8)}…
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ContentTab({ classId }: { classId: string }) {
  const qc = useQueryClient();
  const subjects = useQuery({ queryKey: ["subjects-global"], queryFn: () => import("@/lib/api/client").then(({ api }) => api.get<{ subjects?: Array<{ id: string; name: string }> }>("/subjects").then((r) => r.subjects ?? [])) });
  const topics = useQuery({ queryKey: ["topics-all"], queryFn: () => topicsService.list() });

  const [subjectId, setSubjectId] = useState("");
  const [topicName, setTopicName] = useState("");
  const [taskId, setTaskId] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [content, setContent] = useState("");
  const [materialTopicId, setMaterialTopicId] = useState("");
  const [materialText, setMaterialText] = useState("");
  const [searchTopicId, setSearchTopicId] = useState("");

  const addTopic = useMutation({
    mutationFn: () => contentService.addTopicToClass(classId, { name: topicName, subjectId }),
    onSuccess: () => {
      setTopicName("");
      void qc.invalidateQueries({ queryKey: ["topics-all"] });
    },
  });
  const addTask = useMutation({
    mutationFn: () => contentService.createTask(taskId, { difficulty, content }),
    onSuccess: () => setContent(""),
  });
  const addMaterial = useMutation({
    mutationFn: () => contentService.uploadMaterial(materialTopicId, { content: materialText }),
  });

  const selectedSearchTopic = topics.data?.find((t) => t.id === searchTopicId);

  return (
    <div className="space-y-6">
      {/* Search bar for materials */}
      <SearchBar
        placeholder="Поиск по материалам класса..."
        topicId={searchTopicId || undefined}
        className="max-w-md"
      />

      <div className="grid gap-6 lg:grid-cols-2">
      {/* Add topic */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-4 font-black">Добавить тему в класс</h3>
        <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="mb-3 h-11 w-full rounded-md border-2 border-border px-2 text-sm focus:border-primary focus:outline-none">
          <option value="">— предмет —</option>
          {(subjects.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input value={topicName} onChange={(e) => setTopicName(e.target.value)} placeholder="Название темы" className="h-11 w-full rounded-md border-2 border-border px-3 text-sm focus:border-primary focus:outline-none" />
        <Button className="mt-3" disabled={!subjectId || !topicName.trim()} loading={addTopic.isPending} onClick={() => addTopic.mutate()}>
          Добавить (автовекторизация)
        </Button>
      </section>

      {/* Add material */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
        <h3 className="mb-4 font-black">Материал к теме</h3>
        <select value={materialTopicId} onChange={(e) => setMaterialTopicId(e.target.value)} className="mb-3 h-11 w-full rounded-md border-2 border-border px-2 text-sm focus:border-primary focus:outline-none">
          <option value="">— тема —</option>
          {(topics.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <textarea value={materialText} onChange={(e) => setMaterialText(e.target.value)} rows={3} placeholder="Текст конспекта…" className="w-full rounded-md border-2 border-border px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        <Button className="mt-3" variant="secondary" disabled={!materialTopicId || !materialText.trim()} loading={addMaterial.isPending} onClick={() => addMaterial.mutate()}>
          Загрузить
        </Button>
      </section>

      {/* Add task */}
      <section className="rounded-xl border border-border bg-surface p-5 shadow-card lg:col-span-2">
        <h3 className="mb-4 font-black">Добавить задачу</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="h-11 rounded-md border-2 border-border px-2 text-sm focus:border-primary focus:outline-none">
            <option value="">— тема —</option>
            {(topics.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="h-11 rounded-md border-2 border-border px-2 text-sm focus:border-primary focus:outline-none">
            <option value="easy">Лёгкая</option>
            <option value="medium">Средняя</option>
            <option value="hard">Сложная</option>
          </select>
          <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="Текст задачи… ответ через | если варианты" className="h-11 rounded-md border-2 border-border px-3 text-sm focus:border-primary focus:outline-none" />
          <Button disabled={!taskId || !content.trim()} loading={addTask.isPending} onClick={() => addTask.mutate()}>
            Создать
          </Button>
        </div>
      </section>
      </div>
    </div>
  );
}

function StudentProfileModal({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const profile = useQuery({
    queryKey: ["teacher-student", studentId],
    queryFn: () => teacherService.studentProfile(studentId!),
    enabled: !!studentId,
  });
  return (
    <Modal open={!!studentId} onClose={onClose} title="Профиль ученика">
      {profile.isLoading || !profile.data ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-4">
          <MetricCard value={`${Math.round(profile.data.overallMastery * 100)}%`} label="Общее мастерство" />
          <div>
            <p className="mb-1.5 text-xs font-black uppercase text-error">Слабые темы</p>
            <div className="flex flex-wrap gap-2">
              {(profile.data.weakTopics ?? []).map((t) => <Badge key={t} tone="error">{t}</Badge>)}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-xs font-black uppercase text-success">Сильные темы</p>
            <div className="flex flex-wrap gap-2">
              {(profile.data.strongTopics ?? []).map((t) => <Badge key={t} tone="success">{t}</Badge>)}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
