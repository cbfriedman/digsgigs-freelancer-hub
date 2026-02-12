/**
 * Suggested skills for "Skills required" when posting a gig.
 * Gigger-friendly, professional terms so Diggers can match and tailor proposals.
 */
export const SUGGESTED_SKILLS = [
  "React",
  "WordPress",
  "Web design",
  "Logo design",
  "Figma",
  "UI/UX design",
  "SEO",
  "Google Ads",
  "Copywriting",
  "Video editing",
  "Content writing",
  "Social media",
  "Node.js",
  "Python",
  "Mobile app",
  "E-commerce",
  "CRM setup",
  "Excel",
  "Data entry",
  "Virtual assistant",
  "Email marketing",
  "Landing pages",
  "Branding",
  "Illustration",
  "Photo editing",
  "Technical writing",
  "API integration",
  "Database",
  "Automation",
  "Chatbot",
] as const;

export function normalizeSkillInput(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isSkillDuplicate(skill: string, existing: string[]): boolean {
  const n = normalizeSkillInput(skill).toLowerCase();
  return existing.some((s) => s.trim().toLowerCase() === n);
}
