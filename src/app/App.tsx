import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import '../styles/ownerProjectTransactions.css';
import '../styles/navigationRefinements.css';
import type { Role, Profile, Page, ModalKind } from './types';
import { ProjectsPanel, CreateProjectPage, UpdateProjectPage } from '../features/projects/ProjectComponents';
import { ProjectDetailsPage } from '../features/projects/ProjectDetailsPage';
import { ProjectMembersPage } from '../features/projects/ProjectMembersPage';
import { TaskPanel, CreateTaskPage } from '../features/tasks/TaskComponents';
import { ModulePanel } from '../features/workspace/ModulePanel';
import { resolveTransaction } from '../transactions/transactionRouter';
import { WorkspaceModal } from '../components/modals/WorkspaceModal';
import { initials } from './helpers';
import { Header } from '../components/layout/Header';
import { Sidebar } from '../components/layout/Sidebar';
import { RoleDashboard } from '../features/dashboard/RoleDashboard';
import { ModuleTransactionDashboard } from '../features/workspace/ModuleTransactionDashboard';
import {
  getDashboardConfig,
  getFilterDefinition,
  getNavigationRouteForPage,
  getRoles,
  roleHasCapability,
  getTableDefinition,
} from '../engine/ConfigLoader';
import { projects as seedProjects, tasks as seedTasks } from '../data/initialData';
import type { Task } from '../features/tasks/types';
import type {
  Project,
  ProjectTrackerFilter,
  ProjectTrackerResponse,
  ProjectTrackerSort,
} from '../features/projects/types';
import { projectService } from '../services/resources/projects';
import { taskService } from '../services/resources/tasks';
import { activityService } from '../services/resources/activity';
import { submissionService } from '../services/resources/submissions';
import { reviewService } from '../services/resources/reviews';
import { createProjectFromForm } from '../transactions/projects/createProject';
import { createTaskFromForm } from '../transactions/tasks/createTask';
import { profileFromForm } from '../transactions/profile/updateProfile';
import { activityFromForm } from '../transactions/activity/logActivity';
import { submissionFromForm } from '../transactions/submissions/submitForReview';
import { reviewFromForm } from '../transactions/reviews/saveReview';
import { getTransactionData } from '../transactions/transactionData/registry';

const appConfig = getDashboardConfig();
const dashboardConfig = appConfig.application;
const roles = getRoles();

function getTransactionForPage(roleCode: string, page: Page) {
  const route = getNavigationRouteForPage(roleCode, page);
  if (!route) return undefined;
  const role = roles.find(item => item.role_code === roleCode);
  const module = role?.modules.find(item => item.module_code === route.module_code);
  const transaction = module?.transactions.find(item => item.transaction_code === route.transaction_code);
  return module && transaction ? { module, transaction } : undefined;
}

function notificationsForRole(roleCode: string) {
  const target = getTransactionForPage(roleCode, 'Notifications');
  return target
    ? getTransactionData(roleCode, target.module.module_code, target.transaction.transaction_code)?.data.notifications ?? []
    : [];
}

function requireConfigValue<T>(value: T | undefined, description: string): T {
  if (!value) throw new Error(`Missing ${description} in iTASK configuration.`);
  return value;
}
const taskTable = requireConfigValue(getTableDefinition('tasks'), 'task table');
const taskFilterConfig = requireConfigValue(getFilterDefinition('tasks'), 'task filters');
const taskStatusFilter = requireConfigValue(taskFilterConfig.filters.find(filter => filter.field === 'status'), 'task status filter');
const taskPriorityFilter = requireConfigValue(taskFilterConfig.filters.find(filter => filter.field === 'priority'), 'task priority filter');

