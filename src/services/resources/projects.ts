import { API_BASE_URL, api } from '../api';
import type {
  Project,
  ProjectTrackerFilter,
  ProjectTrackerItem,
  ProjectTrackerPaginationRequest,
  ProjectTrackerRequest,
  ProjectTrackerResponse,
  ProjectTrackerSort,
  ProjectTrackerSummary,
} from '../../features/projects/types';

export interface ProjectTrackerRequestMetadata {
  Request_ID: string;
  Correlation_ID: string;
  Organization_ID: string;
  User_ID: string;
}

export interface ProjectTrackerSearch {
  Filter: ProjectTrackerFilter;
  Pagination: ProjectTrackerPaginationRequest;
  Sorting: ProjectTrackerSort[];
}

export interface ProjectCreateItem {
  Project_Name: string;
  Project_Owner: string;
  Start_Date: string;
  End_Date: string;
  Project_Description?: string;
  Priority?: string;
  Project_Status?: string;
  Department?: string;
}

export interface CreatedProjectRecord {
  Project_ID: string;
  Project_Code: string;
  Project_Status: string;
  Created_By: string;
  Created_Date: string;
}

export interface ProjectUpdateItem {
  Project_ID: string;
  Project_Name?: string;
  Project_Description?: string;
  Project_Objective?: string;
  Project_Scope?: string;
  External_Reference?: string;
  Project_Status?: string;
  Priority?: string;
  Start_Date?: string;
  End_Date?: string;
  Change_Reason?: string;
  Remarks?: string;
}

export type UpdatedProjectRecord = Record<string, unknown> & {
  Project_ID: string;
  Project_Code: string;
  Project_Name: string;
};

export type ProjectTrackerAdapter = (
  request: ProjectTrackerRequest,
  sourceProjects: Project[],
) => Promise<ProjectTrackerResponse>;

const mockRequestMetadata: ProjectTrackerRequestMetadata = {
  Request_ID: 'MOCK_ONLY_REQUEST_ID',
  Correlation_ID: 'MOCK_ONLY_CORRELATION_ID',
  Organization_ID: 'MOCK_ONLY_ORGANIZATION_ID',
  User_ID: 'MOCK_ONLY_USER_ID',
};

let requestMetadata = { ...mockRequestMetadata };

export function configureProjectTrackerRequestMetadata(metadata: ProjectTrackerRequestMetadata) {
  requestMetadata = { ...metadata };
}

export function buildProjectTrackerRequest(
  search: ProjectTrackerSearch,
  metadata: ProjectTrackerRequestMetadata = requestMetadata,
  normalizeApiFilters = false,
): ProjectTrackerRequest {
  const pageNumber = Math.max(1, Math.floor(search.Pagination.Page_Number) || 1);
  const pageSize = Math.min(200, Math.max(1, Math.floor(search.Pagination.Page_Size) || 20));
  const Filter = Object.fromEntries(Object.entries(search.Filter)
    .map(([key, value]) => [
      key,
      normalizeApiFilters && key === 'Project_Code' && typeof value === 'string'
        ? value.trim() ? [value.trim()] : []
        : Array.isArray(value) ? value.map(item => item.trim()).filter(Boolean) : typeof value === 'string' ? value.trim() : value,
    ])
    .filter(([, value]) => Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '')) as ProjectTrackerFilter;

  return {
    BDOC_Request: {
      Header: {
        ...metadata,
        API_Name: 'GET_PROJECT_TRACKER',
        API_Version: '1.0',
        Request_DateTime: new Date().toISOString(),
        Filter,
        Pagination: { Page_Number: pageNumber, Page_Size: pageSize },
        Sorting: search.Sorting,
      },
      Data: { Item: [] },
    },
  };
}

