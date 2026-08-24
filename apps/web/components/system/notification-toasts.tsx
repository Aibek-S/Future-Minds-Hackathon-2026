"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/ui/feedback";
import { subscribeNotifications } from "@/lib/services/voice";
import { useMe } from "@/lib/hooks/use-auth";

/**
 * Live student notifications (GET /notifications/stream).
 * ASSIGNMENT_REVISION_REQUIRED → red toast with the teacher's comment.
 */
export function NotificationToasts() {
  const me = useMe();
  const studentId = me.data?.student?.id;
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<"info" | "error">("info");

  useEffect(() => {
    if (!studentId) return;
    const ctrl = new AbortController();
    subscribeNotifications(
      {
        onEvent: (event) => {
          if (event.type === "ASSIGNMENT_REVISION_REQUIRED") {
            setTone("error");
            const comment = String(event.payload?.comment ?? "").trim();
            setMessage(comment ? `Домашку нужно доработать: «${comment}»` : "Домашка отправлена на доработку");
          } else if (event.type === "ASSIGNMENT_GRADED" || event.type === "KNOWLEDGE_STATE_UPDATED") {
            setTone("info");
            setMessage("Ваш прогресс обновлён");
          }
        },
      },
      ctrl.signal,
    );
    return () => ctrl.abort();
  }, [studentId]);

  return <Toast message={message} tone={tone} onDone={() => setMessage(null)} />;
}
