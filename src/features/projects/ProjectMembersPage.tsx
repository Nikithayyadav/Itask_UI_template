import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Project } from './types';
import {
  createMockProjectMembers,
  createMockTeamActivity,
  organizationMembers,
  permissionsForProjectRole,
  PROJECT_MEMBER_ROLES,
  PROJECT_PERMISSIONS,
} from '../../services/resources/projectMembers';
import type {
  ProjectMember,
  ProjectMemberRole,
  ProjectMemberStatus,
  ProjectPermission,
  ProjectTeamActivity,
} from '../../services/resources/projectMembers';

const PAGE_SIZE = 8;
const STATUSES: ProjectMemberStatus[] = ['Active', 'Pending', 'Inactive', 'Suspended'];
type SortKey = 'name' | 'employeeId' | 'role' | 'department' | 'assignedDate' | 'lastActive' | 'status';
type MemberAction = 'View Details' | 'Edit Member' | 'Change Project Role' | 'Manage Permissions' | 'Resend Invitation' | 'Mark Invitation Accepted' | 'Deactivate Member' | 'Remove from Project';
type Confirmation = { member: ProjectMember; action: 'deactivate' | 'remove' };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function statusClass(status: string) {
  return status.toLowerCase();
}

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function ProjectMembersPage({
  projects,
  actorName,
  onNotify,
}: {
  projects: Project[];
  actorName: string;
  onNotify: (message: string) => void;
}) {
  const initialMembers = useMemo(() => createMockProjectMembers(projects), [projects]);
  const [membersByProject, setMembersByProject] = useState(initialMembers);
  const [activitiesByProject, setActivitiesByProject] = useState<Record<string, ProjectTeamActivity[]>>(
    () => Object.fromEntries(projects.map(project => [project.code, createMockTeamActivity(project.code)])),
  );
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.code ?? '');
  const [projectSelectOpen, setProjectSelectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'activity'>('members');
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');
  const [selectedOrganizationIds, setSelectedOrganizationIds] = useState<string[]>([]);
  const [addRole, setAddRole] = useState<ProjectMemberRole>('Contributor');
  const [addPermissions, setAddPermissions] = useState<ProjectPermission[]>(permissionsForProjectRole('Contributor'));
  const [invitationMessage, setInvitationMessage] = useState('');
  const [addError, setAddError] = useState('');
  const [drawerMemberId, setDrawerMemberId] = useState<string>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftMember, setDraftMember] = useState<ProjectMember>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [openActionId, setOpenActionId] = useState<string>();

  const selectedProject = projects.find(project => project.code === selectedProjectId);
  const members = membersByProject[selectedProjectId] ?? [];
  const drawerMember = members.find(member => member.id === drawerMemberId);
  const departments = [...new Set(members.map(member => member.department))].sort();
  const filteredProjects = projects.filter(project =>
    `${project.name} ${project.code} ${project.owner ?? ''} ${project.status}`.toLowerCase().includes(projectSearch.trim().toLowerCase()),
  );
  const filteredMembers = useMemo(() => members
    .filter(member => {
      const search = memberSearch.trim().toLowerCase();
      return (!search || `${member.name} ${member.email}`.toLowerCase().includes(search)) &&
        (!roleFilter || member.role === roleFilter) &&
        (!statusFilter || member.status === statusFilter) &&
        (!departmentFilter || member.department === departmentFilter);
    })
    .sort((left, right) => {
      const leftValue = String(left[sort.key]).toLowerCase();
      const rightValue = String(right[sort.key]).toLowerCase();
      return leftValue.localeCompare(rightValue, undefined, { numeric: true }) * (sort.direction === 'asc' ? 1 : -1);
    }), [departmentFilter, memberSearch, members, roleFilter, sort, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageMembers = filteredMembers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const summary = {
    total: members.length,
    active: members.filter(member => member.status === 'Active').length,
    pending: members.filter(member => member.status === 'Pending').length,
    inactive: members.filter(member => member.status === 'Inactive').length,
  };
  const activities = activitiesByProject[selectedProjectId] ?? [];
  const availableOrganizationMembers = organizationMembers.filter(person =>
    !members.some(member => member.employeeId === person.employeeId),
  );
  const directoryMembers = availableOrganizationMembers.filter(person =>
    `${person.name} ${person.email} ${person.employeeId} ${person.department}`.toLowerCase().includes(directorySearch.trim().toLowerCase()),
  );

  function recordActivity(description: string, type: ProjectTeamActivity['type']) {
    const activity: ProjectTeamActivity = {
      id: `${selectedProjectId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: selectedProjectId,
      description,
      actor: actorName,
      timestamp: new Date().toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' }),
      type,
    };
    setActivitiesByProject(current => ({
      ...current,
      [selectedProjectId]: [activity, ...(current[selectedProjectId] ?? [])],
    }));
  }

  function chooseProject(projectId: string) {
    setSelectedProjectId(projectId);
    setProjectSelectOpen(false);
    setProjectSearch('');
    setPage(1);
    setMemberSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setActiveTab('members');
    setDrawerMemberId(undefined);
  }

  function clearFilters() {
    setMemberSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setDepartmentFilter('');
    setPage(1);
  }

  function toggleSort(key: SortKey) {
    setSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  }

  function setMemberStatus(member: ProjectMember, status: ProjectMemberStatus) {
    setMembersByProject(current => ({
      ...current,
      [selectedProjectId]: (current[selectedProjectId] ?? []).map(item =>
        item.id === member.id ? { ...item, status } : item,
      ),
    }));
  }

  function startEditing(member: ProjectMember, focus?: 'role' | 'permissions') {
    setDrawerMemberId(member.id);
    setDraftMember({ ...member, permissions: [...member.permissions] });
    setEditorOpen(true);
    setOpenActionId(undefined);
    window.setTimeout(() => {
      if (focus === 'permissions') document.getElementById('member-permissions-heading')?.scrollIntoView({ behavior: 'smooth' });
      if (focus === 'role') document.getElementById('member-project-role')?.focus();
    }, 0);
  }

  function closeDrawer() {
    setDrawerMemberId(undefined);
    setEditorOpen(false);
    setDraftMember(undefined);
  }

  function saveMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draftMember) return;
    setMembersByProject(current => ({
      ...current,
      [selectedProjectId]: (current[selectedProjectId] ?? []).map(member =>
        member.id === draftMember.id ? draftMember : member,
      ),
    }));
    recordActivity(`${draftMember.name}'s project membership details or access permissions were updated.`, 'permission');
    setEditorOpen(false);
    setDraftMember(undefined);
    onNotify('Member details and project access updated.');
  }

  function updateDraftRole(role: ProjectMemberRole) {
    setDraftMember(current => current ? { ...current, role, permissions: permissionsForProjectRole(role) } : current);
  }

  function togglePermission(
    permission: ProjectPermission,
    current: ProjectPermission[],
    onChange: (permissions: ProjectPermission[]) => void,
  ) {
    onChange(current.includes(permission)
      ? current.filter(item => item !== permission)
      : [...current, permission]);
  }

  function toggleOrganizationMember(id: string) {
    setSelectedOrganizationIds(current => current.includes(id)
      ? current.filter(item => item !== id)
      : [...current, id]);
    setAddError('');
  }

  function openAddDialog() {
    setSelectedOrganizationIds([]);
    setDirectorySearch('');
    setAddRole('Contributor');
    setAddPermissions(permissionsForProjectRole('Contributor'));
    setInvitationMessage('');
    setAddError('');
    setAddOpen(true);
  }

  function addMembers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedPeople = availableOrganizationMembers.filter(person => selectedOrganizationIds.includes(person.id));
    if (!selectedPeople.length) {
      setAddError('Select at least one organization member to continue.');
      return;
    }
    const newMembers: ProjectMember[] = selectedPeople.map(person => ({
      id: `${selectedProjectId}-${person.id}`,
      projectId: selectedProjectId,
      name: person.name,
      email: person.email,
      employeeId: person.employeeId,
      designation: person.designation,
      role: addRole,
      department: person.department,
      assignedDate: new Date().toISOString().slice(0, 10),
      lastActive: 'Invitation sent',
      status: 'Pending',
      responsibilities: `Invited as ${addRole}.`,
      permissions: [...addPermissions],
      invitationMessage: invitationMessage.trim() || undefined,
    }));
    setMembersByProject(current => ({
      ...current,
      [selectedProjectId]: [...newMembers, ...(current[selectedProjectId] ?? [])],
    }));
    newMembers.forEach(member => recordActivity(`Invitation sent to ${member.name} as ${member.role}.`, 'invitation'));
    setAddOpen(false);
    setPage(1);
    onNotify(`${newMembers.length} member${newMembers.length === 1 ? '' : 's'} added. Invitations are pending${invitationMessage.trim() ? ' (message saved in mock data)' : ''}.`);
  }

  function performAction(member: ProjectMember, action: MemberAction) {
    setOpenActionId(undefined);
    if (action === 'View Details') {
      setDrawerMemberId(member.id);
      setEditorOpen(false);
      return;
    }
    if (action === 'Edit Member') {
      startEditing(member);
      return;
    }
    if (action === 'Change Project Role') {
      startEditing(member, 'role');
      return;
    }
    if (action === 'Manage Permissions') {
      startEditing(member, 'permissions');
      return;
    }
    if (action === 'Resend Invitation') {
      recordActivity(`Invitation resent to ${member.name}.`, 'invitation');
      onNotify(`Invitation resent to ${member.email}.`);
      return;
    }
    if (action === 'Mark Invitation Accepted') {
      setMembersByProject(current => ({
        ...current,
        [selectedProjectId]: (current[selectedProjectId] ?? []).map(item =>
          item.id === member.id ? { ...item, status: 'Active', lastActive: 'Just now' } : item,
        ),
      }));
      recordActivity(`${member.name} accepted the project invitation.`, 'member');
      onNotify(`${member.name}'s invitation was marked as accepted (demo).`);
      return;
    }
    setConfirmation({ member, action: action === 'Deactivate Member' ? 'deactivate' : 'remove' });
  }

  function confirmAction() {
    if (!confirmation) return;
    const { member, action } = confirmation;
    if (action === 'deactivate') {
      setMemberStatus(member, 'Inactive');
      recordActivity(`${member.name} was deactivated on this project.`, 'access');
      onNotify(`${member.name} was deactivated.`);
    } else {
      setMembersByProject(current => ({
        ...current,
        [selectedProjectId]: (current[selectedProjectId] ?? []).filter(item => item.id !== member.id),
      }));
      recordActivity(`${member.name} was removed from the project.`, 'access');
      if (drawerMemberId === member.id) closeDrawer();
      onNotify(`${member.name} was removed from this project.`);
    }
    setConfirmation(undefined);
  }

  function resendSelectedInvitation(member: ProjectMember) {
    recordActivity(`Invitation resent to ${member.name}.`, 'invitation');
    onNotify(`Invitation resent to ${member.email}.`);
  }

  return <section className="mpm-page">
    <div className="mpm-page-heading">
      <div className="mpm-breadcrumb"><span>Owner Workspace</span><i>/</i><span>Project Tracker</span><i>/</i><b>Manage Project Members</b></div>
      <div className="mpm-title-row">
        <div><h1>Manage Project Members</h1><p>Manage your project team, responsibilities and access.</p></div>
        <button type="button" className="primary-btn mpm-add-primary" disabled={!selectedProject} onClick={openAddDialog}><span>＋</span> Add Member</button>
      </div>
    </div>

    {projects.length === 0 ? <div className="mpm-empty-projects">
      <span>▧</span><h2>No projects available</h2><p>Projects available to the Owner role will appear here.</p>
    </div> : <>
      <div className="mpm-project-bar">
        <div className="mpm-project-picker">
          <label htmlFor="mpm-project-button">Project</label>
          <button id="mpm-project-button" type="button" className="mpm-project-select" aria-expanded={projectSelectOpen} onClick={() => setProjectSelectOpen(open => !open)}>
            <span className="mpm-project-icon">▦</span>
            <span className="mpm-project-selected">
              <b>{selectedProject?.name ?? 'Select a project'}</b>
              <small>{selectedProject?.code ?? 'Choose a project to manage its team'}</small>
            </span>
            <span className="mpm-project-chevron">{projectSelectOpen ? '⌃' : '⌄'}</span>
          </button>
          {projectSelectOpen && <div className="mpm-project-menu">
            <input autoFocus type="search" aria-label="Search projects" placeholder="Search projects..." value={projectSearch} onChange={event => setProjectSearch(event.target.value)}/>
            <div className="mpm-project-options">{filteredProjects.map(project => <button key={project.code} type="button" onClick={() => chooseProject(project.code)}>
              <span><b>{project.name}</b><small>{project.code} · {project.owner ?? 'Project owner'}</small></span>
              <span className={`mpm-status-badge mpm-status-${statusClass(project.status)}`}>{project.status}</span>
            </button>)}
              {!filteredProjects.length && <p>No matching projects.</p>}
            </div>
          </div>}
        </div>
        <div className="mpm-project-meta"><small>PROJECT STATUS</small><span className={`mpm-status-badge mpm-status-${statusClass(selectedProject?.status ?? '')}`}>{selectedProject?.status ?? '—'}</span></div>
        <div className="mpm-project-meta mpm-owner-meta"><small>PROJECT OWNER</small><b>{selectedProject?.owner ?? 'Project Owner'}</b></div>
      </div>

      <div className="mpm-summary-grid">
        <SummaryCard label="Total members" value={summary.total} icon="♧" accent="blue"/>
        <SummaryCard label="Active members" value={summary.active} icon="✓" accent="green"/>
        <SummaryCard label="Pending invitations" value={summary.pending} icon="◷" accent="orange"/>
        <SummaryCard label="Inactive members" value={summary.inactive} icon="−" accent="slate"/>
      </div>

      <div className="mpm-team-card">
        <div className="mpm-team-heading">
          <div><h2>Project team</h2><p>People, responsibilities and access for <b>{selectedProject?.name}</b></p></div>
          <div className="mpm-team-count"><span>{summary.total}</span> member{summary.total === 1 ? '' : 's'}</div>
        </div>
        <div className="mpm-tabs" role="tablist" aria-label="Project team views">
          <button type="button" role="tab" aria-selected={activeTab === 'members'} className={activeTab === 'members' ? 'active' : ''} onClick={() => setActiveTab('members')}>Members <span>{summary.total}</span></button>
          <button type="button" role="tab" aria-selected={activeTab === 'activity'} className={activeTab === 'activity' ? 'active' : ''} onClick={() => setActiveTab('activity')}>Team activity</button>
        </div>

        {activeTab === 'members' ? <>
          <div className="mpm-toolbar">
            <label className="mpm-member-search"><span aria-hidden="true">⌕</span><input aria-label="Search members" placeholder="Search name or email..." value={memberSearch} onChange={event => { setMemberSearch(event.target.value); setPage(1); }}/></label>
            <label><span className="sr-only">Filter by project role</span><select value={roleFilter} onChange={event => { setRoleFilter(event.target.value); setPage(1); }}><option value="">All project roles</option>{PROJECT_MEMBER_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
            <label><span className="sr-only">Filter by membership status</span><select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); }}><option value="">All statuses</option>{STATUSES.map(status => <option key={status}>{status}</option>)}</select></label>
            <label><span className="sr-only">Filter by department</span><select value={departmentFilter} onChange={event => { setDepartmentFilter(event.target.value); setPage(1); }}><option value="">All departments</option>{departments.map(department => <option key={department}>{department}</option>)}</select></label>
            <button type="button" className="mpm-clear-filters" onClick={clearFilters}>Clear filters</button>
          </div>

          <div className="mpm-table-scroll"><table className="mpm-member-table">
            <thead><tr>
              <SortHeading label="Member" field="name" sort={sort} onSort={toggleSort}/>
              <SortHeading label="Employee ID" field="employeeId" sort={sort} onSort={toggleSort}/>
              <th>Designation</th>
              <SortHeading label="Project role" field="role" sort={sort} onSort={toggleSort}/>
              <SortHeading label="Department" field="department" sort={sort} onSort={toggleSort}/>
              <SortHeading label="Assigned date" field="assignedDate" sort={sort} onSort={toggleSort}/>
              <SortHeading label="Last active" field="lastActive" sort={sort} onSort={toggleSort}/>
              <SortHeading label="Status" field="status" sort={sort} onSort={toggleSort}/>
              <th><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody>{pageMembers.map(member => <tr key={member.id}>
              <td><button type="button" className="mpm-member-identity" onClick={() => performAction(member, 'View Details')}>
                <span className="mpm-avatar">{initials(member.name)}</span><span><b>{member.name}</b><small>{member.email}</small></span>
              </button></td>
              <td className="mpm-employee-id">{member.employeeId}</td>
              <td>{member.designation}</td>
              <td><span className="mpm-role-label">{member.role}</span></td>
              <td>{member.department}</td>
              <td>{formatDate(member.assignedDate)}</td>
              <td>{member.lastActive}</td>
              <td><span className={`mpm-status-badge mpm-status-${statusClass(member.status)}`}><i/>{member.status}</span></td>
              <td className="mpm-action-cell"><div className="mpm-action-wrap">
                <button type="button" className="mpm-more-button" aria-label={`Actions for ${member.name}`} aria-expanded={openActionId === member.id} onClick={() => setOpenActionId(current => current === member.id ? undefined : member.id)}>•••</button>
                {openActionId === member.id && <div className="mpm-action-menu">
                  {(['View Details', 'Edit Member', 'Change Project Role', 'Manage Permissions'] as MemberAction[]).map(action => <button type="button" key={action} onClick={() => performAction(member, action)}>{action}</button>)}
                  {member.status === 'Pending' && <>
                    <button type="button" onClick={() => performAction(member, 'Resend Invitation')}>Resend Invitation</button>
                    <button type="button" onClick={() => performAction(member, 'Mark Invitation Accepted')}>Mark invitation accepted</button>
                  </>}
                  {member.status === 'Active' && <button type="button" onClick={() => performAction(member, 'Deactivate Member')}>Deactivate Member</button>}
                  <button type="button" className="danger-action" onClick={() => performAction(member, 'Remove from Project')}>Remove from Project</button>
                </div>}
              </div></td>
            </tr>)}</tbody>
          </table></div>
          {!filteredMembers.length && <div className="mpm-empty-results"><span>⌕</span><b>No team members match these filters</b><p>Try a different search or clear the selected filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>}
          {!!filteredMembers.length && <div className="mpm-pagination">
            <span>Showing <b>{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredMembers.length)}</b> of <b>{filteredMembers.length}</b> members</span>
            <div><button type="button" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>‹</button><span>Page <b>{currentPage}</b> of {pageCount}</span><button type="button" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>›</button></div>
          </div>}
        </> : <div className="mpm-activity-list">
          {activities.map(activity => <article className="mpm-activity-item" key={activity.id}>
            <span className={`mpm-activity-icon mpm-activity-${activity.type}`}>{activity.type === 'role' ? '↗' : activity.type === 'invitation' ? '✉' : activity.type === 'permission' ? '⌑' : activity.type === 'access' ? '−' : '+'}</span>
            <div><p>{activity.description}</p><small><b>{activity.actor}</b><i/>{activity.timestamp}</small></div>
          </article>)}
          {!activities.length && <div className="mpm-empty-results"><b>No team activity yet</b><p>Changes to this project's membership will appear here.</p></div>}
        </div>}
      </div>
    </>}

    {addOpen && selectedProject && <div className="mpm-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setAddOpen(false); }}>
      <form className="mpm-add-modal" role="dialog" aria-modal="true" aria-labelledby="mpm-add-title" onSubmit={addMembers}>
        <div className="mpm-modal-header"><div><span className="mpm-kicker">PROJECT TEAM</span><h2 id="mpm-add-title">Add project members</h2><p>Invite organization members to {selectedProject.name}.</p></div><button type="button" className="mpm-close" aria-label="Close dialog" onClick={() => setAddOpen(false)}>×</button></div>
        <div className="mpm-modal-body">
          <label className="mpm-form-label">Find organization members<input type="search" placeholder="Search by name, email or employee ID..." value={directorySearch} onChange={event => setDirectorySearch(event.target.value)}/></label>
          <div className="mpm-directory-list" aria-label="Available organization members">
            {directoryMembers.map(person => <label className={`mpm-directory-person ${selectedOrganizationIds.includes(person.id) ? 'selected' : ''}`} key={person.id}>
              <input type="checkbox" checked={selectedOrganizationIds.includes(person.id)} onChange={() => toggleOrganizationMember(person.id)}/>
              <span className="mpm-avatar">{initials(person.name)}</span><span className="mpm-directory-person-copy"><b>{person.name}</b><small>{person.email} · {person.employeeId}</small></span><span className="mpm-directory-department">{person.department}</span>
            </label>)}
            {!directoryMembers.length && <div className="mpm-directory-empty">No available organization members match your search.</div>}
          </div>
          <p className="mpm-selected-count">{selectedOrganizationIds.length} selected</p>
          <div className="mpm-add-grid">
            <label className="mpm-form-label">Project role<select value={addRole} onChange={event => { const role = event.target.value as ProjectMemberRole; setAddRole(role); setAddPermissions(permissionsForProjectRole(role)); }}>{PROJECT_MEMBER_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
            <label className="mpm-form-label">Invitation message <span>Optional</span><textarea rows={2} placeholder="Add a note to your invitation..." value={invitationMessage} onChange={event => setInvitationMessage(event.target.value)}/></label>
          </div>
          <PermissionChecklist permissions={addPermissions} onChange={next => setAddPermissions(next)} heading={`Default access for ${addRole}`} onToggle={permission => togglePermission(permission, addPermissions, setAddPermissions)}/>
          {addError && <p className="mpm-validation" role="alert">{addError}</p>}
        </div>
        <div className="mpm-modal-actions"><button type="button" className="secondary-btn" onClick={() => setAddOpen(false)}>Cancel</button><button type="submit" className="primary-btn" disabled={!selectedOrganizationIds.length}>Add {selectedOrganizationIds.length || ''} Member{selectedOrganizationIds.length === 1 ? '' : 's'}<span>→</span></button></div>
      </form>
    </div>}

    {drawerMember && <div className="mpm-drawer-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) closeDrawer(); }}>
      <aside className="mpm-member-drawer" role="dialog" aria-modal="true" aria-labelledby="mpm-drawer-name">
        <div className="mpm-drawer-top"><span className="mpm-kicker">{editorOpen ? 'EDIT PROJECT ACCESS' : 'MEMBER PROFILE'}</span><button type="button" className="mpm-close" onClick={closeDrawer} aria-label="Close member details">×</button></div>
        <div className="mpm-drawer-profile"><span className="mpm-avatar mpm-avatar-large">{initials(drawerMember.name)}</span><div><h2 id="mpm-drawer-name">{drawerMember.name}</h2><p>{drawerMember.designation}</p><span className={`mpm-status-badge mpm-status-${statusClass(drawerMember.status)}`}><i/>{drawerMember.status}</span></div></div>
        {drawerMember.status === 'Pending' && !editorOpen && <button type="button" className="mpm-resend-inline" onClick={() => resendSelectedInvitation(drawerMember)}>↻ Resend invitation</button>}

        {editorOpen && draftMember ? <form className="mpm-edit-form" onSubmit={saveMember}>
          <h3>Profile information</h3>
          <label className="mpm-form-label">Full name<input required value={draftMember.name} onChange={event => setDraftMember({ ...draftMember, name: event.target.value })}/></label>
          <label className="mpm-form-label">Email address<input required type="email" value={draftMember.email} onChange={event => setDraftMember({ ...draftMember, email: event.target.value })}/></label>
          <div className="mpm-edit-fields-two">
            <label className="mpm-form-label">Employee ID<input required value={draftMember.employeeId} onChange={event => setDraftMember({ ...draftMember, employeeId: event.target.value })}/></label>
            <label className="mpm-form-label">Department<input required value={draftMember.department} onChange={event => setDraftMember({ ...draftMember, department: event.target.value })}/></label>
          </div>
          <label className="mpm-form-label">Designation<input required value={draftMember.designation} onChange={event => setDraftMember({ ...draftMember, designation: event.target.value })}/></label>
          <label className="mpm-form-label">Project role<select id="member-project-role" value={draftMember.role} onChange={event => updateDraftRole(event.target.value as ProjectMemberRole)}>{PROJECT_MEMBER_ROLES.map(role => <option key={role}>{role}</option>)}</select></label>
          <label className="mpm-form-label">Responsibilities<textarea rows={2} value={draftMember.responsibilities} onChange={event => setDraftMember({ ...draftMember, responsibilities: event.target.value })}/></label>
          <PermissionChecklist heading="Project permissions" permissions={draftMember.permissions} onChange={next => setDraftMember(current => current ? { ...current, permissions: next } : current)} onToggle={permission => togglePermission(permission, draftMember.permissions, next => setDraftMember(current => current ? { ...current, permissions: next } : current))}/>
          <div className="mpm-drawer-actions"><button type="button" className="secondary-btn" onClick={() => { setEditorOpen(false); setDraftMember(undefined); }}>Cancel</button><button type="submit" className="primary-btn">Save changes<span>✓</span></button></div>
        </form> : <>
          <section className="mpm-drawer-section"><h3>Profile information</h3><Detail label="Email address" value={drawerMember.email}/><Detail label="Employee ID" value={drawerMember.employeeId}/><Detail label="Department" value={drawerMember.department}/><Detail label="Designation" value={drawerMember.designation}/></section>
          <section className="mpm-drawer-section"><h3>Project membership</h3><Detail label="Project role" value={drawerMember.role}/><Detail label="Status" value={drawerMember.status}/><Detail label="Assigned date" value={formatDate(drawerMember.assignedDate)}/><Detail label="Last active" value={drawerMember.lastActive}/></section>
          {drawerMember.invitationMessage && <section className="mpm-drawer-section"><h3>Invitation message</h3><p className="mpm-responsibility">{drawerMember.invitationMessage}</p></section>}
          <section className="mpm-drawer-section"><h3>Responsibilities</h3><p className="mpm-responsibility">{drawerMember.responsibilities}</p></section>
          <section className="mpm-drawer-section"><h3>Access permissions</h3><ul className="mpm-permission-summary">{drawerMember.permissions.map(permission => <li key={permission}><span>✓</span>{permission}</li>)}</ul>{!drawerMember.permissions.length && <p className="mpm-no-permissions">No project permissions assigned.</p>}</section>
          <div className="mpm-drawer-actions"><button type="button" className="secondary-btn" onClick={() => startEditing(drawerMember)}>Edit member</button><button type="button" className="primary-btn" onClick={() => startEditing(drawerMember, 'role')}>Manage role & access<span>→</span></button></div>
        </>}
      </aside>
    </div>}

    {confirmation && <div className="mpm-overlay mpm-confirm-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setConfirmation(undefined); }}>
      <section className="mpm-confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="mpm-confirm-title" aria-describedby="mpm-confirm-copy">
        <span className="mpm-confirm-icon">{confirmation.action === 'remove' ? '!' : '−'}</span>
        <h2 id="mpm-confirm-title">{confirmation.action === 'remove' ? 'Remove member from project?' : 'Deactivate project member?'}</h2>
        <p id="mpm-confirm-copy">{confirmation.action === 'remove'
          ? `${confirmation.member.name} will lose access to ${selectedProject?.name}. This cannot be undone.`
          : `${confirmation.member.name} will be marked inactive and lose project access.`}</p>
        <div className="mpm-modal-actions"><button type="button" className="secondary-btn" onClick={() => setConfirmation(undefined)}>Cancel</button><button type="button" className="mpm-destructive-button" onClick={confirmAction}>{confirmation.action === 'remove' ? 'Remove member' : 'Deactivate member'}</button></div>
      </section>
    </div>}
  </section>;
}

