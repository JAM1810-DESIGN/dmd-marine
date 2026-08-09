export type AgingBuckets = {
  current: number;
  d1to30: number;
  d31to60: number;
  d60plus: number;
  total: number;
};

export type AgingItem = { totalAmount: number; paid: number; dueDate: Date | null; issueDate: Date };

/** Pure aging math — splits outstanding balances into buckets by days past due. Unit-tested. */
export function bucketReceivables(items: AgingItem[], asOf: Date): AgingBuckets {
  const buckets: AgingBuckets = { current: 0, d1to30: 0, d31to60: 0, d60plus: 0, total: 0 };
  for (const item of items) {
    const outstanding = Math.max(item.totalAmount - item.paid, 0);
    if (outstanding <= 0) continue;

    const due = item.dueDate ?? item.issueDate;
    const daysPast = Math.floor((asOf.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    if (daysPast <= 0) buckets.current += outstanding;
    else if (daysPast <= 30) buckets.d1to30 += outstanding;
    else if (daysPast <= 60) buckets.d31to60 += outstanding;
    else buckets.d60plus += outstanding;
    buckets.total += outstanding;
  }
  return buckets;
}
