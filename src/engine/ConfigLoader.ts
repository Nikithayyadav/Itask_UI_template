import rawConfig from '../config/applications/itask/iTaskConfig.json';
import { validateDashboardConfig } from './ConfigValidator';
import type {
  FormDefinition,
  ITaskConfig,
  KpiDefinition,
  KpiValue,
  ModuleConfig,
  RoleConfig,
  TableDefinition,
  TransactionConfig,
  TransactionMockRecord,
} from '../types/config.types';

const config = rawConfig as ITaskConfig;

validateDashboardConfig(config);

const roles: RoleConfig[] = config.roles.map(role => ({
  ...role,
  modules: config.modules
    .filter(module => module.role_code === role.role_code)
    .sort((left, right) => left.order - right.order)
    .map(module => ({
      ...module,
      transactions: config.transactions
        .filter(transaction =>
          transaction.role_code === role.role_code &&
          transaction.module_code === module.module_code
        )
        .sort((left, right) => left.order - right.order),
    })),
}));

const transactionKey = (roleCode: string, moduleCode: string, transactionCode: string) =>
  `${roleCode}:${moduleCode}:${transactionCode}`;

const transactions = new Map(
  config.transactions.map(transaction => [
    transactionKey(transaction.role_code, transaction.module_code, transaction.transaction_code),
    transaction,
  ]),
);

const mockRecords = new Map(
  config.mockData.transactions.map(record => [
    transactionKey(record.role_code, record.module_code, record.transaction_code),
    record,
  ]),
);

export const getDashboardConfig = (): ITaskConfig => config;

export const getRoles = (): RoleConfig[] => roles;

export const getRoleByCode = (roleCode: string): RoleConfig | undefined =>
  roles.find(role => role.role_code === roleCode);

export const getModulesByRole = (roleCode: string): ModuleConfig[] =>
  getRoleByCode(roleCode)?.modules ?? [];

export const getTransactionsByModule = (
  roleCode: string,
  moduleCode: string,
): TransactionConfig[] =>
  getModulesByRole(roleCode).find(module => module.module_code === moduleCode)?.transactions ?? [];

export const getTransactionConfig = (
  roleCode: string,
  moduleCode: string,
  transactionCode: string,
): TransactionConfig | undefined =>
  transactions.get(transactionKey(roleCode, moduleCode, transactionCode));

export const getTransactionMockData = (
  roleCode: string,
  moduleCode: string,
  transactionCode: string,
): TransactionMockRecord | undefined =>
  mockRecords.get(transactionKey(roleCode, moduleCode, transactionCode));

export const getKpiDefinitions = (
  roleCode: string,
  moduleCode?: string,
): KpiDefinition[] =>
  config.dashboard.kpi_scopes.includes(moduleCode ? 'module' : 'role')
    ? config.kpiDefinitions.filter(definition =>
      definition.scope.role_code === roleCode &&
      (moduleCode
        ? definition.scope.module_code === moduleCode
        : definition.scope.module_code === undefined)
    )
    : [];

export const getKpiValues = (
  roleCode: string,
  moduleCode?: string,
): Record<string, KpiValue> =>
  config.mockData.kpiValues[moduleCode ? `${roleCode}:${moduleCode}` : roleCode] ?? {};

export const getTableDefinition = (tableCode: string): TableDefinition | undefined =>
  config.tableDefinitions.find(definition => definition.table_code === tableCode);

export const getFormDefinition = (formCode: string): FormDefinition | undefined =>
  config.formDefinitions.find(definition => definition.form_code === formCode);

export const getFilterDefinition = (tableCode: string) =>
  config.filterDefinitions.find(definition => definition.table_code === tableCode);

export const getStatusConfiguration = (statusType: string) =>
  config.statusConfigurations[statusType] ?? [];

export const getNavigationRoute = (
  roleCode: string,
  moduleCode: string,
  transactionCode: string,
) =>
  config.navigation.routes.find(route =>
    route.role_code === roleCode &&
    route.module_code === moduleCode &&
    route.transaction_code === transactionCode
  );

export const getNavigationRouteForPage = (roleCode: string, page: string) =>
  config.navigation.routes.find(route =>
    route.role_code === roleCode && route.page === page
  );

export const roleHasCapability = (roleCode: string, capability: string): boolean =>
  config.transactions.some(transaction =>
    transaction.role_code === roleCode && transaction.capabilities?.includes(capability)
  );
