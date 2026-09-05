import { BarChart3, ClipboardCheck, Map, Search, Sparkles, UserCog, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Human-facing label + icon for each backend tool name (see
 * apps/backend/src/ai/tools/ai-tools.registry.ts), shown as a live chip in
 * the chat while the AI is using that tool. Shared by every chat scenario
 * (chat, diagnostic, feedback, orchestrator, personalization).
 */
const AI_TOOL_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  search_materials: { label: "Ищу материалы по теме", icon: Search },
  get_knowledge_state: { label: "Смотрю твой прогресс", icon: BarChart3 },
  get_subject_summary: { label: "Сравниваю предметы", icon: BarChart3 },
  get_roadmap: { label: "Строю план обучения", icon: Map },
  update_student_profile: { label: "Обновляю профиль", icon: UserCog },
  initialize_student_knowledge: { label: "Сохраняю результаты диагностики", icon: ClipboardCheck },
  get_class_overview: { label: "Анализирую статистику класса", icon: Users },
};

export function aiToolLabel(tool: string): { label: string; icon: LucideIcon } {
  return AI_TOOL_LABELS[tool] ?? { label: "Использую инструмент", icon: Sparkles };
}
