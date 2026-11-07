import { getNavigationRoute } from '../engine/ConfigLoader';
import type { ModalKind, Page, Role } from '../app/types';

type Module = Role['modules'][number];
type Transaction = Module['transactions'][number];

export function resolveTransaction(module: Module, transaction: Transaction, roleCode: string) {
  const route = getNavigationRoute(roleCode, module.module_code, transaction.transaction_code);
  return {
    page: route?.page ?? module.screen ?? 'Workspace' as Page,
    modal: route?.modal ?? null as ModalKind,
    markNotificationsRead: route?.markNotificationsRead ?? false,
  };
}
