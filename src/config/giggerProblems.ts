/**
 * Problem-Based Gigger Form Configuration
 * Maps plain-English problem statements to internal categories/subcategories
 * Giggers ONLY see these friendly options, never technical categories
 */

import { CATEGORY_IDS } from './techCategories';

export interface ClarifyingOption {
  label: string;
  value: string;
}

export interface ProblemOption {
  id: string;
  label: string;
  // Internal mapping (hidden from Gigger)
  internalCategoryId: string;
  internalSubcategorySlug: string;
  // Clarifying question for Step 2
  clarifyingQuestion: string;
  clarifyingOptions: ClarifyingOption[];
}

export const PROBLEM_OPTIONS: ProblemOption[] = [
  {
    id: 'build-website',
    label: 'Build or improve a website',
    internalCategoryId: CATEGORY_IDS.SOFTWARE_WEB,
    internalSubcategorySlug: 'website-development',
    clarifyingQuestion: 'Which best describes the work?',
    clarifyingOptions: [
      { label: 'New website from scratch', value: 'new' },
      { label: 'Redesign an existing site', value: 'redesign' },
      { label: 'Fix issues or add features', value: 'fix' },
      { label: 'Improve speed or performance', value: 'performance' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'build-webapp',
    label: 'Build a web app or software',
    internalCategoryId: CATEGORY_IDS.SOFTWARE_WEB,
    internalSubcategorySlug: 'saas-mvp-development',
    clarifyingQuestion: 'What type of project is this?',
    clarifyingOptions: [
      { label: 'Build a new app from scratch', value: 'new-app' },
      { label: 'Add features to existing app', value: 'add-features' },
      { label: 'Fix bugs or issues', value: 'fix-bugs' },
      { label: 'Connect to other services (APIs)', value: 'integrations' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'design-something',
    label: 'Design something',
    internalCategoryId: CATEGORY_IDS.DESIGN_CREATIVE,
    internalSubcategorySlug: 'ui-ux-design',
    clarifyingQuestion: 'What do you need designed?',
    clarifyingOptions: [
      { label: 'Website or app design', value: 'web-design' },
      { label: 'Logo or brand identity', value: 'branding' },
      { label: 'Marketing materials', value: 'marketing' },
      { label: 'Pitch deck or presentation', value: 'presentation' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'get-customers',
    label: 'Get more customers or traffic',
    internalCategoryId: CATEGORY_IDS.MARKETING_GROWTH,
    internalSubcategorySlug: 'paid-ads-management',
    clarifyingQuestion: 'How do you want to grow?',
    clarifyingOptions: [
      { label: 'Run paid ads (Google, Facebook)', value: 'paid-ads' },
      { label: 'Improve search rankings (SEO)', value: 'seo' },
      { label: 'Set up email marketing', value: 'email' },
      { label: 'Improve website conversions', value: 'cro' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'automate-ai',
    label: 'Automate a process or use AI',
    internalCategoryId: CATEGORY_IDS.AI_AUTOMATION,
    internalSubcategorySlug: 'workflow-automation',
    clarifyingQuestion: 'What would you like to automate?',
    clarifyingOptions: [
      { label: 'Connect tools together (Zapier, etc.)', value: 'integrations' },
      { label: 'Build a chatbot', value: 'chatbot' },
      { label: 'Automate repetitive tasks', value: 'tasks' },
      { label: 'Use AI in my business', value: 'ai' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'business-systems',
    label: 'Set up business systems',
    internalCategoryId: CATEGORY_IDS.BUSINESS_SYSTEMS,
    internalSubcategorySlug: 'crm-setup-customization',
    clarifyingQuestion: 'What systems do you need help with?',
    clarifyingOptions: [
      { label: 'CRM or customer tracking', value: 'crm' },
      { label: 'Project management tools', value: 'project-management' },
      { label: 'Databases or spreadsheets', value: 'databases' },
      { label: 'General operations help', value: 'operations' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'create-content',
    label: 'Create content or media',
    internalCategoryId: CATEGORY_IDS.CONTENT_MEDIA,
    internalSubcategorySlug: 'website-copywriting',
    clarifyingQuestion: 'What type of content do you need?',
    clarifyingOptions: [
      { label: 'Website copy or sales pages', value: 'copywriting' },
      { label: 'Video editing', value: 'video' },
      { label: 'Podcast editing', value: 'podcast' },
      { label: 'Technical documentation', value: 'technical' },
      { label: 'Not sure yet', value: 'unsure' },
    ],
  },
  {
    id: 'custom',
    label: 'Something else / Customize my idea',
    internalCategoryId: CATEGORY_IDS.CONTENT_MEDIA,
    internalSubcategorySlug: 'general',
    clarifyingQuestion: 'How would you like to describe it?',
    clarifyingOptions: [
      { label: "I'll describe in the project details below", value: 'describe-below' },
      { label: "I'll add a custom label in the next step", value: 'custom-label' },
    ],
  },
];

export const TIMELINE_OPTIONS = [
  { label: 'ASAP', value: 'asap' },
  { label: 'In 1–2 weeks', value: '1-2-weeks' },
  { label: 'In 1–2 months', value: '1-2-months' },
  { label: 'Just exploring', value: 'exploring' },
];

// Helper to get problem option by ID
export const getProblemById = (problemId: string): ProblemOption | undefined => {
  return PROBLEM_OPTIONS.find(p => p.id === problemId);
};

// Helper to get internal category/subcategory for a problem selection
export const getInternalMapping = (problemId: string): { categoryId: string; subcategorySlug: string } | undefined => {
  const problem = getProblemById(problemId);
  if (!problem) return undefined;
  return {
    categoryId: problem.internalCategoryId,
    subcategorySlug: problem.internalSubcategorySlug,
  };
};

/** Whether the problem is "custom" so we can show the custom label field. */
export const isCustomProblem = (problemId: string): boolean => problemId === 'custom';
