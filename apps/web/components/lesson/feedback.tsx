"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Lock, Sparkles, TrendingUp, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Confetti } from "@/components/ui/feedback";
import { MasteryBar } from "@/components/ui/progress";
import { voiceService } from "@/lib/services/voice";
import type { AttemptResult, Difficulty, UiLanguage } from "@/lib/types";

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: "#10B981",
  medium: "#F59E0B",
  hard: "#EF4444",
};

/** Backend returns { topicId, topicName }[]; tolerate plain strings too. */
export function unlockedLabels(list: AttemptResult["prerequisiteUnlocked"] | string[] | undefined): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      if (typeof item === "string") return item;
      const obj = item as Partial<{ topicName: string; name: string; topicId: string; id: string }>;
      return obj?.topicName ?? obj?.name ?? obj?.topicId ?? obj?.id ?? "";
    })
    .filter(Boolean);
}

/** Correct answer feedback with real masteryBefore→masteryAfter animation. */
export function AnswerFeedback({
  result,
  unlockedNames,
  onContinue,
}: {
  result: AttemptResult;
  unlockedNames?: string[];
  onContinue: () => void;
}) {
  const [confetti, setConfetti] = useState(false);
  const hasUnlocks = (result.prerequisiteUnlocked ?? []).length > 0 || (unlockedNames?.length ?? 0) > 0;

  useEffect(() => {
    if (hasUnlocks) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 2600);
      return () => clearTimeout(t);
    }
  }, [hasUnlocks]);

  return (
    <div className="w-full">
      <Confetti fire={confetti} />
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
        className="rounded-xl border-t-8 border-success bg-surface p-6 shadow-pop sm:p-8"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.08 }}
        >
          <CheckCircle2 className="size-14 text-success" />
        </motion.div>
        <h2 className="mt-3 text-3xl font-black">Отлично!</h2>
        <p className="mt-1 text-text-2">{result.feedback}</p>

        {/* Mastery before → after */}
        <div className="mt-6 rounded-lg bg-[#F0FDF4] p-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-success">
            <TrendingUp className="size-4" /> Мастерство
          </p>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-lg font-bold text-text-3 line-through">
              {Math.round(result.updatedMastery.masteryBefore * 100)}%
            </span>
            <span className="text-text-3">→</span>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25, type: "spring", stiffness: 200 }}
              className="text-4xl font-black text-success"
            >
              {(result.updatedMastery.masteryAfter * 100).toFixed(1)}%
            </motion.span>
          </div>
          <div className="mt-3">
            <MasteryBar mastery={result.updatedMastery.masteryAfter} color="#10B981" size="lg" showLabel={false} />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-text-3">Следующая сложность:</span>
          <span
            className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide text-white"
            style={{ background: DIFF_COLOR[result.nextTaskDifficulty] ?? "#F59E0B" }}
          >
            {difficultyLabel(result.nextTaskDifficulty)}
          </span>
        </div>

        {hasUnlocks && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="mt-4 flex items-center gap-3 rounded-lg bg-primary-subtle p-4"
          >
            <span className="relative grid size-11 place-items-center rounded-full bg-warning/20">
              <Lock className="size-5 text-warning" />
              <motion.span
                className="absolute inset-0 rounded-full"
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.35], opacity: [0.7, 0] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-primary">Новая тема открыта!</p>
              <p className="font-bold">{unlockedLabels(unlockedNames).join(", ") || unlockedLabels(result.prerequisiteUnlocked).join(", ")}</p>
            </div>
          </motion.div>
        )}

        <Button size="xl" variant="success" fullWidth className="mt-6" onClick={onContinue}>
          Продолжить
        </Button>
      </motion.div>
    </div>
  );
}

/** Wrong answer feedback — friendly, uses real mistakeType + backend feedback. */
export function MistakeFeedback({
  result,
  onTryAgain,
  onExplainMore,
}: {
  result: AttemptResult;
  onTryAgain: () => void;
  onExplainMore: () => void;
}) {
  return (
    <motion.div
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="rounded-xl border-t-8 border-warning bg-surface p-6 shadow-pop sm:p-8"
    >
      <motion.div initial={{ rotate: -12, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260 }}>
        <XCircle className="size-12 text-warning" />
      </motion.div>
      <h2 className="mt-3 text-2xl font-black">Почти получилось.</h2>
      <p className="mt-2 rounded-lg bg-surface-2 p-3 text-text">{result.feedback}</p>

      <div className="mt-4 flex items-start gap-3 rounded-lg bg-primary-subtle p-4">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-primary">Разбор ИИ</p>
          <p className="mt-1 text-sm leading-relaxed text-text">
            {mistakeText(result.mistakeType)} Никаких переживаний — ошибка это часть пути.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="outline" size="lg" onClick={onTryAgain}>
          Попробовать снова
        </Button>
        <Button size="lg" onClick={onExplainMore}>
          Объяснить подробнее
        </Button>
      </div>
    </motion.div>
  );
}

export function difficultyLabel(d: Difficulty | string): string {
  switch (d) {
    case "easy":
      return "Лёгкая";
    case "medium":
      return "Средняя";
    case "hard":
      return "Сложная";
    default:
      return d;
  }
}