function sourceDate(value: string): string | undefined {
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return undefined;
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function toTrackerItem(project: Project): ProjectTrackerItem {
  return {
    Project_ID: project.code,
    Project_Code: project.code,
    Project_Name: project.name,
    Project_Owner_Name: project.owner,
    Client_Name: project.client,
    Start_Date: sourceDate(project.start),
    End_Date: sourceDate(project.end),
    Progress_Percentage: project.progress,
  };
}

function filterSourceProject(project: ProjectTrackerItem, filter: ProjectTrackerFilter): boolean {
  const matchesArray = (values: string[] | undefined, candidate: string | undefined) =>
    !values?.length || (candidate !== undefined && values.includes(candidate));
  const matchesText = (value: string | undefined, candidate: string | undefined) =>
    !value || (candidate !== undefined && candidate.toLowerCase().includes(value.toLowerCase()));
  const matchesDate = (date: string | undefined, from?: string, to?: string) =>
    (!from && !to) || (date !== undefined && (!from || date >= from) && (!to || date <= to));

  const projectCodes = Array.isArray(filter.Project_Code) ? filter.Project_Code : undefined;
  return matchesArray(filter.Project_ID, project.Project_ID) &&
    (typeof filter.Project_Code === 'string'
      ? matchesText(filter.Project_Code, project.Project_Code)
      : matchesArray(projectCodes, project.Project_Code)) &&
    matchesText(filter.Project_Name, project.Project_Name) &&
    matchesArray(filter.Project_Status, project.Project_Status) &&
    matchesArray(filter.Project_Owner, project.Project_Owner) &&
    matchesArray(filter.Project_Manager, undefined) &&
    matchesArray(filter.Client_ID, undefined) &&
    matchesArray(filter.Project_Type, project.Project_Type) &&
    matchesArray(filter.Project_Category, undefined) &&
    matchesArray(filter.Priority, project.Priority) &&
    matchesArray(filter.Health_Status, project.Health_Status) &&
    matchesArray(filter.Department, undefined) &&
    matchesArray(filter.Business_Unit, undefined) &&
    matchesArray(filter.Location, undefined) &&
    matchesDate(project.Start_Date, filter.Start_Date_From, filter.Start_Date_To) &&
    matchesDate(project.End_Date, filter.End_Date_From, filter.End_Date_To) &&
    matchesArray(filter.Tags, undefined);
}

function sortValue(project: ProjectTrackerItem, field: string): unknown {
  return Reflect.get(project, field);
}

function compareSortValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left ?? '').localeCompare(String(right ?? ''), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

const mockProjectTrackerAdapter: ProjectTrackerAdapter = async (request, sourceProjects) => {
  const { Filter, Pagination, Sorting } = request.BDOC_Request.Header;
  const filtered = sourceProjects
    .map(toTrackerItem)
    .filter(project => filterSourceProject(project, Filter));
  const sortFields = Sorting.length ? Sorting : [{ Sort_Field: 'Created_Date' as const, Sort_Order: 'DESC' as const }];
  const sorted = [...filtered].sort((left, right) => {
    for (const sort of sortFields) {
      const compared = compareSortValues(sortValue(left, sort.Sort_Field), sortValue(right, sort.Sort_Field));
      if (compared) return sort.Sort_Order === 'ASC' ? compared : -compared;
    }
    return 0;
  });
  const totalRecords = sorted.length;
  const totalPages = Math.ceil(totalRecords / Pagination.Page_Size);
  const firstItem = (Pagination.Page_Number - 1) * Pagination.Page_Size;
  const summary = sorted.reduce<ProjectTrackerSummary>((result, project) => {
    result.Total_Records += 1;
    if (project.Project_Status === 'DRAFT') result.Draft_Projects += 1;
    if (project.Project_Status === 'ACTIVE') result.Active_Projects += 1;
    if (project.Project_Status === 'ON_HOLD') result.On_Hold_Projects += 1;
    if (project.Project_Status === 'COMPLETED') result.Completed_Projects += 1;
    if (project.Project_Status === 'CANCELLED') result.Cancelled_Projects += 1;
    return result;
  }, {
    Total_Records: 0,
    Draft_Projects: 0,
    Active_Projects: 0,
    On_Hold_Projects: 0,
    Completed_Projects: 0,
    Cancelled_Projects: 0,
    At_Risk_Projects: 0,
  });

  return {
    BDOC_Response: {
      Header: {
        Status: 'SUCCESS',
        Status_Code: '200',
        Message: 'Project records retrieved successfully (mock adapter)',
        Pagination: {
          Page_Number: Pagination.Page_Number,
          Page_Size: Pagination.Page_Size,
          Total_Records: totalRecords,
          Total_Pages: totalPages,
          Has_Next_Page: Pagination.Page_Number < totalPages,
          Has_Previous_Page: Pagination.Page_Number > 1,
        },
        Summary: summary,
      },
      Data: {
        Item: sorted.slice(firstItem, firstItem + Pagination.Page_Size),
      },
    },
  };
};

let projectTrackerAdapter = mockProjectTrackerAdapter;

export function configureProjectTrackerAdapter(adapter: ProjectTrackerAdapter) {
  projectTrackerAdapter = adapter;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function failureMessage(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.BDOC_Response) || !isRecord(value.BDOC_Response.Header)) return undefined;
  const header = value.BDOC_Response.Header;
  return typeof header.Message === 'string' ? header.Message : undefined;
}

