import { getTransactionData } from '../transactions/transactionData/registry';
import type { Project } from '../features/projects/types';
import type { Task } from '../features/tasks/types';

export type { Project } from '../features/projects/types';
export type { Task } from '../features/tasks/types';

function requireInitialData(moduleCode: string, transactionCode: string) {
  const record = getTransactionData('CON', moduleCode, transactionCode);
  if (!record) {
    throw new Error(`Missing initial mock data for CON/${moduleCode}/${transactionCode}.`);
  }
  return record.data;
}

export const projects = requireInitialData('MPR', 'VMP').projects as Project[];
export const tasks = requireInitialData('MTK', 'VMT').tasks as Task[];
export const activity = requireInitialData('DA', 'VDA').activities ?? [];
