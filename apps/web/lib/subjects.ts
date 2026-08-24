/**
 * Subject color identity. Purple stays the ZERTTE brand color — subject hues
 * are used intentionally (cards, tree accents) and never as full rainbow.
 */
export interface SubjectTheme {
  /** Tailwind-ready hex values used inline for dynamic subjects. */
  accent: string;
  accentSoft: string;
  text: string;
  gradient: string;
}

const THEMES: SubjectTheme[] = [
  // Mathematics → purple/indigo
  { accent: "#7C3AED", accentSoft: "#EDE9FE", text: "#5B21B6", gradient: "linear-gradient(135deg,#7C3AED 0%,#6366F1 100%)" },
  // Physics → blue/cyan
  { accent: "#0EA5E9", accentSoft: "#E0F2FE", text: "#0369A1", gradient: "linear-gradient(135deg,#0EA5E9 0%,#06B6D4 100%)" },
  // Programming → dark blue/violet
  { accent: "#4F46E5", accentSoft: "#E0E7FF", text: "#3730A3", gradient: "linear-gradient(135deg,#4F46E5 0%,#7C3AED 100%)" },
  // Biology → green
  { accent: "#10B981", accentSoft: "#D1FAE5", text: "#047857", gradient: "linear-gradient(135deg,#10B981 0%,#34D399 100%)" },
  // Chemistry → orange
  { accent: "#F59E0B", accentSoft: "#FEF3C7", text: "#B45309", gradient: "linear-gradient(135deg,#F59E0B 0%,#FB923C 100%)" },
  // History → amber
  { accent: "#D97706", accentSoft: "#FEF3C7", text: "#92400E", gradient: "linear-gradient(135deg,#D97706 0%,#F59E0B 100%)" },
  // Languages → pink/coral
  { accent: "#EC4899", accentSoft: "#FCE7F3", text: "#BE185D", gradient: "linear-gradient(135deg,#EC4899 0%,#FB7185 100%)" },
];

const HINTS: Array<[RegExp, number]> = [
  [/(алгебр|algebra|матем|math|геометр|geometry)/i, 0],
  [/(физик|physic)/i, 1],
  [/(програм|inform|code|cs\b)/i, 2],
  [/(биолог|biolog)/i, 3],
  [/(хим|chem)/i, 4],
  [/(истор|histor)/i, 5],
  [/(язык|lang|каз|russ|engl|қаз)/i, 6],
];

export function subjectTheme(subjectIdOrName: string, indexHint = 0): SubjectTheme {
  for (const [re, idx] of HINTS) {
    if (re.test(subjectIdOrName)) return THEMES[idx];
  }
  return THEMES[indexHint % THEMES.length];
}

/** Mastery → semantic status color (aligned with backend heatmap thresholds). */
export function masteryColor(mastery: number): string {
  if (mastery >= 0.7) return "#10B981";
  if (mastery >= 0.4) return "#F59E0B";
  return "#EF4444";
}

export type HeatStatus = "GREEN" | "YELLOW" | "RED";

export function heatStatus(mastery: number): HeatStatus {
  if (mastery >= 0.7) return "GREEN";
  if (mastery >= 0.4) return "YELLOW";
  return "RED";
}
