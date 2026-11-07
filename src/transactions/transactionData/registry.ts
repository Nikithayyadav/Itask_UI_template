import {
  getTransactionConfig,
  getTransactionMockData,
} from '../../engine/ConfigLoader';
import type { TransactionMockData } from '../../types/config.types';

export type TransactionData = {
  transaction: NonNullable<ReturnType<typeof getTransactionConfig>>;
  data: TransactionMockData;
};

export function getTransactionData(roleCode: string, moduleCode: string, transactionCode: string): TransactionData | undefined {
  const transaction = getTransactionConfig(roleCode, moduleCode, transactionCode);
  const record = getTransactionMockData(roleCode, moduleCode, transactionCode);
  if (!transaction || !record) return undefined;
  return { transaction, data: record.data };
}
