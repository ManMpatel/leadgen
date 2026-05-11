export type LeadStatus =
  | 'new'
  | 'called'
  | 'interested'
  | 'email-sent'
  | 'closed-won'
  | 'not-interested';

export type SubscriberStatus = 'active' | 'paused' | 'churned';

export interface Lead {
  _id: string;
  name: string;
  nameNormalized: string;
  type: string;
  phone?: string;
  phoneNormalized?: string;
  email?: string;
  address?: string;
  suburb?: string;
  website?: string;
  notes?: string;
  status: LeadStatus;
  sourceQuery?: string;
  score: number;
  addedAt: string;
  calledAt?: string;
  lastSeenInSearch?: string;
  alternativePhones: string[];
  alternativeEmails: string[];
  possibleDuplicateOf?: string;
  unsubscribed: boolean;
  followUpDueAt?: string;
  leadNumber?: number;
}

export interface Search {
  _id: string;
  query: string;
  runAt: string;
  resultCount: number;
  leadIds: string[];
}

export interface PaymentRecord {
  month: string;
  paid: boolean;
  paidAt?: string;
}

export interface Subscriber {
  _id: string;
  leadId: string;
  lead?: Lead;
  decisionMakerName: string;
  directEmail?: string;
  directPhone?: string;
  monthlyPrice: number;
  startDate: string;
  billingMethod: string;
  paymentHistory: PaymentRecord[];
  status: SubscriberStatus;
  churnReason?: string;
  closingNotes?: string;
  deliverables?: string[];
}

export interface DashboardData {
  todaysCalls: Lead[];
  interestedCount: number;
  activeSubscriberCount: number;
  mrr: number;
  followUpsDue: Lead[];
  recentlyInterested: Lead[];
}
