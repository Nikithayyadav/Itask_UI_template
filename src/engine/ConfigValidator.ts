import { iconRegistry } from './IconRegistry';
import type { ITaskConfig } from '../types/config.types';

export const validateDashboardConfig = (config: ITaskConfig): boolean => {
  if (!config || !config.application || !config.dashboard) {
    throw new Error('Invalid iTASK configuration: application or dashboard section is missing.');
  }
  if (
    !config.navigation ||
    !Array.isArray(config.navigation.routes) ||
    !Array.isArray(config.navigation.transaction_card_icons) ||
    !Array.isArray(config.navigation.transaction_card_tones) ||
    !config.mockData ||
    !config.mockData.kpiValues ||
    !Array.isArray(config.mockData.transactions)
  ) {
    throw new Error('Invalid iTASK configuration: navigation or mock data is incomplete.');
  }

  const requiredArrays: (keyof ITaskConfig)[] = [
    'roles',
    'modules',
    'transactions',
    'kpiDefinitions',
    'tableDefinitions',
    'formDefinitions',
    'filterDefinitions',
  ];
  requiredArrays.forEach(key => {
    if (!Array.isArray(config[key])) {
      throw new Error(`Invalid iTASK configuration: ${key} must be an array.`);
    }
  });

  const roleCodes = new Set<string>();
  config.roles.forEach(role => {
    if (!role.role_code || !role.role_name || roleCodes.has(role.role_code)) {
      throw new Error(`Invalid or duplicate role: ${role.role_code || '(missing code)'}.`);
    }
    roleCodes.add(role.role_code);
  });

  const moduleKeys = new Set<string>();
  config.modules.forEach(module => {
    const key = `${module.role_code}:${module.module_code}`;
    if (
      !roleCodes.has(module.role_code) ||
      !module.module_code ||
      !module.module_name ||
      !module.shortcut_icon ||
      !module.screen ||
      moduleKeys.has(key)
    ) {
      throw new Error(`Invalid or duplicate module: ${key}.`);
    }
    moduleKeys.add(key);
  });

  const transactionKeys = new Set<string>();
  config.transactions.forEach(transaction => {
    const key = `${transaction.role_code}:${transaction.module_code}:${transaction.transaction_code}`;
    if (
      !moduleKeys.has(`${transaction.role_code}:${transaction.module_code}`) ||
      !transaction.transaction_code ||
      !transaction.transaction_name ||
      !transaction.action ||
      transactionKeys.has(key)
    ) {
      throw new Error(`Invalid or duplicate transaction: ${key}.`);
    }
    transactionKeys.add(key);
  });

  const routeKeys = new Set<string>();
  config.navigation.routes.forEach(route => {
    const key = `${route.role_code}:${route.module_code}:${route.transaction_code}`;
    if (!transactionKeys.has(key) || routeKeys.has(key)) {
      throw new Error(`Invalid or duplicate transaction route: ${key}.`);
    }
    routeKeys.add(key);
  });

  config.kpiDefinitions.forEach(definition => {
    if (
      !roleCodes.has(definition.scope.role_code) ||
      !definition.kpi_code ||
      !definition.label ||
      !definition.data_key ||
      !Object.prototype.hasOwnProperty.call(iconRegistry, definition.icon)
    ) {
      throw new Error(`Invalid KPI definition: ${definition.kpi_code || '(missing code)'}.`);
    }
    if (
      definition.scope.module_code &&
      !moduleKeys.has(`${definition.scope.role_code}:${definition.scope.module_code}`)
    ) {
      throw new Error(`KPI ${definition.kpi_code} references an unknown module.`);
    }
  });

  const mockKeys = new Set<string>();
  config.mockData.transactions.forEach(record => {
    const key = `${record.role_code}:${record.module_code}:${record.transaction_code}`;
    if (!transactionKeys.has(key) || mockKeys.has(key)) {
      throw new Error(`Mock data references an unknown transaction: ${key}.`);
    }
    mockKeys.add(key);
  });

  const supportedFieldTypes = new Set(['text', 'email', 'tel', 'date', 'select', 'textarea', 'file']);
  config.formDefinitions.forEach(form => {
    if (!form.form_code || !Array.isArray(form.fields)) {
      throw new Error(`Invalid form definition: ${form.form_code || '(missing code)'}.`);
    }
    form.fields.forEach(field => {
      if (!field.name || !field.label || !supportedFieldTypes.has(field.type)) {
        throw new Error(`Invalid field in form ${form.form_code}.`);
      }
    });
  });

  config.filterDefinitions.forEach(group => {
    if (!config.tableDefinitions.some(table => table.table_code === group.table_code)) {
      throw new Error(`Filters reference an unknown table: ${group.table_code}.`);
    }
    group.filters.forEach(filter => {
      if (!filter.field || !filter.label || !filter.all_label || !Array.isArray(filter.options)) {
        throw new Error(`Invalid filter definition for ${group.table_code}.`);
      }
    });
  });

  config.tableDefinitions.forEach(table => {
    if (
      !table.table_code ||
      !table.columns.length ||
      !table.pagination.page_size ||
      table.pagination.page_size < 1
    ) {
      throw new Error(`Invalid table definition: ${table.table_code || '(missing code)'}.`);
    }
  });

  Object.entries(config.statusConfigurations).forEach(([statusType, statuses]) => {
    if (!Array.isArray(statuses) || statuses.some(status => !status.value || !status.label || !status.color)) {
      throw new Error(`Invalid status configuration: ${statusType}.`);
    }
  });

  config.kpiDefinitions.forEach(definition => {
    const scopeKey = definition.scope.module_code
      ? `${definition.scope.role_code}:${definition.scope.module_code}`
      : definition.scope.role_code;
    if (!config.mockData.kpiValues[scopeKey]?.[definition.data_key]) {
      throw new Error(`KPI ${definition.kpi_code} is missing its configured mock value.`);
    }
  });

  return true;
};
