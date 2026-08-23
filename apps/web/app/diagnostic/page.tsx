'use client';

import { ChatShell } from '../components/ChatShell';

export default function DiagnosticPage() {
  return (
    <ChatShell
      kind="diagnostic"
      apiBase="diagnostic"
      title="Диагностика знаний"
      subtitle="ИИ задаст несколько вопросов, чтобы определить твой уровень и цели."
      requireRole="STUDENT"
      demoEmail="demo_student@hackathon.com"
      placeholder="Ответ на вопрос…"
    />
  );
}
