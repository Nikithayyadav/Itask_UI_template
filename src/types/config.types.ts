import type { Project } from '../features/projects/types';
import type { Task } from '../features/tasks/types';
import type { IconName } from '../engine/IconRegistry';

export type Page =
  | 'Dashboard'
  | 'Module Dashboard'
  | 'Workspace'
  | 'Projects'
  | 'Create Project'
  | 'Create Task'
  | 'My Tasks'
  | 'My Daily Activity'
  | 'My Submissions'
  | 'Documents & Evidence'
  | 'Feedback & Reviews'
  | 'Notifications'
  | 'Reports'
  | 'Review Queue'
  | 'Team Tracker';

export type ModalKind = 'project' | 'task' | 'activity' | 'submission' | 'review' | 'profile' | null;

export interface RoleDefinition {
  role_code: string;
  role_name: string;
}

export interface TransactionConfig {
  role_code: string;
  module_code: string;
  transaction_code: string;
  transaction_name: string;
  action: string;
  order: number;
  capabilities?: string[];
}

export interface ModuleDefinition {
  role_code: string;
  module_code: string;
  module_name: string;
  order: number;
  shortcut_icon: string;
  screen: Page;
}

export interface ModuleConfig extends ModuleDefinition {
  transactions: TransactionConfig[];
}

export interface RoleConfig extends RoleDefinition {
  modules: ModuleConfig[];
}

export type KpiScope = {
  role_code: string;
  module_code?: string;
};

export interface KpiDefinition {
  scope: KpiScope;
  kpi_code: string;
  label: string;
  data_key: string;
  icon: IconName;
  display_type: 'number' | 'percentage' | 'currency' | 'text';
  tone: string;
  description?: string;
  trend?: {
    data_key: string;
  };
}

export interface KpiValue {
  value: string | number;
  trend?: string;
  [key: string]: string | number | undefined;
}

export interface TableColumnDefinition {
  key: string;
  label: string;
  type?: 'selection';
  sortable?: boolean;
}

export interface TableDefinition {
  table_code: string;
  columns: TableColumnDefinition[];
  searchable_fields: string[];
  sorting: { enabled: boolean };
  pagination: { enabled: boolean; page_size: number };
}

export interface SelectOption {
  value: string;
  label: string;
}

export type FormFieldType = 'text' | 'email' | 'tel' | 'date' | 'select' | 'textarea' | 'file';

export interface FormFieldDefinition {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  read_only?: boolean;
  placeholder?: string;
  description?: string;
  options?: SelectOption[];
  options_key?: string;
  default_value?: string;
  default_value_key?: string;
  rows?: number;
  section?: string;
  class_name?: string;
}

export interface FormDefinition {
  form_code: string;
  fields: FormFieldDefinition[];
}

export interface FilterDefinition {
  field: string;
  label: string;
  all_label: string;
  options: SelectOption[];
}

export interface FilterGroupDefinition {
  table_code: string;
  search_placeholder?: string;
  filters: FilterDefinition[];
}

export interface StatusDefinition {
  value: string;
  label: string;
  color: string;
  background?: string;
  completes_progress?: boolean;
}

export interface NavigationRoute {
  role_code: string;
  module_code: string;
  transaction_code: string;
  page: Page;
  modal?: Exclude<ModalKind, null>;
  markNotificationsRead?: boolean;
}

export interface WorkspaceDefinition {
  title: string;
  desc: string;
  icon: string;
  stat: string;
  label: string;
  actions: string[];
  secondaryStat: string;
  secondaryLabel: string;
  tertiaryStat: string;
  tertiaryLabel: string;
  report?: boolean;
  trend?: number[];
}

export interface TransactionFormOptions {
  owners?: string[];
  priorities?: string[];
  statuses?: string[];
  teams?: string[];
  defaultPriority?: string;
  defaultStatus?: string;
  projects?: Project[];
}

export interface TransactionMockData {
  projects?: Project[];
  tasks?: Task[];
  activities?: unknown[];
  notifications?: { text: string; time: string; read: boolean }[];
  submissions?: unknown[];
  reviews?: unknown[];
  documents?: unknown[];
  feedback?: unknown[];
  team?: unknown[];
  report?: Record<string, unknown>;
  workspace?: WorkspaceDefinition;
  form?: TransactionFormOptions;
}

export interface TransactionMockRecord {
  role_code: string;
  module_code: string;
  transaction_code: string;
  data: TransactionMockData;
}

export interface ITaskConfig {
  application: {
    application_name: string;
    brand: string;
    portal_name: string;
    version: string;
    copyright_year: number;
    user_name: string;
    user_email: string;
    app_url: string;
  };
  roles: RoleDefinition[];
  dashboard: {
    default_role_code: string;
    module_shortcuts: { source: 'role_modules'; show_all: boolean; tone_cycle: string[] };
    kpi_scopes: ('role' | 'module')[];
  };
  modules: ModuleDefinition[];
  transactions: TransactionConfig[];
  kpiDefinitions: KpiDefinition[];
  tableDefinitions: TableDefinition[];
  formDefinitions: FormDefinition[];
  filterDefinitions: FilterGroupDefinition[];
  statusConfigurations: Record<string, StatusDefinition[]>;
  navigation: {
    routes: NavigationRoute[];
    transaction_card_icons: string[];
    transaction_card_tones: string[];
  };
  mockData: {
    kpiValues: Record<string, Record<string, KpiValue>>;
    transactions: TransactionMockRecord[];
  };
}
