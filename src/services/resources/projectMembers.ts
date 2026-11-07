import type { Project } from '../../features/projects/types';

export const PROJECT_MEMBER_ROLES = [
  'Project Manager',
  'Team Lead',
  'Developer',
  'Reviewer',
  'Contributor',
  'Viewer',
] as const;

export type ProjectMemberRole = typeof PROJECT_MEMBER_ROLES[number];
export type ProjectMemberStatus = 'Active' | 'Pending' | 'Inactive' | 'Suspended';
export type ProjectPermission =
  | 'View project information'
  | 'View assigned tasks'
  | 'Create tasks'
  | 'Update tasks'
  | 'Submit work'
  | 'Review submissions'
  | 'Upload documents'
  | 'View project reports'
  | 'Manage team members';

export const PROJECT_PERMISSIONS: ProjectPermission[] = [
  'View project information',
  'View assigned tasks',
  'Create tasks',
  'Update tasks',
  'Submit work',
  'Review submissions',
  'Upload documents',
  'View project reports',
  'Manage team members',
];

export interface ProjectMember {
  id: string;
  projectId: string;
  name: string;
  email: string;
  employeeId: string;
  designation: string;
  role: ProjectMemberRole;
  department: string;
  assignedDate: string;
  lastActive: string;
  status: ProjectMemberStatus;
  responsibilities: string;
  permissions: ProjectPermission[];
  invitationMessage?: string;
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  employeeId: string;
  department: string;
  designation: string;
}

export interface ProjectTeamActivity {
  id: string;
  projectId: string;
  description: string;
  actor: string;
  timestamp: string;
  type: 'member' | 'role' | 'invitation' | 'permission' | 'access';
}

const rolePermissions: Record<ProjectMemberRole, ProjectPermission[]> = {
  'Project Manager': [...PROJECT_PERMISSIONS],
  'Team Lead': [
    'View project information', 'View assigned tasks', 'Create tasks', 'Update tasks',
    'Submit work', 'Review submissions', 'Upload documents', 'View project reports',
  ],
  Developer: ['View project information', 'View assigned tasks', 'Update tasks', 'Submit work', 'Upload documents'],
  Reviewer: ['View project information', 'View assigned tasks', 'Review submissions', 'View project reports'],
  Contributor: ['View project information', 'View assigned tasks', 'Update tasks', 'Submit work'],
  Viewer: ['View project information', 'View assigned tasks'],
};

export function permissionsForProjectRole(role: ProjectMemberRole): ProjectPermission[] {
  return [...rolePermissions[role]];
}

export const organizationMembers: OrganizationMember[] = [
  { id: 'EMP-1001', name: 'Nikitha Reddy', email: 'nikitha.reddy@biztab.com', employeeId: 'EMP-1001', department: 'Engineering', designation: 'Senior Software Engineer' },
  { id: 'EMP-1002', name: 'Arjun Mehta', email: 'arjun.mehta@biztab.com', employeeId: 'EMP-1002', department: 'Engineering', designation: 'Engineering Lead' },
  { id: 'EMP-1003', name: 'Priya Sharma', email: 'priya.sharma@biztab.com', employeeId: 'EMP-1003', department: 'Product', designation: 'Product Manager' },
  { id: 'EMP-1004', name: 'Karthik Rao', email: 'karthik.rao@biztab.com', employeeId: 'EMP-1004', department: 'Engineering', designation: 'Software Engineer' },
  { id: 'EMP-1005', name: 'Meera Iyer', email: 'meera.iyer@biztab.com', employeeId: 'EMP-1005', department: 'Quality Assurance', designation: 'QA Analyst' },
  { id: 'EMP-1006', name: 'Dev Patel', email: 'dev.patel@biztab.com', employeeId: 'EMP-1006', department: 'Design', designation: 'UX Designer' },
  { id: 'EMP-1007', name: 'Ananya Bose', email: 'ananya.bose@biztab.com', employeeId: 'EMP-1007', department: 'Finance', designation: 'Finance Analyst' },
  { id: 'EMP-1008', name: 'Rahul Nair', email: 'rahul.nair@biztab.com', employeeId: 'EMP-1008', department: 'Operations', designation: 'Operations Specialist' },
  { id: 'EMP-1009', name: 'Sana Khan', email: 'sana.khan@biztab.com', employeeId: 'EMP-1009', department: 'Data & Analytics', designation: 'Data Analyst' },
  { id: 'EMP-1010', name: 'Vikram Das', email: 'vikram.das@biztab.com', employeeId: 'EMP-1010', department: 'Engineering', designation: 'Technical Architect' },
  { id: 'EMP-1011', name: 'Aisha Thomas', email: 'aisha.thomas@biztab.com', employeeId: 'EMP-1011', department: 'People & Culture', designation: 'People Partner' },
  { id: 'EMP-1012', name: 'Rohan Gupta', email: 'rohan.gupta@biztab.com', employeeId: 'EMP-1012', department: 'Quality Assurance', designation: 'QA Engineer' },
  { id: 'EMP-1013', name: 'Ishita Sen', email: 'ishita.sen@biztab.com', employeeId: 'EMP-1013', department: 'Product', designation: 'Business Analyst' },
  { id: 'EMP-1014', name: 'Aditya Kulkarni', email: 'aditya.kulkarni@biztab.com', employeeId: 'EMP-1014', department: 'Engineering', designation: 'Software Engineer' },
  { id: 'EMP-1015', name: 'Nisha Menon', email: 'nisha.menon@biztab.com', employeeId: 'EMP-1015', department: 'Design', designation: 'Product Designer' },
  { id: 'EMP-1016', name: 'Kabir Joshi', email: 'kabir.joshi@biztab.com', employeeId: 'EMP-1016', department: 'Operations', designation: 'Project Coordinator' },
];

