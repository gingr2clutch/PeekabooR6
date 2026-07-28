import type { Grade } from "./rate";

// The attacker-side reframe of a peek's grade. Single source of truth so the
// wording/colors tune in one place. Higher grade = more dangerous to the
// attacker, so the colour runs red → grey (opposite of the green → red grade
// badge, on purpose).
export type DangerTier = {
  key: "extreme" | "high" | "moderate" | "low";
  label: string; // chip / eyebrow text
  priority: string; // uppercase word for the "Playing Attacker?" template
  color: string; // hex accent (chip bg, callout rule)
};

export function dangerForGrade(grade: Grade): DangerTier {
  switch (grade) {
    case "S":
      return { key: "extreme", label: "Extreme danger", priority: "EXTREME", color: "#dc2626" };
    case "A":
      return { key: "high", label: "High danger", priority: "HIGH", color: "#ea580c" };
    case "B":
      return { key: "moderate", label: "Moderate", priority: "MODERATE", color: "#d97706" };
    default:
      return { key: "low", label: "Low priority", priority: "LOW", color: "#8b8d86" };
  }
}
