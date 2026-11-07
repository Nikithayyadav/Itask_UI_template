export type ProjectStatus = 'Planning' | 'On track' | 'At risk' | 'On hold';
export type Project = { code: string; name: string; client: string; start: string; end: string; status: ProjectStatus; progress: number; tasks: number; color: string; owner?: string; priority?: string; description?: string };

export type ProjectTrackerStatus = 'DRAFT' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED' | 'ARCHIVED';
export type ProjectTrackerType = 'INTERNAL' | 'PRODUCT' | 'CLIENT';
export type ProjectTrackerCategory = 'SOFTWARE' | 'HEALTHCARE' | 'CONSTRUCTION' | 'FINANCE' | 'MARKETING' | 'OPERATIONS';
export type ProjectTrackerPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ProjectTrackerHealthStatus = 'GREEN' | 'AMBER' | 'RED';

export interface ProjectTrackerFilter {
  Project_ID?: string[];
  Project_Code?: string | string[];
  Project_Name?: string;
  Project_Status?: string[];
  Project_Owner?: string[];
  Project_Manager?: string[];
  Client_ID?: string[];
  Project_Type?: string[];
  Project_Category?: string[];
  Priority?: string[];
  Health_Status?: string[];
  Department?: string[];
  Business_Unit?: string[];
  Location?: string[];
  Start_Date_From?: string;
  Start_Date_To?: string;
  End_Date_From?: string;
  End_Date_To?: string;
  Tags?: string[];
}

export type ProjectTrackerSortField =
  | 'Project_ID'
  | 'Project_Code'
  | 'Project_Name'
  | 'Project_Status'
  | 'Project_Type'
  | 'Priority'
  | 'Health_Status'
  | 'Project_Owner'
  | 'Client_Name'
  | 'Start_Date'
  | 'End_Date'
  | 'Progress_Percentage'
  | 'Overdue_Tasks'
  | 'Created_Date';

export interface ProjectTrackerSort {
  Sort_Field: ProjectTrackerSortField;
  Sort_Order: 'ASC' | 'DESC';
}

export interface ProjectTrackerPaginationRequest {
  Page_Number: number;
  Page_Size: number;
}

export interface ProjectTrackerRequest {
  BDOC_Request: {
    Header: {
      Request_ID: string;
      Correlation_ID: string;
      API_Name: 'GET_PROJECT_TRACKER';
      API_Version: '1.0';
      Request_DateTime: string;
      Organization_ID: string;
      User_ID: string;
      Filter: ProjectTrackerFilter;
      Pagination: ProjectTrackerPaginationRequest;
      Sorting: ProjectTrackerSort[];
    };
    Data: {
      Item: [];
    };
  };
}

export interface ProjectTrackerItem {
  Project_ID?: string;
  Project_Code?: string;
  Project_Name?: string;
  Project_Status?: ProjectTrackerStatus;
  Project_Type?: ProjectTrackerType;
  Priority?: ProjectTrackerPriority;
  Health_Status?: ProjectTrackerHealthStatus;
  Project_Owner?: string;
  Project_Owner_Name?: string;
  Client_Name?: string;
  Start_Date?: string;
  End_Date?: string;
  Progress_Percentage?: number;
  Overdue_Tasks?: number;
  Created_Date?: string;
}

export interface ProjectTrackerPaginationResponse extends ProjectTrackerPaginationRequest {
  Total_Records: number;
  Total_Pages: number;
  Has_Next_Page: boolean;
  Has_Previous_Page: boolean;
}

export interface ProjectTrackerSummary {
  Total_Records: number;
  Draft_Projects: number;
  Active_Projects: number;
  On_Hold_Projects: number;
  Completed_Projects: number;
  Cancelled_Projects: number;
  At_Risk_Projects: number;
}

export interface ProjectTrackerResponse {
  BDOC_Response: {
    Header: {
      Status: string;
      Status_Code: string;
      Message: string;
      Pagination: ProjectTrackerPaginationResponse;
      Summary?: Partial<ProjectTrackerSummary>;
    };
    Data: {
      Item: ProjectTrackerItem[];
    };
  };
}

export type ProjectDetailsTab = 'Overview' | 'Tasks' | 'Team' | 'Milestones' | 'Documents' | 'Activity';

export interface ProjectDetailsProject {
  Project_ID: string;
  Project_Code: string;
  Project_Name: string;
  Project_Description: string;
  Project_Status: string;
  Priority: string;
  Project_Type: string;
  Project_Owner_Name: string;
  Project_Manager_Name: string;
  Client_Name: string;
  Department: string;
  Start_Date: string;
  End_Date: string;
  Health_Status: string;
  Progress_Percentage: number;
  Total_Tasks: number;
  Completed_Tasks: number;
  Overdue_Tasks: number;
  Project_Owner?: string;
  Project_Objective?: string;
  Project_Scope?: string;
  External_Reference?: string;
  Project_Manager?: string;
  Client_ID?: string;
  Parent_Project_ID?: string | null;
  Risk_Level?: string;
  Confidentiality_Level?: string;
  Display_Label?: string;
  Business_Unit?: string;
  Remarks?: string;
}

export interface ProjectDetailTask {
  Task_ID: string;
  Task_Name: string;
  Assignee_Name: string;
  Due_Date: string;
  Status: string;
  Priority: string;
  Progress_Percentage: number;
}

export interface ProjectTeamMember {
  Member_ID: string;
  Name: string;
  Role: string;
  Responsibility: string;
  Initials: string;
}

export interface ProjectMilestone {
  Milestone_ID: string;
  Name: string;
  Target_Date: string;
  Status: string;
  Description: string;
}

export interface ProjectDocument {
  Document_ID: string;
  Name: string;
  File_Type: string;
  Uploaded_By: string;
  Uploaded_Date: string;
  Size: string;
}

export interface ProjectActivity {
  Activity_ID: string;
  Description: string;
  Actor_Name: string;
  Occurred_At: string;
  Type: string;
}

export interface ProjectDetailsResponse {
  Project: ProjectDetailsProject;
  Tasks: ProjectDetailTask[];
  Team: ProjectTeamMember[];
  Milestones: ProjectMilestone[];
  Documents: ProjectDocument[];
  Activity: ProjectActivity[];
}
