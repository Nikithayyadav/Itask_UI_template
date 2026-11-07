import type { Page, Role } from '../../app/types';
import { getTransactionData } from '../../transactions/transactionData/registry';
type Module = Role['modules'][number];
type Transaction = Module['transactions'][number];

export function Sidebar({brand,version,copyrightYear,roleCode,modules,page,selectedAction,onClose,onModuleHome,onTransaction}:{brand:string;version:string;copyrightYear:number;roleCode:string;modules:Module[];page:Page;selectedAction:Transaction|null;onClose:()=>void;onModuleHome:(module:Module)=>void;onTransaction:(module:Module,transaction:Transaction)=>void}) {
  const module=modules[0];
  return <><button className="drawer-backdrop" aria-label="Close navigation" onClick={onClose}/><aside className="sidebar is-open" aria-label="Main navigation">
    <div className="brand"><button type="button" className="module-menu-collapse" onClick={onClose} aria-label="Collapse sidebar" title="Collapse sidebar"><svg viewBox="0 0 20 20" aria-hidden="true"><rect x="2.5" y="3" width="15" height="14" rx="2"/><path d="M7 3v14M11 7l-2.5 3L11 13"/></svg></button>{module&&<div className="sidebar-module-heading"><span className="sidebar-module-code">{module.module_code}</span><button type="button" onClick={()=>onModuleHome(module)} aria-current={page==='Module Dashboard'?'page':undefined}>{module.module_name}</button></div>}</div>
    <nav className="nav-list sidebar-transactions" aria-label={`${module?.module_name??'Module'} features`}>{module?.transactions.map(transaction=>{const data=module&&getTransactionData(roleCode,module.module_code,transaction.transaction_code)?.transaction;return <button key={transaction.transaction_code} className={`subfolder-item ${selectedAction?.transaction_code===transaction.transaction_code?'selected':''}`} onClick={()=>onTransaction(module,transaction)} title={`${data?.transaction_code??transaction.transaction_code} · ${data?.action??transaction.action}`}><span className="subfolder-mark">›</span><span className="subfolder-name">{data?.transaction_name??transaction.transaction_name}</span></button>;})}</nav>
    <div className="sidebar-bottom"><div className="sidebar-foot">© {copyrightYear} {brand} <span>·</span> v{version}</div></div>
  </aside></>;
}
