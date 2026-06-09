export const defaultTags = [
  { name: "code", color: "#6366F1" },
  { name: "dashboard", color: "#F59E0B" },
  { name: "dev", color: "#3B82F6" },
  { name: "entertainment", color: "#E879F9" },
  { name: "hosting", color: "#06B6D4" },
  { name: "inspiration", color: "#FB7185" },
  { name: "media", color: "#F97316" },
  { name: "news", color: "#EF4444" },
  { name: "productivity", color: "#10B981" },
  { name: "reference", color: "#8B5CF6" },
  { name: "tools", color: "#14B8A6" },
  { name: "work", color: "#FBBF24" },
] as const;

export function normalizeTagName(input: string) {
  return input.trim().toLowerCase();
}
