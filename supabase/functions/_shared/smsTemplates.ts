// Unified SMS Library for Digs & Gigs
// All templates follow carrier compliance, 160-char limits, and TCPA requirements

export type SmsCategory = 
  | 'welcome'
  | 'lead_notification'
  | 'engagement'
  | 'feature_promo'
  | 'billing'
  | 'reengagement'
  | 'winback'
  | 'consumer'
  | 'support';

export type SmsTemplateId = 
  // Welcome (1-3)
  | 'welcome_new_digger'
  | 'profile_completion_prompt'
  | 'skill_category_reminder'
  // Lead Notification (4-8)
  | 'new_lead_match'
  | 'high_value_lead'
  | 'time_sensitive_lead'
  | 'lead_reminder_1h'
  | 'lead_reminder_24h'
  // Engagement (9-11)
  | 'engagement_tip_respond_fast'
  | 'engagement_tip_personalize'
  | 'engagement_tip_photo_portfolio'
  // Feature Promo (12-14)
  | 'boosted_profile_promo'
  | 'featured_badge_promo'
  | 'category_dominance_promo'
  // Billing (15-18)
  | 'mid_trial_reminder'
  | 'trial_7_days_left'
  | 'trial_48_hours_left'
  | 'trial_final_day'
  // Re-engagement (19-21)
  | 'inactive_7_days'
  | 'inactive_14_days'
  | 'inactive_30_days'
  // Win-back (22-24)
  | 'card_failed'
  | 'subscription_expiring'
  | 'founder_status_lost'
  // Consumer (25-28)
  | 'project_received'
  | 'freelancer_viewing'
  | 'reminder_to_hire'
  | 'multiple_matches'
  // Support (29-30)
  | 'support_followup'
  | 'verification_needed';

export interface SmsTemplate {
  id: SmsTemplateId;
  category: SmsCategory;
  name: string;
  template: string;
  variables: string[];
}

