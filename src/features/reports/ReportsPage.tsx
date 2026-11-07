import type { Role } from '../../app/types';
import { WorkspaceFeaturePage } from '../workspace/WorkspaceFeaturePage';
type Module=Role['modules'][number];
export function ReportsPage({role,module,transactionCode,onAction,onTransaction}:{role:Role;module?:Module;transactionCode:string;onAction:()=>void;onTransaction:(module:Module,transaction:Module['transactions'][number])=>void}) {
  return <WorkspaceFeaturePage role={role} module={module} transactionCode={transactionCode} onAction={onAction} onTransaction={onTransaction}/>;
}
