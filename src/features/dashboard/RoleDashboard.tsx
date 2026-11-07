import { getDashboardConfig } from '../../engine/ConfigLoader';
import type { Role } from '../../app/types';

type Shortcut = { title: string; description: string; icon: string };

export function RoleDashboard({
  role,
  modules,
  shortcuts,
  onOpenModule,
}: {
  role: Role;
  modules: Role['modules'];
  shortcuts: Shortcut[];
  onOpenModule: (module: Role['modules'][number]) => void;
}) {
  const shortcutToneCycle = getDashboardConfig().dashboard.module_shortcuts.tone_cycle;
  return <>
    <section className="home-quick-layout" aria-label={`${role.role_name} workspace modules`}>
      <div className="home-shortcuts">{shortcuts.map((card, index) => {
        const module = modules[index];
        if (!module) return null;
        return <button className="home-shortcut" key={module.module_code} onClick={() => onOpenModule(module)}>
          <span className={`shortcut-icon ${shortcutToneCycle[index % shortcutToneCycle.length]}`}>{card.icon}</span>
          <b>{card.title}</b><small>{card.description}</small><span className="shortcut-arrow">›</span>
        </button>;
      })}</div>
    </section>
  </>;
}