function isProjectTrackerResponse(value: unknown): value is ProjectTrackerResponse {
  if (!isRecord(value) || !isRecord(value.BDOC_Response)) return false;
  const response = value.BDOC_Response;
  if (!isRecord(response.Header) || !isRecord(response.Data)) return false;
  const header = response.Header;
  const pagination = header.Pagination;
  return typeof header.Status === 'string' &&
    typeof header.Status_Code === 'string' &&
    typeof header.Message === 'string' &&
    isRecord(pagination) &&
    typeof pagination.Page_Number === 'number' &&
    typeof pagination.Page_Size === 'number' &&
    typeof pagination.Total_Records === 'number' &&
    typeof pagination.Total_Pages === 'number' &&
    typeof pagination.Has_Next_Page === 'boolean' &&
    typeof pagination.Has_Previous_Page === 'boolean' &&
    Array.isArray(response.Data.Item) &&
    response.Data.Item.every(isRecord) &&
    (header.Summary === undefined || isRecord(header.Summary));
}

function createApiRequestMetadata(apiLabel = 'Project Tracker'): ProjectTrackerRequestMetadata {
  const organizationId = import.meta.env.VITE_ORGANIZATION_ID?.trim();
  const userId = import.meta.env.VITE_USER_ID?.trim();
  if (!organizationId || !userId) {
    throw new Error(`${apiLabel} API is not configured. Set VITE_ORGANIZATION_ID and VITE_USER_ID; these values must come from your deployment.`);
  }
  const requestId = `REQ-${crypto.randomUUID()}`;
  return {
    Request_ID: requestId,
    Correlation_ID: `CORR-${crypto.randomUUID()}`,
    Organization_ID: organizationId,
    User_ID: userId,
  };
}

async function searchProjectTrackerApi(search: ProjectTrackerSearch): Promise<ProjectTrackerResponse> {
  const baseUrl = API_BASE_URL.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Project Tracker API is not configured. Set VITE_API_BASE_URL to the confirmed backend base URL.');
  }

  const response = await fetch(`${baseUrl}/api/v1/projects/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildProjectTrackerRequest(search, createApiRequestMetadata(), true)),
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Project Tracker API returned a non-JSON response (HTTP ${response.status}).`);
  }

  const responseHeader = isRecord(payload) && isRecord(payload.BDOC_Response) && isRecord(payload.BDOC_Response.Header)
    ? payload.BDOC_Response.Header
    : undefined;
  if (!response.ok || responseHeader?.Status === 'FAILED') {
    throw new Error(failureMessage(payload) || `Project Tracker request failed (HTTP ${response.status}).`);
  }
  if (!isProjectTrackerResponse(payload)) {
    throw new Error(`Project Tracker API returned an invalid response (HTTP ${response.status}).`);
  }
  if (payload.BDOC_Response.Header.Status !== 'SUCCESS') {
    throw new Error(payload.BDOC_Response.Header.Message || `Project Tracker request failed (HTTP ${response.status}).`);
  }
  return payload;
}

function isCreatedProjectRecord(value: unknown): value is CreatedProjectRecord {
  return isRecord(value) &&
    typeof value.Project_ID === 'string' &&
    typeof value.Project_Code === 'string' &&
    typeof value.Project_Status === 'string' &&
    typeof value.Created_By === 'string' &&
    typeof value.Created_Date === 'string';
}

