'use client';

import { ChatShell } from '../components/ChatShell';

export default function FeedbackPage() {
  return (
    <ChatShell
      kind="feedback"
      apiBase="feedback"
      title="Обратная связь"
      subtitle="Поделись впечатлениями об уроке — ИИ проанализирует и посоветует, что повторить."
      requireRole="STUDENT"
      demoEmail="demo_student@hackathon.com"
      placeholder="Что было понятно, а что вызвало трудности?…"
    />
  );
}