function SummaryCard({ label, value, icon, accent }: { label: string; value: number; icon: string; accent: string }) {
  return <article className="mpm-summary-card"><span className={`mpm-summary-icon ${accent}`}>{icon}</span><div><small>{label}</small><b>{value}</b></div></article>;
}

function SortHeading({
  label,
  field,
  sort,
  onSort,
}: {
  label: string;
  field: SortKey;
  sort: { key: SortKey; direction: 'asc' | 'desc' };
  onSort: (key: SortKey) => void;
}) {
  return <th aria-sort={sort.key === field ? sort.direction === 'asc' ? 'ascending' : 'descending' : 'none'}>
    <button type="button" onClick={() => onSort(field)}>{label}{sort.key === field && <span>{sort.direction === 'asc' ? ' ↑' : ' ↓'}</span>}</button>
  </th>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="mpm-detail-row"><small>{label}</small><b>{value || '—'}</b></div>;
}

function PermissionChecklist({
  heading,
  permissions,
  onChange,
  onToggle,
}: {
  heading: string;
  permissions: ProjectPermission[];
  onChange: (permissions: ProjectPermission[]) => void;
  onToggle: (permission: ProjectPermission) => void;
}) {
  return <section className="mpm-permission-editor"><div><h3 id={heading === 'Project permissions' ? 'member-permissions-heading' : undefined}>{heading}</h3><small>{permissions.length} of {PROJECT_PERMISSIONS.length} enabled</small></div>
    <div className="mpm-permission-grid">{PROJECT_PERMISSIONS.map(permission => <label key={permission}>
      <input type="checkbox" checked={permissions.includes(permission)} onChange={() => onToggle(permission)}/><span>{permission}</span>
    </label>)}</div>
    {permissions.length > 0 && <button type="button" className="mpm-reset-permissions" onClick={() => onChange([])}>Clear permissions</button>}
  </section>;
}