async function createProjectApi(item: ProjectCreateItem): Promise<CreatedProjectRecord> {
  const baseUrl = API_BASE_URL.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Project API is not configured. Set VITE_API_BASE_URL to the confirmed backend base URL.');
  }

  const metadata = createApiRequestMetadata('Project');
  const request = {
    BDOC_Request: {
      Header: {
        ...metadata,
        API_Name: 'CREATE_PROJECT',
        API_Version: '1.0',
        Request_DateTime: new Date().toISOString(),
      },
      Data: {
        Item: [item],
      },
    },
  };

  const response = await fetch(`${baseUrl}/api/v1/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Project API returned a non-JSON response (HTTP ${response.status}).`);
  }

  const responseRoot = isRecord(payload) && isRecord(payload.BDOC_Response)
    ? payload.BDOC_Response
    : undefined;
  const header = responseRoot && isRecord(responseRoot.Header)
    ? responseRoot.Header
    : undefined;
  const message = header && typeof header.Message === 'string' ? header.Message : undefined;

  if (!response.ok || header?.Status === 'FAILED') {
    throw new Error(message || `Project creation failed (HTTP ${response.status}).`);
  }
  if (
    !header ||
    header.API_Name !== 'CREATE_PROJECT' ||
    header.Status !== 'SUCCESS' ||
    header.Status_Code !== '201' ||
    !responseRoot ||
    !isRecord(responseRoot.Data) ||
    !Array.isArray(responseRoot.Data.Item) ||
    !isCreatedProjectRecord(responseRoot.Data.Item[0])
  ) {
    throw new Error(message || 'Project API returned an invalid create response.');
  }

  return responseRoot.Data.Item[0];
}

async function updateProjectApi(projectId: string, changes: ProjectUpdateItem): Promise<UpdatedProjectRecord> {
  const baseUrl = API_BASE_URL.trim().replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Project Update API is not configured. Set VITE_API_BASE_URL to the confirmed backend base URL.');
  }
  if (!projectId.trim()) throw new Error('A valid Project_ID is required to update a project.');
  if (changes.Project_ID !== projectId) {
    throw new Error('Project_ID in the update must match the selected project.');
  }

  const metadata = createApiRequestMetadata('Project Update');
  const request = {
    BDOC_Request: {
      Header: {
        ...metadata,
        API_Name: 'UPDATE_PROJECT',
        API_Version: '1.0',
        Request_DateTime: new Date().toISOString(),
      },
      Data: {
        Item: [changes],
      },
    },
  };
  const response = await fetch(`${baseUrl}/api/v1/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Project Update API returned a non-JSON response (HTTP ${response.status}).`);
  }

  const responseRoot = isRecord(payload) && isRecord(payload.BDOC_Response)
    ? payload.BDOC_Response
    : undefined;
  const header = responseRoot && isRecord(responseRoot.Header)
    ? responseRoot.Header
    : undefined;
  const message = header && typeof header.Message === 'string' ? header.Message : undefined;
  if (!response.ok || header?.Status === 'FAILED') {
    throw new Error(message || `Project update failed (HTTP ${response.status}).`);
  }

  const data = responseRoot && isRecord(responseRoot.Data) ? responseRoot.Data : undefined;
  const record = data && Array.isArray(data.Item) ? data.Item[0] : undefined;
  if (
    !header ||
    header.API_Name !== 'UPDATE_PROJECT' ||
    header.Status !== 'SUCCESS' ||
    header.Status_Code !== '200' ||
    !isRecord(record) ||
    typeof record.Project_ID !== 'string' ||
    record.Project_ID !== projectId ||
    typeof record.Project_Code !== 'string' ||
    typeof record.Project_Name !== 'string'
  ) {
    throw new Error(message || 'Project Update API returned an invalid success response.');
  }

  return record as UpdatedProjectRecord;
}

export const projectService = {
  list: () => api.list<Project>('projects'),
  create: (project: Project) => api.save('projects', project),
  update: (project: Project) => api.save('projects', project),
  createProjectApi,
  updateProjectApi,
  searchTracker: (search: ProjectTrackerSearch, sourceProjects: Project[]) =>
    projectTrackerAdapter(buildProjectTrackerRequest(search), sourceProjects),
  searchTrackerApi: searchProjectTrackerApi,
};
