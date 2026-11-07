
import type { Project } from '../../features/projects/types';
import type { Task } from '../../features/tasks/types';
import type {
  ProjectDetailTask,
  ProjectActivity,
  ProjectDetailsProject,
  ProjectDetailsResponse,
  ProjectDocument,
  ProjectMilestone,
  ProjectTeamMember,
} from '../../features/projects/types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export type ProjectDetailsAdapter = (
  projectId: string,
  projects: Project[],
  tasks: Task[],
) => Promise<ProjectDetailsResponse | undefined>;

const projectDetailsApiAdapter: ProjectDetailsAdapter = async (projectId) => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, '');

  if (!baseUrl) {
    throw new Error(
      'Project Details API is not configured. Set VITE_API_BASE_URL.',
    );
  }

  if (!projectId.trim()) {
    throw new Error('A valid Project ID is required.');
  }

  const response = await fetch(
    `${baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Project Details API returned a non-JSON response (HTTP ${response.status}).`,
    );
  }

  if (!isRecord(payload) || !isRecord(payload.BDOC_Response)) {
    throw new Error(
      `Project Details API returned an invalid response (HTTP ${response.status}).`,
    );
  }

  const bdocResponse = payload.BDOC_Response;
  const header = isRecord(bdocResponse.Header)
    ? bdocResponse.Header
    : undefined;

  if (!response.ok || header?.Status === 'FAILED') {
    throw new Error(
      readString(header?.Message) ||
      `Project Details request failed (HTTP ${response.status}).`,
    );
  }

  if (header?.Status !== 'SUCCESS') {
    throw new Error(
      readString(header?.Message, 'Project Details request was unsuccessful.'),
    );
  }

  const data = isRecord(bdocResponse.Data)
    ? bdocResponse.Data
    : undefined;

  const items = data?.Item;

  if (!Array.isArray(items) || !isRecord(items[0])) {
    throw new Error('Project Details API did not return a project record.');
  }

  const item = items[0];

  const project: ProjectDetailsProject = {
    Project_ID: readString(item.Project_ID, projectId),
    Project_Code: readString(item.Project_Code),
    Project_Name: readString(item.Project_Name),
    Project_Description: readString(item.Project_Description),
    Project_Status: readString(item.Project_Status),
    Priority: readString(item.Priority),
    Project_Type: readString(item.Project_Type),
    Project_Owner_Name: readString(item.Project_Owner_Name),
    Project_Manager_Name: readString(item.Project_Manager_Name),
    Client_Name: readString(item.Client_Name),
    Department: readString(item.Department),
    Start_Date: readString(item.Start_Date),
    End_Date: readString(item.End_Date),
    Health_Status: readString(item.Health_Status),
    Progress_Percentage: readNumber(item.Progress_Percentage),
    Total_Tasks: readNumber(item.Total_Tasks),
    Completed_Tasks: readNumber(item.Completed_Tasks),
    Overdue_Tasks: readNumber(item.Overdue_Tasks),
    ...(typeof item.Project_Owner === 'string' ? { Project_Owner: item.Project_Owner } : {}),
    ...(typeof item.Project_Objective === 'string' ? { Project_Objective: item.Project_Objective } : {}),
    ...(typeof item.Project_Scope === 'string' ? { Project_Scope: item.Project_Scope } : {}),
    ...(typeof item.External_Reference === 'string' ? { External_Reference: item.External_Reference } : {}),
    ...(typeof item.Project_Manager === 'string' ? { Project_Manager: item.Project_Manager } : {}),
    ...(typeof item.Client_ID === 'string' ? { Client_ID: item.Client_ID } : {}),
    ...(typeof item.Parent_Project_ID === 'string' || item.Parent_Project_ID === null
      ? { Parent_Project_ID: item.Parent_Project_ID }
      : {}),
    ...(typeof item.Risk_Level === 'string' ? { Risk_Level: item.Risk_Level } : {}),
    ...(typeof item.Confidentiality_Level === 'string'
      ? { Confidentiality_Level: item.Confidentiality_Level }
      : {}),
    ...(typeof item.Display_Label === 'string' ? { Display_Label: item.Display_Label } : {}),
    ...(typeof item.Business_Unit === 'string' ? { Business_Unit: item.Business_Unit } : {}),
    ...(typeof item.Remarks === 'string' ? { Remarks: item.Remarks } : {}),
  };

  return {
    Project: project,
    Tasks: [] as ProjectDetailTask[],
    Team: [] as ProjectTeamMember[],
    Milestones: [] as ProjectMilestone[],
    Documents: [] as ProjectDocument[],
    Activity: [] as ProjectActivity[],
  };
};

let projectDetailsAdapter = projectDetailsApiAdapter;

export function configureProjectDetailsAdapter(
  adapter: ProjectDetailsAdapter,
) {
  projectDetailsAdapter = adapter;
}

export const projectDetailsService = {
  getByProjectId: (
    projectId: string,
    projects: Project[],
    tasks: Task[],
  ) => projectDetailsAdapter(projectId, projects, tasks),
};