function mistakeText(type: AttemptResult["mistakeType"]): string {
  switch (type) {
    case "CALCULATION_ERROR":
      return "Похоже на вычислительную ошибку — проверьте арифметику по шагам.";
    case "CONCEPTUAL_ERROR":
      return "Кажется, концепция усвоена не до конца — давайте разберём правило.";
    case "READING_ERROR":
      return "Похоже, условие прочитано чуть иначе — перечитайте вопрос медленно.";
    default:
      return "Давайте разберём решение вместе.";
  }
}

/* ---------------- Lesson finish screen ---------------- */

export function LessonFinish({
  topicName,
  masteryStart,
  masteryEnd,
  correctCount,
  total,
  studentId,
  topicId,
  onDone,
}: {
  topicName: string;
  masteryStart: number;
  masteryEnd: number;
  correctCount: number;
  total: number;
  studentId: string;
  topicId: string;
  onDone: () => void;
}) {
  const [confetti, setConfetti] = useState(true);
  const [voiceState, setVoiceState] = useState<"idle" | "recording" | "uploading" | "done" | "error">("idle");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 2800);
    return () => clearTimeout(t);
  }, []);

  function describeMicError(err: unknown): string {
    const name = (err as DOMException)?.name ?? "";
    switch (name) {
      case "NotAllowedError":
      case "SecurityError":
        return "Доступ к микрофону запрещён. Нажми на замок 🔒 в адресной строке → «Микрофон» → «Разрешить» и попробуй снова.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "Микрофон не найден. Проверь, что устройство записи подключено и выбрано в системе.";
      case "NotReadableError":
        return "Микрофон занят другим приложением (Zoom, Meet и т.п.). Закрой его и попробуй снова.";
      case "AbortError":
        return "Запись была прервана системой. Попробуй ещё раз.";
      default:
        return `Не удалось начать запись (${name || "неизвестная ошибка"}). Попробуй ещё раз.`;
    }
  }

  async function startRecording() {
    setVoiceError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      // http://<LAN-IP> is NOT a secure context — browsers hide mic API there.
      setVoiceError(
        "Запись работает только на localhost или по HTTPS. Открой сайт через http://localhost:3001 или через https-туннель.",
      );
      setVoiceState("error");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setVoiceState("uploading");
        try {
          const up = await voiceService.upload({
            studentId,
            targetType: "LESSON",
            targetId: topicId,
            file: blob,
          });
          const res = await voiceService.pollUntilDone(up.feedbackId);
          setTranscript(res.transcript ?? null);
          setVoiceState("done");
        } catch (e) {
          setVoiceError(describeMicError(e));
          setVoiceState("error");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setVoiceState("recording");
    } catch (e) {
      setVoiceError(describeMicError(e));
      setVoiceState("error");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
  }

  return (
    <div className="w-full">
      <Confetti fire={confetti} />
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-xl bg-gradient-to-br from-primary to-[#6366F1] p-8 text-center text-white shadow-pop"
      >
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 220, damping: 14 }} className="text-6xl font-black">
          🏆
        </motion.p>
        <h2 className="mt-3 text-3xl font-black">Урок завершён!</h2>
        <p className="mt-1 text-white/85">{topicName}</p>

        <div className="mx-auto mt-6 max-w-sm rounded-xl bg-white/10 p-5 backdrop-blur">
          <p className="text-xs font-black uppercase tracking-widest text-white/75">Мастерство темы</p>
          <div className="mt-2 flex items-baseline justify-center gap-3">
            <span className="text-lg font-bold text-white/70 line-through">{Math.round(masteryStart * 100)}%</span>
            <span className="text-white/70">→</span>
            <span className="text-5xl font-black">{Math.round(masteryEnd * 100)}%</span>
          </div>
          <p className="mt-3 text-sm text-white/85">
            Верно {correctCount} из {total} заданий
          </p>
        </div>
      </motion.div>

      {/* Voice reflection */}
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 shadow-card">
        <p className="text-sm font-black uppercase tracking-widest text-text-3">Рефлексия голосом</p>
        <p className="mt-1 text-sm text-text-2">Расскажите одним предложением, что вы поняли — ИИ проанализирует.</p>
        {voiceState === "idle" && (
          <Button variant="secondary" className="mt-3" onClick={startRecording}>
            🎙 Записать ответ
          </Button>
        )}
        {voiceState === "recording" && (
          <div className="mt-3 flex items-center gap-3">
            <motion.span className="size-3 rounded-full bg-error" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }} />
            <Button variant="danger" onClick={stopRecording}>
              Остановить запись
            </Button>
          </div>
        )}
        {voiceState === "uploading" && <p className="mt-3 text-sm font-semibold text-text-2">Анализируем аудио…</p>}
        {voiceState === "done" && (
          <div className="mt-3 rounded-lg bg-[#F0FDF4] p-3">
            <p className="text-xs font-black uppercase text-success">Готово</p>
            {transcript && <p className="mt-1 text-sm italic text-text">«{transcript}»</p>}
          </div>
        )}
        {voiceState === "error" && voiceError && (
          <p className="mt-3 rounded-md bg-[#FEF2F2] p-3 text-sm text-error">{voiceError}</p>
        )}
      </div>

      <Button size="xl" fullWidth className="mt-4" onClick={onDone}>
        К карте знаний →
      </Button>
    </div>
  );
}
