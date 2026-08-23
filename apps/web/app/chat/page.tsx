'use client';

import { ChatShell } from '../components/ChatShell';

export default function ChatPage() {
  return (
    <ChatShell
      kind="chat"
      apiBase="chat"
      title="Чат с ИИ-репетитором"
      subtitle="Вход → сессия → вопрос. Ответ стримится по SSE."
      requireRole="STUDENT"
      demoEmail="demo_student@hackathon.com"
      showExamples
    />
  );
}
