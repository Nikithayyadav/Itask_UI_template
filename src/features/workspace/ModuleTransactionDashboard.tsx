import type { Role } from '../../app/types';
import { getTransactionData } from '../../transactions/transactionData/registry';
import { getDashboardConfig } from '../../engine/ConfigLoader';

type Module = Role['modules'][number];
type Transaction = Module['transactions'][number];

export function ModuleTransactionDashboard({ roleCode,module,onSelect }: { roleCode:string;module: Module; onSelect: (module: Module, transaction: Transaction) => void }) {
  const config = getDashboardConfig();
  return <>
    <section className="home-quick-layout module-transaction-layout" aria-label={`${module.module_name} features`}><div className="home-shortcuts">
      {module.transactions.map((transaction, index) => {const data=getTransactionData(roleCode,module.module_code,transaction.transaction_code)?.transaction??transaction;const icon=config.navigation.transaction_card_icons[index%config.navigation.transaction_card_icons.length];const tone=config.navigation.transaction_card_tones[index%config.navigation.transaction_card_tones.length];return <button className="home-shortcut" key={transaction.transaction_code} onClick={() => onSelect(module, transaction)}>
        <span className={`shortcut-icon ${tone}`}>{icon}</span>
        <b>{data.transaction_name}</b>
        <small>{data.action} · {data.transaction_code}</small>
        <span className="shortcut-arrow">›</span>
      </button>;})}
    </div></section>
  </>;
}