function readProfile(): Profile {
  const defaults: Profile = { fullName: dashboardConfig.user_name, email: dashboardConfig.user_email, jobTitle: '', phone: '', location: '', timezone: 'Asia/Kolkata', about: '' };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('itask-profile') ?? '{}') as Partial<Profile> }; }
  catch { return defaults; }
}
function assistantReply(message: string, roleName: string) {
  const prompt = message.toLowerCase();
  if (prompt.includes('task') || prompt.includes('focus')) return `As a ${roleName.toLowerCase()}, start with the items marked due soon or awaiting an update. Open the task module to review the current list.`;
  if (prompt.includes('project')) return 'Your dashboard has a project progress snapshot, and the project module opens the full tracker with status and progress details.';
  if (prompt.includes('review') || prompt.includes('submission')) return 'Open the matching review or submissions module to see items waiting for a decision or follow submitted work.';
  if (prompt.includes('report')) return 'Open a reporting module for progress summaries and delivery trends.';
  return `I can help you find things in your ${roleName.toLowerCase()} workspace. Try asking about tasks, projects, reviews, or reports, or open the matching folder from the navigation.`;
}
export default function App() {
  const [initialLoading, setInitialLoading] = useState(true);
  const loaderTimer = useRef<number | null>(null);
  useEffect(() => {
    loaderTimer.current = window.setTimeout(() => setInitialLoading(false), 1700);
    return () => { if (loaderTimer.current !== null) window.clearTimeout(loaderTimer.current); };
  }, []);
  const [roleCode, setRoleCode] = useState(() => localStorage.getItem('itask-role') ?? appConfig.dashboard.default_role_code);
  const role = roles.find(x => x.role_code === roleCode) ?? roles[0];
  const [profile, setProfile] = useState<Profile>(readProfile);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantDraft, setAssistantDraft] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<{ from: 'assistant' | 'you'; text: string }[]>(() => [{ from: 'assistant', text: `Hey ${readProfile().fullName.split(' ')[0]}, how can I help you today?` }]);
  const [page, setPage] = useState<Page>('Dashboard');
  const [selectedAction, setSelectedAction] = useState<Role['modules'][number]['transactions'][number] | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(
    () => new URLSearchParams(window.location.search).get('Project_ID') ?? undefined,
  );
  const [activeModuleCode, setActiveModuleCode] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [projects, setProjects] = useState(seedProjects); const [tasks, setTasks] = useState(seedTasks);
  const [query, setQuery] = useState('');
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [taskStatus, setTaskStatus] = useState(taskStatusFilter.all_label);
  const [taskPriority, setTaskPriority] = useState(taskPriorityFilter.all_label);
  const [pageNo, setPageNo] = useState(1);
  const [projectTrackerResponse, setProjectTrackerResponse] = useState<ProjectTrackerResponse>();
  const [projectTrackerLoading, setProjectTrackerLoading] = useState(false);
  const [projectTrackerError, setProjectTrackerError] = useState<string>();
  const projectTrackerRequestId = useRef(0);
  const [projectCreateLoading, setProjectCreateLoading] = useState(false);
  const [projectCreateError, setProjectCreateError] = useState<string>();
  const projectCreateRequest = useRef(false);
  const [modal, setModal] = useState<ModalKind>(null);
  const [notice, setNotice] = useState('');
  const [notifications, setNotifications] = useState(() => notificationsForRole(roleCode));
  const [submitted, setSubmitted] = useState(false);
  const modules = role.modules;
  useEffect(() => {
    const syncFromLocation = () => {
      const parts = window.location.pathname.split('/').filter(Boolean);
      if (parts[0] === 'transactions' && parts.length === 4) {
        const [, routeRole, moduleCode, transactionCode] = parts;
        const routeRoleData = roles.find(item => item.role_code === routeRole);
        const routeModule = routeRoleData?.modules.find(item => item.module_code === moduleCode);
        const transaction = routeModule?.transactions.find(item => item.transaction_code === transactionCode);
        if (routeRoleData && routeModule && transaction) {
          setSelectedProjectId(new URLSearchParams(window.location.search).get('Project_ID') ?? undefined);
          const transactionData = getTransactionData(routeRoleData.role_code, routeModule.module_code, transaction.transaction_code)?.data;
          if (transactionData?.projects && transaction.transaction_code !== 'UP') setProjects(transactionData.projects as Project[]);
          if (transactionData?.tasks) setTasks(transactionData.tasks as Task[]);
          if (transactionData?.notifications) setNotifications(transactionData.notifications);
          setRoleCode(routeRoleData.role_code);
          setActiveModuleCode(routeModule.module_code);
          setSelectedAction(transaction);
          setPage(resolveTransaction(routeModule, transaction, routeRoleData.role_code).page);
          return;
        }
      }
      if (parts[0] === 'modules' && parts.length === 3) {
        setSelectedProjectId(undefined);
        const [, routeRole, moduleCode] = parts;
        const routeRoleData = roles.find(item => item.role_code === routeRole);
        const routeModule = routeRoleData?.modules.find(item => item.module_code === moduleCode);
        if (routeRoleData && routeModule) {
          setRoleCode(routeRoleData.role_code);
          setActiveModuleCode(routeModule.module_code);
          setSelectedAction(null);
          setPage('Module Dashboard');
          return;
        }
      }
      setSelectedProjectId(undefined);
      setActiveModuleCode(null);
      setSelectedAction(null);
      setPage('Dashboard');
    };
    syncFromLocation();
    window.addEventListener('popstate', syncFromLocation);
    return () => window.removeEventListener('popstate', syncFromLocation);
  }, []);
  const searchProjectTracker = useCallback(async (
    filter: ProjectTrackerFilter,
    pageNumber: number,
    pageSize: number,
    sorting: ProjectTrackerSort[],
  ): Promise<boolean> => {
    const requestId = ++projectTrackerRequestId.current;
    setProjectTrackerLoading(true);
    setProjectTrackerError(undefined);
    setProjectTrackerResponse(undefined);
    try {
      const isOwnedProjectTracker = roleCode === 'OWN' && selectedAction?.transaction_code === 'VOP';
      const isProjectDetailsTracker = selectedAction?.transaction_code === 'VPD';
      const isProjectUpdateTracker = roleCode === 'OWN' && selectedAction?.transaction_code === 'UP';
      const usesProjectTrackerApi = isOwnedProjectTracker || isProjectDetailsTracker || isProjectUpdateTracker;
      let effectiveFilter = filter;
      if (isOwnedProjectTracker) {
        const userId = import.meta.env.VITE_USER_ID?.trim();
        if (!userId) throw new Error('Project Tracker API is not configured. Set VITE_USER_ID to the authenticated user ID.');

        const selectedOwners = filter.Project_Owner;
        const allowedOwners = selectedOwners?.length
          ? selectedOwners.filter(ownerId => ownerId === userId)
          : [userId];
        if (!allowedOwners.length) {
          setProjectTrackerError('No projects match the selected owner filter for your account.');
          return false;
        }
        effectiveFilter = { ...filter, Project_Owner: allowedOwners };
      }

      const search = {
        Filter: effectiveFilter,
        Pagination: { Page_Number: pageNumber, Page_Size: pageSize },
        Sorting: sorting,
      };
      const result = usesProjectTrackerApi
        ? await projectService.searchTrackerApi(search)
        : await projectService.searchTracker(search, projects);
      if (result.BDOC_Response.Header.Status !== 'SUCCESS') {
        throw new Error(result.BDOC_Response.Header.Message || 'The project tracker request failed.');
      }
      if (requestId === projectTrackerRequestId.current) setProjectTrackerResponse(result);
      return requestId === projectTrackerRequestId.current;
    } catch (error) {
      if (requestId === projectTrackerRequestId.current) {
        setProjectTrackerError(error instanceof Error ? error.message : 'An unexpected project tracker error occurred.');
      }
      return false;
    } finally {
      if (requestId === projectTrackerRequestId.current) setProjectTrackerLoading(false);
    }
  }, [projects, roleCode, selectedAction?.transaction_code]);
  const visibleModules = activeModuleCode ? modules.filter(module => module.module_code === activeModuleCode) : modules;
  const inModule = page !== 'Dashboard';
  const searchTerm = query.toLowerCase();
  const filteredTasks = tasks.filter(task =>
    taskTable.searchable_fields.some(field =>
      String(Reflect.get(task, field) ?? '').toLowerCase().includes(searchTerm)
    ) &&
    (taskStatus === taskStatusFilter.all_label || task.status === taskStatus) &&
    (taskPriority === taskPriorityFilter.all_label || task.priority === taskPriority)
  );
  function replayLoader() {
    if (loaderTimer.current !== null) window.clearTimeout(loaderTimer.current);
    setInitialLoading(true);
    loaderTimer.current = window.setTimeout(() => { setInitialLoading(false); loaderTimer.current = null; }, 1700);
  }
  function go(p: Page) { if (p === 'Dashboard' && page !== 'Dashboard') replayLoader(); if (p === 'Dashboard') window.history.pushState({}, '', '/dashboard'); setPage(p); setSelectedAction(null); setSelectedProjectId(undefined); setQuery(''); setTaskStatus(taskStatusFilter.all_label); setTaskPriority(taskPriorityFilter.all_label); setPageNo(1); if (p === 'Dashboard') { setActiveModuleCode(null); closeSidebar(); } }
  function openModule(module: Role['modules'][number]) { setActiveModuleCode(module.module_code); go('Module Dashboard'); setActiveModuleCode(module.module_code); window.history.pushState({}, '', `/modules/${roleCode}/${module.module_code}`); }
  function openConfiguredForm(formPage: Page) {
    const target = getTransactionForPage(roleCode, formPage);
    if (!target) {
      toast(`No configured transaction opens ${formPage}.`);
      return;
    }
    setActiveModuleCode(target.module.module_code);
    setPage(formPage);
    setSelectedAction(target.transaction);
    setModal(null);
  }
  function openProjectForm() {
    setProjectCreateError(undefined);
    setProjectCreateLoading(false);
    projectCreateRequest.current = false;
    openConfiguredForm('Create Project');
  }
  function openTaskForm() { openConfiguredForm('Create Task'); }
  function openTransaction(module: Role['modules'][number], transaction: Role['modules'][number]['transactions'][number], projectId?: string) {
    closeSidebar();
    const projectQuery = projectId ? `?${new URLSearchParams({ Project_ID: projectId })}` : '';
    window.history.pushState({}, '', `/transactions/${roleCode}/${module.module_code}/${transaction.transaction_code}${projectQuery}`);
    setSelectedProjectId(projectId);
    setActiveModuleCode(module.module_code);
    const transactionData = getTransactionData(roleCode, module.module_code, transaction.transaction_code)?.data;
    if (transactionData?.projects && transaction.transaction_code !== 'UP') setProjects(transactionData.projects as Project[]);
    if (transactionData?.tasks) setTasks(transactionData.tasks as Task[]);
    if (transactionData?.notifications) setNotifications(transactionData.notifications);
    const destination = resolveTransaction(module, transaction, roleCode);
    setPage(destination.page); setSelectedAction(transaction);
    setQuery(''); setTaskStatus(taskStatusFilter.all_label); setTaskPriority(taskPriorityFilter.all_label); setPageNo(1);
    if (destination.modal) openModal(destination.modal);
    if (destination.markNotificationsRead) setNotifications(current => current.map(notification => ({ ...notification, read: true })));
  }
  function setRole(code: string) { if (code !== roleCode && page === 'Dashboard') replayLoader(); setNotifications(notificationsForRole(code)); setRoleCode(code); setActiveModuleCode(null); localStorage.setItem('itask-role', code); go('Dashboard'); }
  function toggleSidebar() { setSidebarOpen(open => !open); }
  function closeSidebar() { setSidebarOpen(false); }
  function toast(message: string) { setNotice(message); window.setTimeout(() => setNotice(''), 2800); }
  function askAssistant(prompt = assistantDraft) {
    const text = prompt.trim();
    if (!text) return;
    setAssistantMessages(current => [...current, { from: 'you', text }, { from: 'assistant', text: assistantReply(text, role.role_name) }]);
    setAssistantDraft('');
  }
  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    if (modal === 'profile') {
      const updated = profileFromForm(data);
      setProfile(updated); localStorage.setItem('itask-profile', JSON.stringify(updated)); toast('Profile updated');
    }
    if (modal === 'project') { const next=createProjectFromForm(data,`PRJ00${projects.length+1}`); setProjects(current=>[next,...current]); void projectService.create(next); }
    if (modal === 'task') { const next=createTaskFromForm(data,`TSK-${1100+tasks.length}`,profile.fullName); setTasks(current=>[next,...current]); void taskService.create(next); }
    if (modal === 'activity') { void activityService.create(activityFromForm(data,profile)); toast('Daily activity saved to your log'); }
    if (modal === 'submission') { void submissionService.create(submissionFromForm(data,profile)); toast('Submission sent for review'); }
    if (modal === 'review') { void reviewService.create(reviewFromForm(data,profile)); toast('Review decision saved'); }
    setSubmitted(true); setModal(null); window.setTimeout(() => setSubmitted(false), 50);
  }
  function updateTask(id: string, change: Partial<Task>) { setTasks(prev => prev.map(t => t.id === id ? { ...t, ...change } : t)); toast('Task updated'); }
  const activeModule = modules.find(module => module.module_code === activeModuleCode);
  const isProjectDetailsTransaction = (roleCode === 'CON' || roleCode === 'OWN') && selectedAction?.transaction_code === 'VPD';
  const isProjectDetails = isProjectDetailsTransaction && Boolean(selectedProjectId);
  const isProjectUpdateTransaction = roleCode === 'OWN' && selectedAction?.transaction_code === 'UP';
  const isProjectUpdate = isProjectUpdateTransaction && Boolean(selectedProjectId);
  const isProjectMemberManagement = roleCode === 'OWN' && selectedAction?.transaction_code === 'MPM';
  function openProjectUpdate(projectId?: string) {
    if (!projectId) {
      toast('This project has no Project_ID in the current response.');
      return;
    }
    if (!activeModuleCode || !selectedAction) {
      toast('The Update Project transaction is unavailable.');
      return;
    }
    closeSidebar();
    window.history.pushState(
      {},
      '',
      `/transactions/${roleCode}/${activeModuleCode}/${selectedAction.transaction_code}?${new URLSearchParams({ Project_ID: projectId })}`,
    );
    setSelectedProjectId(projectId);
  }
  function backToProjectUpdateListing(projectCode?: string, refreshWarning?: string) {
    if (projectCode) {
      toast(refreshWarning
        ? `Project ${projectCode} updated; refresh warning: ${refreshWarning}`
        : `Project ${projectCode} updated successfully`);
    }
    setSelectedProjectId(undefined);
    if (activeModuleCode && selectedAction) {
      window.history.pushState({}, '', `/transactions/${roleCode}/${activeModuleCode}/${selectedAction.transaction_code}`);
    }
  }
  function openProjectDetails(projectId?: string) {
    if (!projectId) {
      toast('This project has no Project_ID in the current response.');
      return;
    }
    const targetModule = role.modules.find(module =>
      module.transactions.some(transaction => transaction.transaction_name === 'View Project Details'),
    );
    const targetTransaction = targetModule?.transactions.find(transaction => transaction.transaction_name === 'View Project Details');
    if (!targetModule || !targetTransaction) {
      toast('View Project Details is not available for this role.');
      return;
    }
    openTransaction(targetModule, targetTransaction, projectId);
  }
  function backToProjects() {
    if (isProjectDetailsTransaction && selectedAction && activeModuleCode) {
      setSelectedProjectId(undefined);
      window.history.pushState({}, '', `/transactions/${roleCode}/${activeModuleCode}/${selectedAction.transaction_code}`);
      setPage('Projects');
      return;
    }

    const projectListName = roleCode === 'OWN' ? 'View Owned Projects' : 'View My Projects';
    const targetModule = role.modules.find(module =>
      module.transactions.some(transaction => transaction.transaction_name === projectListName),
    );
    const targetTransaction = targetModule?.transactions.find(transaction => transaction.transaction_name === projectListName);
    if (targetModule && targetTransaction) {
      openTransaction(targetModule, targetTransaction);
      return;
    }
    toast('View My Projects is not available for this role.');
  }
  const title = page === 'Dashboard' ? 'Dashboard' : page === 'Module Dashboard' ? activeModule?.module_name ?? 'Workspace' : selectedAction?.transaction_name ?? page;
  const assistantStarted = assistantMessages.length > 1;
  const sub = page === 'Module Dashboard' ? 'Choose a feature to continue.' : `Keep your ${page.toLowerCase()} moving with everything in one place.`;
  const homeModules = appConfig.dashboard.module_shortcuts.show_all ? modules : [];
  const unreadNotifications = notifications.filter(notification => !notification.read).length;
  const homeCards = homeModules.map(module => ({ title: module.module_name, description: module.transactions.slice(0, 2).map(transaction => transaction.transaction_name).join(' · '), icon: module.shortcut_icon }));
  const activeTransactionData = activeModule && selectedAction
    ? getTransactionData(roleCode, activeModule.module_code, selectedAction.transaction_code)
    : undefined;
  const canCreateProject = Boolean(getTransactionForPage(roleCode, 'Create Project'));
  const canCreateTask = Boolean(getTransactionForPage(roleCode, 'Create Task'));
  const openModal = (kind: typeof modal) => { setModal(kind); setSubmitted(false); };
  const primaryAction = page === 'Projects' ? canCreateProject ? '＋ New project' : 'View project' : page === 'My Tasks' ? canCreateTask ? '＋ Create task' : '＋ Log activity' : page === 'My Submissions' ? '＋ New submission' : page === 'My Daily Activity' ? '＋ Add activity' : page === 'Review Queue' ? 'Review selected' : '＋ Create new';
  const handlePrimary = () => { if (page === 'Projects' && canCreateProject) openProjectForm(); else if (page === 'My Tasks' && canCreateTask) openTaskForm(); else if (page === 'My Tasks' || page === 'My Daily Activity') openModal('activity'); else if (page === 'My Submissions') openModal('submission'); else if (page === 'Review Queue') openModal('review'); else toast('Your workspace is up to date'); };
  function returnToProjectListing() {
    const target = getTransactionForPage(roleCode, 'Projects');
    setSelectedProjectId(undefined);
    setPage('Projects');
    setProjectCreateError(undefined);
    if (target) {
      setActiveModuleCode(target.module.module_code);
      setSelectedAction(target.transaction);
      window.history.pushState({}, '', `/transactions/${roleCode}/${target.module.module_code}/${target.transaction.transaction_code}`);
    } else {
      setSelectedAction(null);
    }
  }
  async function saveProject(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (projectCreateRequest.current) return;
    projectCreateRequest.current = true;
    setProjectCreateLoading(true);
    setProjectCreateError(undefined);
    const data = new FormData(e.currentTarget);
    try {
      const ownerId = import.meta.env.VITE_USER_ID?.trim();
      if (!ownerId) throw new Error('Authenticated user ID is unavailable. Configure VITE_USER_ID before creating a project.');

      const projectName = String(data.get('name') ?? '').trim();
      const selectedOwner = String(data.get('owner') ?? '').trim();
      const startDate = String(data.get('start') ?? '').trim();
      const endDate = String(data.get('end') ?? '').trim();
      if (!projectName || !startDate || !endDate) {
        throw new Error('Project name, start date, and target end date are required.');
      }
      if (selectedOwner !== ownerId) {
        throw new Error('The project owner must match the authenticated user.');
      }
      const isIsoDate = (value: string) =>
        /^\d{4}-\d{2}-\d{2}$/.test(value) &&
        !Number.isNaN(Date.parse(value)) &&
        new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
      if (!isIsoDate(startDate) || !isIsoDate(endDate)) {
        throw new Error('Start date and target end date must be valid dates in YYYY-MM-DD format.');
      }
      if (endDate < startDate) {
        throw new Error('Target end date cannot be earlier than the start date.');
      }

      const description = String(data.get('description') ?? '').trim();
      const priority = String(data.get('priority') ?? '').trim();
      const status = String(data.get('status') ?? '').trim();
      const department = String(data.get('team') ?? '').trim();
      const created = await projectService.createProjectApi({
        Project_Name: projectName,
        Project_Owner: ownerId,
        Start_Date: startDate,
        End_Date: endDate,
        ...(description ? { Project_Description: description } : {}),
        ...(priority ? { Priority: priority } : {}),
        ...(status ? { Project_Status: status } : {}),
        ...(department ? { Department: department } : {}),
      });

      returnToProjectListing();
      toast(`Project ${created.Project_Code} created successfully`);
    } catch (error) {
      setProjectCreateError(error instanceof Error ? error.message : 'Project creation failed unexpectedly.');
    } finally {
      projectCreateRequest.current = false;
      setProjectCreateLoading(false);
    }
  }
  function saveTask(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); const data = new FormData(e.currentTarget);
    const next=createTaskFromForm(data,`TSK-${1100+tasks.length}`,profile.fullName);
    setTasks(current=>[next,...current]); void taskService.create(next); setPage('My Tasks'); setSelectedAction(null); toast('Task created');
  }

  return <div className="app-shell">
    {inModule && sidebarOpen && <Sidebar brand={dashboardConfig.brand} version={dashboardConfig.version} copyrightYear={dashboardConfig.copyright_year} roleCode={roleCode} modules={visibleModules} page={page} selectedAction={selectedAction} onClose={closeSidebar} onModuleHome={openModule} onTransaction={openTransaction}/>}
    <div className="main-column">
      <Header brand={dashboardConfig.brand} portalName={dashboardConfig.portal_name} inModule={inModule} showGlobalSearch={page === 'Dashboard' || page === 'Module Dashboard'} sidebarOpen={sidebarOpen} role={role} profile={profile} roles={roles} query={globalSearchQuery} profileOpen={profileOpen} unreadNotifications={unreadNotifications} onToggleSidebar={toggleSidebar} onDashboard={() => go('Dashboard')} onQueryChange={setGlobalSearchQuery} onProfileToggle={() => setProfileOpen(!profileOpen)} onRoleSelect={code => { setRole(code); setProfileOpen(false); setGlobalSearchQuery(''); }} onModuleSelect={openModule} onTransactionSelect={(module, transaction) => openTransaction(module, transaction)} onNotificationsClick={() => { const target=getTransactionForPage(roleCode,'Notifications'); if(target) openModule(target.module); setNotifications(current=>current.map(notification=>({...notification,read:true}))); }}/>
      <main className="workspace" key={`${roleCode}-${page}-${selectedAction?.transaction_code ?? ''}`}>
        {page !== 'Dashboard' && !isProjectDetails && !isProjectMemberManagement && <div className={`page-heading${page === 'Module Dashboard' ? ' module-page-heading' : selectedAction ? ' transaction-page-heading' : ''}`}><div>{page !== 'Module Dashboard' && !selectedAction && <div className="eyebrow"><span className="eyebrow-dot"/> WORKSPACE OVERVIEW</div>}<h1>{title}<span className="heading-period">.</span></h1>{(page === 'Module Dashboard' || !selectedAction) && <p>{sub}</p>}</div><div className="heading-actions">{page !== 'Create Project' && page !== 'Create Task' && <button className="primary-btn" onClick={handlePrimary}>{primaryAction}<span>↗</span></button>}</div></div>}
        {page === 'Dashboard' && <>
          <RoleDashboard role={role} modules={homeModules} shortcuts={homeCards} onOpenModule={openModule}/>
        </>}
        {page === 'Module Dashboard' && activeModule && <ModuleTransactionDashboard roleCode={roleCode} module={activeModule} onSelect={openTransaction}/>}
        {page === 'Create Project' && <CreateProjectPage ownerId={import.meta.env.VITE_USER_ID?.trim() ?? ''} isSubmitting={projectCreateLoading} error={projectCreateError} onCancel={returnToProjectListing} onSubmit={saveProject} ownerPortal={roleCode === 'OWN' && selectedAction?.transaction_code === 'CP'}/ >}
        {page === 'Create Task' && <CreateTaskPage projects={projects} formData={activeTransactionData?.data.form} onCancel={() => { setPage('My Tasks'); setSelectedAction(null); }} onSubmit={saveTask}/ >}
        {page === 'Projects' && isProjectUpdate && <UpdateProjectPage projectId={selectedProjectId!} onBack={() => backToProjectUpdateListing()} onUpdated={backToProjectUpdateListing} ownerPortal={roleCode === 'OWN' && selectedAction?.transaction_code === 'UP'}/>}
        {page === 'Projects' && isProjectDetails && <ProjectDetailsPage projectId={selectedProjectId} projects={projects} tasks={tasks} onBack={backToProjects} ownerPortal={roleCode === 'OWN' && selectedAction?.transaction_code === 'VPD'}/>}
        {page === 'Projects' && isProjectMemberManagement && <ProjectMembersPage projects={projects} actorName={profile.fullName} onNotify={toast}/>}
        {page === 'Projects' && !isProjectDetails && !isProjectUpdate && !isProjectMemberManagement && <ProjectsPanel response={projectTrackerResponse?.BDOC_Response} isLoading={projectTrackerLoading} error={projectTrackerError} onSearch={searchProjectTracker} canCreate={Boolean(getTransactionForPage(roleCode, 'Create Project'))} isApiProjectTracker={selectedAction?.transaction_code === 'VOP' || selectedAction?.transaction_code === 'VPD' || isProjectUpdateTransaction} integrationLabel={isProjectUpdateTransaction ? 'Backend API · select a project to update' : undefined} onOpen={isProjectUpdateTransaction ? project => openProjectUpdate(project.Project_ID) : isProjectDetailsTransaction ? project => openProjectDetails(project.Project_ID) : undefined} open={() => getTransactionForPage(roleCode, 'Create Project') ? openProjectForm() : toast('Project details opened')} ownerPortal={roleCode === 'OWN' && selectedAction?.transaction_code === 'VOP'}/>}
        {page === 'My Tasks' && <TaskPanel rows={filteredTasks} query={query} setQuery={setQuery} statusFilter={taskStatus} setStatusFilter={setTaskStatus} priorityFilter={taskPriority} setPriorityFilter={setTaskPriority} pageNo={pageNo} setPageNo={setPageNo} updateTask={updateTask} canUpdateProgress={roleHasCapability(roleCode, 'task.progress.update')} />}
        {page !== 'Dashboard' && page !== 'Module Dashboard' && page !== 'Projects' && page !== 'My Tasks' && <section className="module-layout"><div className="module-main"><ModulePanel page={page} role={role} module={activeModule} transactionCode={selectedAction?.transaction_code??activeModule?.transactions[0]?.transaction_code??''} notifications={notifications} setNotifications={setNotifications} onAction={handlePrimary} onTransaction={openTransaction}/></div></section>}
      </main>
      <footer className="main-footer"><span>© {dashboardConfig.copyright_year} {dashboardConfig.brand}. All rights reserved.</span><span>Made for teams that move work forward <b>✦</b></span></footer>
    </div>
    {notice && <div className="toast" role="status"><span>✓</span>{notice}</div>}
    <div className={`itab-assistant ${assistantOpen ? 'is-fullscreen' : ''}`} aria-live="polite">
      {assistantOpen && <section className="itab-chat-panel" role="dialog" aria-modal="true" aria-label="ITAB AI assistant">
        <header className="itab-chat-header"><span className="itab-chat-logo"><img src="/itab-logo.png" alt=""/></span><div><b>ITAB Assistant</b><small><i/> Your iTASK workspace helper</small></div><button type="button" onClick={() => setAssistantOpen(false)} aria-label="Close assistant">×</button></header>
        {!assistantStarted ? <div className="itab-welcome-screen"><img src="/itab-logo.png" alt="iTAB"/><h1>Hey {profile.fullName.split(' ')[0]}, how can I help you today?</h1><form className="itab-chat-compose welcome-compose" onSubmit={event => { event.preventDefault(); askAssistant(); }}><input aria-label="Message ITAB" placeholder="Ask ITAB anything..." value={assistantDraft} onChange={event => setAssistantDraft(event.target.value)}/><button type="submit" aria-label="Send message" disabled={!assistantDraft.trim()}>↑</button></form></div> : <>
          <div className="itab-chat-body" role="log" aria-label="Conversation"><div className="itab-chat-date">TODAY</div>{assistantMessages.map((message, index) => <div className={`itab-message ${message.from}`} key={`${index}-${message.from}`}><span className="itab-message-avatar">{message.from === 'assistant' ? 'i' : initials(profile.fullName)}</span><p>{message.text}</p></div>)}</div>
          <form className="itab-chat-compose" onSubmit={event => { event.preventDefault(); askAssistant(); }}><input aria-label="Message ITAB" placeholder="Ask ITAB anything..." value={assistantDraft} onChange={event => setAssistantDraft(event.target.value)}/><button type="submit" aria-label="Send message" disabled={!assistantDraft.trim()}>↑</button><small>ITAB can make mistakes. Check important details.</small></form>
        </>}
      </section>}
      {!assistantOpen && <button type="button" className="itab-launcher" aria-label="Open ITAB assistant" aria-expanded={assistantOpen} onClick={() => setAssistantOpen(true)}><img src="/itab-logo.png" alt="ITAB AI"/><i className="itab-launcher-dot"/></button>}
    </div>
    {modal && <WorkspaceModal modal={modal} profile={profile} projects={projects} tasks={tasks} onClose={() => setModal(null)} onSubmit={handleCreate}/> }
        <span className="sr-only" aria-live="polite">{submitted?'Saved':''}</span>
    {initialLoading && <div className="startup-loader" aria-live="polite"><div className="q3" role="status" aria-label="Loading ITask">ITask</div></div>}
  </div>;
}
