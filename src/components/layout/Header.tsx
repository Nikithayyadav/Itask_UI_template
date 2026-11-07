import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Profile, Role } from '../../app/types';
import './headerSearch.css';

type Module = Role['modules'][number];
type Transaction = Module['transactions'][number];
type SearchResult =
  | { key: string; kind: 'module'; module: Module }
  | { key: string; kind: 'transaction'; module: Module; transaction: Transaction };

function initials(name: string) {
  return name.split(' ').map(part => part[0]).slice(0, 2).join('');
}

export function Header({
  brand,
  portalName,
  inModule,
  showGlobalSearch,
  sidebarOpen,
  role,
  profile,
  roles,
  query,
  profileOpen,
  unreadNotifications,
  onToggleSidebar,
  onDashboard,
  onQueryChange,
  onProfileToggle,
  onRoleSelect,
  onNotificationsClick,
  onModuleSelect,
  onTransactionSelect,
}: {
  brand: string;
  portalName: string;
  inModule: boolean;
  showGlobalSearch: boolean;
  sidebarOpen: boolean;
  role: Role;
  profile: Profile;
  roles: Role[];
  query: string;
  profileOpen: boolean;
  unreadNotifications: number;
  onToggleSidebar: () => void;
  onDashboard: () => void;
  onQueryChange: (value: string) => void;
  onProfileToggle: () => void;
  onRoleSelect: (code: string) => void;
  onNotificationsClick: () => void;
  onModuleSelect: (module: Module) => void;
  onTransactionSelect: (module: Module, transaction: Transaction) => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(0);
  const searchArea = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = useMemo<SearchResult[]>(() => {
    if (!normalizedQuery) return [];

    return role.modules.flatMap(module => {
      const moduleMatches = module.module_name.toLocaleLowerCase().includes(normalizedQuery);
      const moduleResult: SearchResult[] = moduleMatches
        ? [{ key: `module:${module.module_code}`, kind: 'module', module }]
        : [];
      const transactionResults: SearchResult[] = module.transactions
        .filter(transaction =>
          moduleMatches ||
          transaction.transaction_name.toLocaleLowerCase().includes(normalizedQuery) ||
          transaction.transaction_code.toLocaleLowerCase().includes(normalizedQuery),
        )
        .map(transaction => ({
          key: `transaction:${module.module_code}:${transaction.transaction_code}`,
          kind: 'transaction',
          module,
          transaction,
        }));

      return [...moduleResult, ...transactionResults];
    }).slice(0, 8);
  }, [normalizedQuery, role.modules]);

  useEffect(() => {
    setActiveResult(0);
  }, [normalizedQuery]);

  useEffect(() => {
    if (!showGlobalSearch) setSearchOpen(false);
  }, [showGlobalSearch]);

  useEffect(() => {
    function closeSearch(event: PointerEvent) {
      if (event.target instanceof Node && !searchArea.current?.contains(event.target)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeSearch);
    return () => document.removeEventListener('pointerdown', closeSearch);
  }, []);

  function selectResult(result: SearchResult) {
    onQueryChange('');
    setSearchOpen(false);
    if (result.kind === 'module') {
      onModuleSelect(result.module);
    } else {
      onTransactionSelect(result.module, result.transaction);
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setSearchOpen(false);
      return;
    }
    if (event.key === 'ArrowDown' && results.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult(index => (index + 1) % results.length);
    } else if (event.key === 'ArrowUp' && results.length) {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult(index => (index - 1 + results.length) % results.length);
    } else if (event.key === 'Enter' && searchOpen && results[activeResult]) {
      event.preventDefault();
      selectResult(results[activeResult]);
    }
  }

  return <header className="topbar">
    <div className="topbar-left">
      {inModule && <button className="mobile-menu" aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={sidebarOpen} onClick={onToggleSidebar}><span/><span/><span/></button>}
      <button className="biztab" aria-label={`Go to ${role.role_name} dashboard`} onClick={onDashboard}>{brand}<span>.</span></button>
      <div className="top-divider"/>
      <div className="portal-name">{portalName}</div>
    </div>
    <div className="topbar-right">
      {showGlobalSearch && <div className="global-search-area" ref={searchArea}>
        <label className="global-search">
          <span aria-hidden="true">⌕</span>
          <input
            placeholder="Search modules or transactions..."
            value={query}
            onChange={event => onQueryChange(event.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search modules and transactions"
            aria-autocomplete="list"
            aria-expanded={searchOpen}
            aria-controls="workspace-search-results"
            aria-activedescendant={searchOpen && results[activeResult] ? `workspace-search-${results[activeResult].key}` : undefined}
          />
          <kbd>⌘ K</kbd>
        </label>
        {searchOpen && <div className="global-search-dropdown" id="workspace-search-results" role="listbox" aria-label="Navigation search results">
          {!normalizedQuery
            ? <p className="global-search-state">Search available modules and transactions for this role.</p>
            : results.length
              ? results.map((result, index) => {
                const isModule = result.kind === 'module';
                const title = isModule ? result.module.module_name : result.transaction.transaction_name;
                const detail = isModule
                  ? `Open ${result.module.module_name} module`
                  : `${result.module.module_name} · ${result.transaction.transaction_code}`;
                return <button
                  type="button"
                  key={result.key}
                  id={`workspace-search-${result.key}`}
                  className={`global-search-result${index === activeResult ? ' is-active' : ''}`}
                  role="option"
                  aria-selected={index === activeResult}
                  onMouseEnter={() => setActiveResult(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => selectResult(result)}
                >
                  <span className="global-search-result-icon" aria-hidden="true">{isModule ? '▦' : '↗'}</span>
                  <span className="global-search-result-copy"><b>{title}</b><small>{detail}</small></span>
                  <span className="global-search-result-kind">{isModule ? 'Module' : 'Transaction'}</span>
                </button>;
              })
              : <p className="global-search-state">No matching modules or transactions.</p>}
        </div>}
      </div>}
      <button className="icon-button notification-top" aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ''}`} onClick={onNotificationsClick}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>{unreadNotifications > 0 && <i/>}</button>
      <div className="profile-area">
        <button className="profile-trigger" onClick={onProfileToggle} aria-expanded={profileOpen}>
          <span className="avatar avatar-user">{initials(profile.fullName)}</span>
          <span className="profile-copy"><b>{profile.fullName.split(' ')[0]}</b><small>{role.role_name}</small></span>
          <span className="chevron">⌄</span>
        </button>
        {profileOpen && <div className="profile-menu">
          <div className="profile-menu-heading">SWITCH ROLE</div>
          {roles.map(item => <button key={item.role_code} onClick={() => onRoleSelect(item.role_code)}>
            <span className="role-dot">{initials(item.role_name)}</span>
            <span>{item.role_name}</span>
            {item.role_code === role.role_code && <b>✓</b>}
          </button>)}
        </div>}
      </div>
    </div>
  </header>;
}
