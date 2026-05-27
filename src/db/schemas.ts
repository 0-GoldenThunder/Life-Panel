/**
 * src/db/schemas.ts
 * RxDB JSON Schema definitions.
 */

const commonProperties = {
  id: { type: 'string', maxLength: 36 }, // UUID
  userId: { type: 'string' },
  createdAt: { type: 'string', format: 'date-time' },
  updatedAt: { type: 'string', format: 'date-time' },
  version: { type: 'number' }, // LWW drift guard
  _deleted: { type: 'boolean' }
};

export const eventSchema = {
  title: 'event schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...commonProperties,
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'archived'] },
    priority: { type: 'number', minimum: 1, maximum: 3 },
    type: { type: 'string', enum: ['event', 'goal'] },
    allDay: { type: 'boolean' },
    startDate: { type: ['string', 'null'], format: 'date-time' },
    endDate: { type: ['string', 'null'], format: 'date-time' }
  },
  required: ['id', 'userId', 'title', 'status', 'priority', 'type', 'allDay', 'createdAt', 'updatedAt'],
  indexes: ['updatedAt', 'status'] // Optimizing the Velocity Feed
};

export const transactionSchema = {
  title: 'transaction schema',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...commonProperties,
    amount: { type: 'number' },
    currency: { type: 'string' },
    financeScope: { type: 'string', enum: ['personal', 'business'] },
    type: { type: 'string', enum: ['income', 'expense'] },
    category: { type: 'string' },
    note: { type: 'string' },
    date: { type: 'string', format: 'date-time' }
  },
  required: ['id', 'userId', 'amount', 'currency', 'financeScope', 'type', 'category', 'date', 'createdAt', 'updatedAt'],
  indexes: ['date', 'updatedAt']
};

export const subscriptionSchema = {
  title: 'subscription schema',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...commonProperties,
    name: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    financeScope: { type: 'string', enum: ['personal', 'business'] },
    billingCycle: { type: 'string', enum: ['monthly', 'yearly'] },
    nextBillingDate: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean' }
  },
  required: ['id', 'userId', 'name', 'amount', 'currency', 'financeScope', 'billingCycle', 'nextBillingDate', 'isActive', 'createdAt', 'updatedAt'],
  indexes: ['nextBillingDate']
};

export const inflowSchema = {
  title: 'inflow schema',
  version: 1,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...commonProperties,
    name: { type: 'string' },
    amount: { type: 'number' },
    currency: { type: 'string' },
    financeScope: { type: 'string', enum: ['personal', 'business'] },
    type: { type: 'string', enum: ['monthly_revenue', 'client_retainer', 'salary', 'passive_income', 'custom'] },
    nextExpectedDate: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean' }
  },
  required: ['id', 'userId', 'name', 'amount', 'currency', 'financeScope', 'type', 'nextExpectedDate', 'isActive', 'createdAt', 'updatedAt'],
  indexes: ['nextExpectedDate']
};

export const taskSchema = {
  title: 'task schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    ...commonProperties,
    title: { type: 'string' },
    description: { type: 'string' },
    status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'archived'] },
    priority: { type: 'number', minimum: 1, maximum: 3 },
    dueDate: { type: ['string', 'null'], format: 'date-time' }
  },
  required: ['id', 'userId', 'title', 'status', 'priority', 'createdAt', 'updatedAt'],
  indexes: ['updatedAt', 'status']
};