const rolesByMember: ProjectMemberRole[] = [
  'Project Manager', 'Team Lead', 'Developer', 'Reviewer', 'Contributor', 'Viewer',
];
const statusesByMember: ProjectMemberStatus[] = [
  'Active', 'Active', 'Active', 'Active', 'Pending', 'Inactive', 'Suspended',
];
const responsibilities = [
  'Coordinates delivery milestones and stakeholder updates.',
  'Guides technical execution and unblocks the project team.',
  'Builds and maintains project deliverables.',
  'Validates quality and reviews submitted work.',
  'Contributes to assigned work and keeps tasks current.',
  'Provides project visibility to business stakeholders.',
];

export function createMockProjectMembers(projects: Project[]): Record<string, ProjectMember[]> {
  return Object.fromEntries(projects.map((project, projectIndex) => {
    const memberCount = 5 + projectIndex % 2;
    const records = Array.from({ length: memberCount }, (_, index) => {
      const person = organizationMembers[(projectIndex * 3 + index) % organizationMembers.length];
      const role = rolesByMember[index % rolesByMember.length];
      const status = statusesByMember[index % statusesByMember.length];
      return {
        id: `${project.code}-${person.id}`,
        projectId: project.code,
        name: person.name,
        email: person.email,
        employeeId: person.employeeId,
        designation: person.designation,
        role,
        department: person.department,
        assignedDate: `2026-${String(1 + ((projectIndex + index) % 9)).padStart(2, '0')}-${String(5 + index * 2).padStart(2, '0')}`,
        lastActive: status === 'Pending' ? 'Invitation sent' : status === 'Inactive' ? '12 days ago' : status === 'Suspended' ? '19 days ago' : `${index + 1}h ago`,
        status,
        responsibilities: responsibilities[index % responsibilities.length],
        permissions: permissionsForProjectRole(role),
      } satisfies ProjectMember;
    });
    return [project.code, records];
  }));
}

export function createMockTeamActivity(projectId: string): ProjectTeamActivity[] {
  return [
    { id: `${projectId}-activity-1`, projectId, description: 'Nikitha Reddy was added to the project.', actor: 'You', timestamp: 'Today, 10:42 AM', type: 'member' },
    { id: `${projectId}-activity-2`, projectId, description: 'Project role changed from Contributor to Team Lead.', actor: 'You', timestamp: 'Yesterday, 4:18 PM', type: 'role' },
    { id: `${projectId}-activity-3`, projectId, description: 'Invitation sent to a new team member.', actor: 'You', timestamp: 'Yesterday, 11:06 AM', type: 'invitation' },
    { id: `${projectId}-activity-4`, projectId, description: 'Member permissions updated for task delivery.', actor: 'Priya Sharma', timestamp: '04 Nov 2026, 2:30 PM', type: 'permission' },
    { id: `${projectId}-activity-5`, projectId, description: 'A team member was removed from the project.', actor: 'You', timestamp: '02 Nov 2026, 9:15 AM', type: 'access' },
  ];
}
