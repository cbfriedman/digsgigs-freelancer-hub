export type ViolationType = 
  | 'contact_email'
  | 'contact_phone' 
  | 'contact_social'
  | 'contact_website'
  | 'off_platform_solicitation'
  | 'identity_reveal'
  | 'fee_circumvention'
  | 'harassment'
  | 'spam';

export interface ModerationResult {
  approved: boolean;
  violations: ViolationType[];
  violationDetails: string[];
  riskScore: number; // 0-100
  suggestedAction: 'allow' | 'warn' | 'block';
}

export interface ViolationRecord {
  id: string;
  user_id: string | null;
  conversation_id: string | null;
  gig_id: string | null;
  bid_id: string | null;
  original_message: string;
  violations: string[];
  violation_details: Record<string, any> | null;
  risk_score: number | null;
  sender_type: 'gigger' | 'digger' | null;
  created_at: string;
}

export const VIOLATION_LABELS: Record<ViolationType, string> = {
  contact_email: 'Email address',
  contact_phone: 'Phone number',
  contact_social: 'Social media handle',
  contact_website: 'Website URL',
  off_platform_solicitation: 'Off-platform contact request',
  identity_reveal: 'Personal identity information',
  fee_circumvention: 'Attempt to bypass platform fees',
  harassment: 'Inappropriate or abusive content',
  spam: 'Spam or promotional content',
};
