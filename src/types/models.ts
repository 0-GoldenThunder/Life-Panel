/**
 * src/types/models.ts
 * Core domain models for the Life Manager application.
 */

export type EventStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type EventPriority = 1 | 2 | 3; // 1: Low, 2: Medium, 3: High (Gold Glow)
export type EventType = 'event' | 'goal';
export type TransactionType = 'income' | 'expense';
export type BillingCycle = 'monthly' | 'yearly';
export type FinanceScope = 'personal' | 'business';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 1 | 2 | 3;

export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  preferences: {
    theme: 'obsidian';
    currency: string;
  };
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: EventStatus;
  priority: EventPriority;
  type: EventType;
  allDay: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number; // Monotonic counter for LWW conflict resolution
  _deleted?: boolean; // For RxDB Soft Deletes & Replication
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  version?: number;
  _deleted?: boolean;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  financeScope: FinanceScope;
  type: TransactionType;
  category: string;
  note?: string;
  date: string;
  createdAt: string;
  updatedAt: string;
  version?: number;
  _deleted?: boolean;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  financeScope: FinanceScope;
  billingCycle: BillingCycle;
  nextBillingDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version?: number;
  _deleted?: boolean;
}

export interface Inflow {
  id: string;
  userId: string;
  name: string;
  amount: number;
  currency: string;
  financeScope: FinanceScope;
  type: 'monthly_revenue' | 'client_retainer' | 'salary' | 'passive_income' | 'custom';
  nextExpectedDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  version?: number;
  _deleted?: boolean;
}