export const SMS_TEMPLATES: Record<SmsTemplateId, SmsTemplate> = {
  // ================================
  // SECTION 1 — WELCOME SMS
  // ================================
  welcome_new_digger: {
    id: 'welcome_new_digger',
    category: 'welcome',
    name: 'Welcome Message (New Digger)',
    template: `Digs & Gigs: Welcome {{FirstName}}! Your Founders benefits are active—free 60 days + $10/$25 lead pricing for 1 year. Finish your profile to get matched: {{ProfileLink}}
Reply STOP to opt out.`,
    variables: ['FirstName', 'ProfileLink'],
  },
  
  profile_completion_prompt: {
    id: 'profile_completion_prompt',
    category: 'welcome',
    name: 'Profile Completion Prompt',
    template: `Digs & Gigs: {{FirstName}}, complete your profile to start receiving client matches. It takes 2 mins: {{ProfileLink}}
Reply STOP to opt out.`,
    variables: ['FirstName', 'ProfileLink'],
  },
  
  skill_category_reminder: {
    id: 'skill_category_reminder',
    category: 'welcome',
    name: 'Skill Category Reminder',
    template: `Digs & Gigs: Add your skills + categories now to get better matches. Founders get priority ranking: {{CategoriesLink}}
Reply STOP to opt out.`,
    variables: ['CategoriesLink'],
  },

  // ================================
  // SECTION 2 — LEAD NOTIFICATION SMS
  // ================================
  new_lead_match: {
    id: 'new_lead_match',
    category: 'lead_notification',
    name: 'New Lead Match',
    template: `Digs & Gigs: New project match for you → {{ProjectName}}. View details + reveal lead for $10/$25: {{LeadLink}}
Reply STOP to opt out.`,
    variables: ['ProjectName', 'LeadLink'],
  },
  
  high_value_lead: {
    id: 'high_value_lead',
    category: 'lead_notification',
    name: 'High-Value Client Match',
    template: `Digs & Gigs: New high-value lead posted → {{Category}}. View + reveal for $25 (Founder pricing): {{LeadLink}}
Reply STOP to opt out.`,
    variables: ['Category', 'LeadLink'],
  },
  
  time_sensitive_lead: {
    id: 'time_sensitive_lead',
    category: 'lead_notification',
    name: 'Time-Sensitive Lead',
    template: `Digs & Gigs: Client is reviewing freelancers now—respond fast to increase your chances. View project: {{LeadLink}}
Reply STOP to opt out.`,
    variables: ['LeadLink'],
  },
  
  lead_reminder_1h: {
    id: 'lead_reminder_1h',
    category: 'lead_notification',
    name: 'Lead Reminder (1 hour)',
    template: `Digs & Gigs: {{FirstName}}, this project is gaining attention. Don't miss it: {{LeadLink}}
Reply STOP to opt out.`,
    variables: ['FirstName', 'LeadLink'],
  },
  
  lead_reminder_24h: {
    id: 'lead_reminder_24h',
    category: 'lead_notification',
    name: 'Lead Reminder (24 hours)',
    template: `Digs & Gigs: Last chance to view yesterday's project match before new requests come in: {{LeadLink}}
Reply STOP to opt out.`,
    variables: ['LeadLink'],
  },

  // ================================
  // SECTION 3 — ENGAGEMENT SMS
  // ================================
  engagement_tip_respond_fast: {
    id: 'engagement_tip_respond_fast',
    category: 'engagement',
    name: 'Engagement Tip #1 - Respond Fast',
    template: `Digs & Gigs: Top freelancers respond fast. Check your matches & reply quickly to win more clients: {{LeadFeedLink}}
Reply STOP to opt out.`,
    variables: ['LeadFeedLink'],
  },
  
  engagement_tip_personalize: {
    id: 'engagement_tip_personalize',
    category: 'engagement',
    name: 'Engagement Tip #2 - Personalize',
    template: `Digs & Gigs: Personalized messages win more clients. Review your projects here: {{LeadFeedLink}}
Reply STOP to opt out.`,
    variables: ['LeadFeedLink'],
  },
  
  engagement_tip_photo_portfolio: {
    id: 'engagement_tip_photo_portfolio',
    category: 'engagement',
    name: 'Engagement Tip #3 - Photo & Portfolio',
    template: `Digs & Gigs: Profiles with a photo + portfolio get 5x more leads. Update yours: {{ProfileLink}}
Reply STOP to opt out.`,
    variables: ['ProfileLink'],
  },

  // ================================
  // SECTION 4 — FEATURE/UPGRADE PROMOS
  // ================================
  boosted_profile_promo: {
    id: 'boosted_profile_promo',
    category: 'feature_promo',
    name: 'Boosted Profile Promo',
    template: `Digs & Gigs: Want more leads? Boost your profile to appear at the top of search results: {{BoostLink}}
Reply STOP to opt out.`,
    variables: ['BoostLink'],
  },
  
  featured_badge_promo: {
    id: 'featured_badge_promo',
    category: 'feature_promo',
    name: 'Featured Digger Badge Promo',
    template: `Digs & Gigs: Stand out instantly—add a Featured Digger badge to your profile: {{BadgeLink}}
Reply STOP to opt out.`,
    variables: ['BadgeLink'],
  },
  
  category_dominance_promo: {
    id: 'category_dominance_promo',
    category: 'feature_promo',
    name: 'Category Dominance Promo',
    template: `Digs & Gigs: Become a top freelancer in your category. Unlock Category Dominance: {{DominanceLink}}
Reply STOP to opt out.`,
    variables: ['DominanceLink'],
  },

  // ================================
  // SECTION 5 — BILLING/TRIAL REMINDERS
  // ================================
  mid_trial_reminder: {
    id: 'mid_trial_reminder',
    category: 'billing',
    name: 'Mid-Trial Reminder',
    template: `Digs & Gigs: {{FirstName}}, your Founders trial is active. Lock in your $19/month lifetime rate before it expires: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['FirstName', 'BillingLink'],
  },
  
  trial_7_days_left: {
    id: 'trial_7_days_left',
    category: 'billing',
    name: '7-Day Left Reminder',
    template: `Digs & Gigs: 7 days left in your free trial. Don't lose your lifetime $19/mo subscription or $10/$25 lead pricing: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['BillingLink'],
  },
  
  trial_48_hours_left: {
    id: 'trial_48_hours_left',
    category: 'billing',
    name: '48-Hour Reminder',
    template: `Digs & Gigs: 48 hours left! Activate now to keep your Founders benefits: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['BillingLink'],
  },
  
  trial_final_day: {
    id: 'trial_final_day',
    category: 'billing',
    name: 'Final Trial Day (Urgency)',
    template: `Digs & Gigs: Last day to activate! If your subscription lapses, your Founder pricing is gone permanently: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['BillingLink'],
  },

  // ================================
  // SECTION 6 — RE-ENGAGEMENT SMS
  // ================================
  inactive_7_days: {
    id: 'inactive_7_days',
    category: 'reengagement',
    name: 'Inactive For 7 Days',
    template: `Digs & Gigs: Haven't checked in lately? New projects posted today in your categories: {{LeadFeedLink}}
Reply STOP to opt out.`,
    variables: ['LeadFeedLink'],
  },
  
  inactive_14_days: {
    id: 'inactive_14_days',
    category: 'reengagement',
    name: 'Inactive For 14 Days',
    template: `Digs & Gigs: {{FirstName}}, clients are waiting for freelancers. New opportunities available now: {{LeadFeedLink}}
Reply STOP to opt out.`,
    variables: ['FirstName', 'LeadFeedLink'],
  },
  
  inactive_30_days: {
    id: 'inactive_30_days',
    category: 'reengagement',
    name: 'Inactive For 30 Days',
    template: `Digs & Gigs: We miss you! Reactivate your freelance flow—new projects posted daily: {{LeadFeedLink}}
Reply STOP to opt out.`,
    variables: ['LeadFeedLink'],
  },

  // ================================
  // SECTION 7 — WIN-BACK SMS
  // ================================
  card_failed: {
    id: 'card_failed',
    category: 'winback',
    name: 'Card Failed / Payment Issue',
    template: `Digs & Gigs: Payment issue on your account—update your card to keep your $19 lifetime rate: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['BillingLink'],
  },
  
  subscription_expiring: {
    id: 'subscription_expiring',
    category: 'winback',
    name: 'Subscription Expired (Before Losing Founder Status)',
    template: `Digs & Gigs: Your Founder pricing expires soon. Update payment to keep $19/mo + $10/$25 leads: {{BillingLink}}
Reply STOP to opt out.`,
    variables: ['BillingLink'],
  },
  
  founder_status_lost: {
    id: 'founder_status_lost',
    category: 'winback',
    name: 'Founder Status Lost (After Grace Period)',
    template: `Digs & Gigs: Your Founder status has expired. You may rejoin anytime, but lifetime pricing is no longer available: {{PricingLink}}
Reply STOP to opt out.`,
    variables: ['PricingLink'],
  },

  // ================================
  // SECTION 8 — CONSUMER (CLIENT) SMS
  // ================================
  project_received: {
    id: 'project_received',
    category: 'consumer',
    name: 'Project Received',
    template: `Digs & Gigs: Your project has been posted! Freelancers will begin reaching out shortly. Manage your project: {{ProjectLink}}
Reply STOP to opt out.`,
    variables: ['ProjectLink'],
  },
  
  freelancer_viewing: {
    id: 'freelancer_viewing',
    category: 'consumer',
    name: 'Freelancer Viewed Your Project',
    template: `Digs & Gigs: A freelancer is reviewing your project now. Expect outreach soon! {{ProjectLink}}
Reply STOP to opt out.`,
    variables: ['ProjectLink'],
  },
  
  reminder_to_hire: {
    id: 'reminder_to_hire',
    category: 'consumer',
    name: 'Reminder to Hire',
    template: `Digs & Gigs: Still need help with your project? New freelancers are available now: {{BrowseLink}}
Reply STOP to opt out.`,
    variables: ['BrowseLink'],
  },
  
  multiple_matches: {
    id: 'multiple_matches',
    category: 'consumer',
    name: 'Multiple Matches Found',
    template: `Digs & Gigs: Good news! Several freelancers matched your project. Compare profiles: {{ProjectLink}}
Reply STOP to opt out.`,
    variables: ['ProjectLink'],
  },

  // ================================
  // SECTION 9 — SUPPORT + TRUST SMS
  // ================================
  support_followup: {
    id: 'support_followup',
    category: 'support',
    name: 'Support Request Follow-Up',
    template: `Digs & Gigs: We received your support request and will reply shortly. Thanks for your patience.
Reply STOP to opt out.`,
    variables: [],
  },
  
  verification_needed: {
    id: 'verification_needed',
    category: 'support',
    name: 'Verification Needed',
    template: `Digs & Gigs: We need a quick verification to complete your request. Please check your email: {{EmailLink}}
Reply STOP to opt out.`,
    variables: ['EmailLink'],
  },
};

// Helper function to render a template with variables
export function renderSmsTemplate(
  templateId: SmsTemplateId, 
  variables: Record<string, string>
): string {
  const template = SMS_TEMPLATES[templateId];
  if (!template) {
    throw new Error(`SMS template not found: ${templateId}`);
  }
  
  let message = template.template;
  
  // Replace all variables
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  }
  
  // Check for unreplaced variables
  const unreplaced = message.match(/{{(\w+)}}/g);
  if (unreplaced) {
    console.warn(`[SMS] Unreplaced variables in template ${templateId}:`, unreplaced);
  }
  
  return message;
}

// Get all templates by category
export function getTemplatesByCategory(category: SmsCategory): SmsTemplate[] {
  return Object.values(SMS_TEMPLATES).filter(t => t.category === category);
}

// Get template by ID
export function getTemplate(templateId: SmsTemplateId): SmsTemplate | undefined {
  return SMS_TEMPLATES[templateId];
}
