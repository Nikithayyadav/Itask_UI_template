import {
  getRoleByCode,
  getModulesByRole,
  getTransactionsByModule,
} from "./ConfigLoader";

// Check whether a role exists
export const hasRole = (roleCode: string): boolean => {
  return getRoleByCode(roleCode) !== undefined;
};

// Get modules accessible to a role
export const getAccessibleModules = (roleCode: string) => {
  return getModulesByRole(roleCode);
};

// Check whether a role can access a particular module
export const canAccessModule = (
  roleCode: string,
  moduleCode: string
): boolean => {
  return getAccessibleModules(roleCode).some(
    (module) => module.module_code === moduleCode
  );
};

// Get transactions available in a module
export const getAccessibleTransactions = (
  roleCode: string,
  moduleCode: string
) => {
  return getTransactionsByModule(roleCode, moduleCode);
};

// Check whether a transaction is available to a role
export const canAccessTransaction = (
  roleCode: string,
  moduleCode: string,
  transactionCode: string
): boolean => {
  return getAccessibleTransactions(roleCode, moduleCode).some(
    (transaction) =>
      transaction.transaction_code === transactionCode
  );
};