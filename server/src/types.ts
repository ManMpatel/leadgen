import { ObjectId } from 'mongodb';

export type LeadStatus =
  | 'new'
  | 'called'
  | 'interested'
  | 'email-sent'
  | 'closed-won'
  | 'follow-up-sent'
  | 'not-interested';

export type SubscriberStatus = 'active' | 'paused' | 'churned';

export interface Lead {
  _id?: ObjectId;
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
  addedAt: Date;
  calledAt?: Date;
  lastSeenInSearch?: Date;
  alternativePhones: string[];
  alternativeEmails: string[];
  possibleDuplicateOf?: ObjectId;
  unsubscribed: boolean;
  followUpDueAt?: Date;
  leadNumber?: number;
}

export interface Search {
  _id?: ObjectId;
  query: string;
  runAt: Date;
  resultCount: number;
  leadIds: ObjectId[];
}

export interface PaymentRecord {
  month: string; // YYYY-MM
  paid: boolean;
  paidAt?: Date;
}

export interface Subscriber {
  _id?: ObjectId;
  leadId: ObjectId;
  decisionMakerName: string;
  directEmail?: string;
  directPhone?: string;
  monthlyPrice: number;
  startDate: Date;
  billingMethod: string;
  paymentHistory: PaymentRecord[];
  status: SubscriberStatus;
  churnReason?: string;
  closingNotes?: string;
  deliverables?: string[];
}

export interface RawLead {
  name: string;
  type: string;
  phone?: string;
  email?: string;
  address?: string;
  website?: string;
  notes?: string;
  sourceQuery?: string;
  status?: LeadStatus; // honoured on insert; used by migration script
}
