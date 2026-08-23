'use client';

import { ChatShell } from '../components/ChatShell';

export default function OrchestratorPage() {
  return (
    <ChatShell
      kind="orchestrator"
      apiBase="orchestrator/chat"
      title="ИИ-ассистент учителя"
      subtitle="Спроси про класс, план урока или рекомендации. ИИ анализирует статистику класса."
      requireRole="TEACHER"
      demoEmail="demo_teacher@hackathon.com"
      placeholder="Что делать на следующем уроке?…"
      extraField={{ label: 'ID класса', name: 'classId', placeholder: 'classId (например, cmt...) ' }}
    />
  );
}
