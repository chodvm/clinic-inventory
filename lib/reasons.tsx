// lib/reasons.ts
export type ReasonCode =
  | 'dispense'
  | 'administer'
  | 'waste'
  | 'expired'
  | 'damaged'
  | 'count_adjustment'
  | 'receive'

export const REASONS: { code: ReasonCode; label: string }[] = [
  { code: 'dispense',          label: 'Dispense' },
  { code: 'administer',        label: 'Administer' },
  { code: 'waste',             label: 'Waste' },
  { code: 'expired',           label: 'Expired' },
  { code: 'damaged',           label: 'Damaged' },
  { code: 'count_adjustment',  label: 'Count Adjustment' },
  { code: 'receive',           label: 'Receive/Restock' },
]
