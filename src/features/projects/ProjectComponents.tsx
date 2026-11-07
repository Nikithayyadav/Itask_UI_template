import { useEffect, useRef, useState } from 'react';
import { useId } from 'react';
import type { FormEvent } from 'react';
import type {
  ProjectTrackerCategory,
  ProjectTrackerFilter,
  ProjectTrackerHealthStatus,
  ProjectTrackerItem,
  ProjectTrackerPriority,
  ProjectTrackerResponse,
  ProjectTrackerSort,
  ProjectTrackerSortField,
  ProjectTrackerStatus,
  ProjectTrackerSummary,
  ProjectTrackerType,
  ProjectDetailsProject,
} from './types';
import { ConfiguredFields } from '../../components/ui/ConfiguredFields';
import { ConfiguredTable } from '../../components/ui/ConfiguredTable';
import { getFormDefinition } from '../../engine/ConfigLoader';
import type { TableDefinition } from '../../types/config.types';
import { projectDetailsService } from '../../services/resources/projectDetails';
import { projectService } from '../../services/resources/projects';
import type { ProjectUpdateItem } from '../../services/resources/projects';

const PROJECT_TRACKER_STATUSES: ProjectTrackerStatus[] = [
  'DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED', 'ARCHIVED',
];
const PROJECT_TRACKER_TYPES: ProjectTrackerType[] = ['INTERNAL', 'PRODUCT', 'CLIENT'];
const PROJECT_TRACKER_CATEGORIES: ProjectTrackerCategory[] = [
  'SOFTWARE', 'HEALTHCARE', 'CONSTRUCTION', 'FINANCE', 'MARKETING', 'OPERATIONS',
];
const PROJECT_TRACKER_PRIORITIES: ProjectTrackerPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const PROJECT_TRACKER_HEALTH: ProjectTrackerHealthStatus[] = ['GREEN', 'AMBER', 'RED'];
const PROJECT_TRACKER_SORT_FIELDS: ProjectTrackerSortField[] = [
  'Project_ID', 'Project_Code', 'Project_Name', 'Project_Status', 'Project_Type',
  'Priority', 'Health_Status', 'Project_Owner', 'Client_Name', 'Start_Date',
  'End_Date', 'Progress_Percentage', 'Overdue_Tasks', 'Created_Date',
];
const DEFAULT_PROJECT_SORT: ProjectTrackerSort[] = [{ Sort_Field: 'Created_Date', Sort_Order: 'DESC' }];

function isProjectTrackerSortField(value: string): value is ProjectTrackerSortField {
  return PROJECT_TRACKER_SORT_FIELDS.some(field => field === value);
}

function formatTrackerLabel(value: string): string {
  return value.replaceAll('_', ' ');
}

function TrackerBadge({ value, kind }: { value: string; kind: 'status' | 'health' }) {
  const tone = value.toLowerCase().replaceAll('_', '-');
  return <span className={`project-data-badge project-data-badge-${kind} ${kind}-${tone}`} title={value}>
    {formatTrackerLabel(value)}
  </span>;
}

const projectTrackerTable: TableDefinition = {
  table_code: 'projectTrackerApi',
  columns: [
    { key: 'Project_ID', label: 'Project ID', sortable: true },
    { key: 'Project_Code', label: 'Project code', sortable: true },
    { key: 'Project_Name', label: 'Project name', sortable: true },
    { key: 'Project_Status', label: 'Status', sortable: true },
    { key: 'Project_Type', label: 'Type', sortable: true },
    { key: 'Priority', label: 'Priority', sortable: true },
    { key: 'Health_Status', label: 'Health', sortable: true },
    { key: 'Project_Owner', label: 'Owner', sortable: true },
    { key: 'Client_Name', label: 'Client', sortable: true },
    { key: 'Start_Date', label: 'Start date', sortable: true },
    { key: 'End_Date', label: 'End date', sortable: true },
    { key: 'Progress_Percentage', label: 'Progress', sortable: true },
    { key: 'Overdue_Tasks', label: 'Overdue tasks', sortable: true },
    { key: 'Created_Date', label: 'Created date', sortable: true },
  ],
  searchable_fields: [],
  sorting: { enabled: true },
  pagination: { enabled: true, page_size: 20 },
};

function commaSeparatedValues(value: string): string[] | undefined {
  const values = value.split(',').map(item => item.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function ProjectArrayInput({
  label,
  value,
  placeholder = 'Enter exact values, comma-separated',
  onChange,
}: {
  label: string;
  value: string[] | undefined;
  placeholder?: string;
  onChange: (value: string[] | undefined) => void;
}) {
  const [draft, setDraft] = useState(() => value?.join(', ') ?? '');
  useEffect(() => {
    setDraft(value?.join(', ') ?? '');
  }, [value]);

  function updateValue(nextDraft: string) {
    setDraft(nextDraft);
    const nextValue = commaSeparatedValues(nextDraft);
    if (nextValue?.join('\u0000') !== value?.join('\u0000')) onChange(nextValue);
  }

  return <label>{label}<input
    value={draft}
    placeholder={placeholder}
    onChange={event => updateValue(event.target.value)}
  /></label>;
}

function SearchableMultiSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: string[];
  onChange: (value: string[] | undefined) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const inputId = useId();
  const listId = useId();
  const visibleOptions = options.filter(option => option.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener('pointerdown', closeOnOutsideClick);
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick);
  }, []);

  function toggleOption(option: T) {
    const next = value.includes(option)
      ? value.filter(item => item !== option)
      : [...value, option];
    onChange(next.length ? next : undefined);
  }

  return <div className="project-multiselect" ref={rootRef}>
    <span className="project-field-label">{label}</span>
    <button
      type="button"
      className="project-multiselect-trigger"
      aria-expanded={isOpen}
      aria-controls={listId}
      onClick={() => setIsOpen(open => !open)}
    >
      <span className={value.length ? 'has-selection' : undefined} title={value.join(', ')}>
        {value.length
          ? value.map(item => <span className="project-multiselect-chip" key={item}>{item}</span>)
          : 'Select one or more'}
      </span>
      <b aria-hidden="true">{isOpen ? '⌃' : '⌄'}</b>
    </button>
    {isOpen && <div className="project-multiselect-menu" id={listId}>
      <input
        id={inputId}
        type="search"
        className="project-multiselect-search"
        placeholder={`Search ${label.toLowerCase()}...`}
        aria-label={`Search ${label}`}
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <div className="project-multiselect-options">
        {visibleOptions.length
          ? visibleOptions.map(option => <label key={option} className="project-multiselect-option">
            <input type="checkbox" checked={value.includes(option)} onChange={() => toggleOption(option)}/>
            <span>{option}</span>
          </label>)
          : <span className="project-multiselect-no-results">No matching values</span>}
      </div>
    </div>}
  </div>;
}

export function ProjectsPanel({
  response,
  isLoading,
  error,
  onSearch,
  canCreate,
  isApiProjectTracker = false,
  integrationLabel,
  onOpen,
  open,
  ownerPortal = false,
}: {
  response?: ProjectTrackerResponse['BDOC_Response'];
  isLoading: boolean;
  error?: string;
  onSearch: (
    filter: ProjectTrackerFilter,
    pageNumber: number,
    pageSize: number,
    sorting: ProjectTrackerSort[],
  ) => Promise<boolean>;
  canCreate?: boolean;
  isApiProjectTracker?: boolean;
  integrationLabel?: string;
  onOpen?: (project: ProjectTrackerItem) => void;
  open?: () => void;
  ownerPortal?: boolean;
}) {
  const [filter, setFilter] = useState<ProjectTrackerFilter>({});
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [advancedFiltersVisible, setAdvancedFiltersVisible] = useState(false);
  const [sorting, setSorting] = useState<ProjectTrackerSort[]>(DEFAULT_PROJECT_SORT);
  const searchHandler = useRef(onSearch);
  const responseHeader = response?.Header;
  const pageSize = responseHeader?.Pagination.Page_Size ?? 20;
  const summaryFields: Array<[keyof ProjectTrackerSummary, string]> = [
    ['Total_Records', 'Total Projects'],
    ['Draft_Projects', 'Draft'],
    ['Active_Projects', 'Active'],
    ['On_Hold_Projects', 'On Hold'],
    ['Completed_Projects', 'Completed'],
    ['Cancelled_Projects', 'Cancelled'],
    ['At_Risk_Projects', 'At Risk'],
  ];
  const summaryItems = summaryFields.flatMap(([field, label]) => {
    const value = responseHeader?.Summary?.[field];
    return typeof value === 'number' && Number.isFinite(value) ? [{ field, label, value }] : [];
  });

  useEffect(() => {
    searchHandler.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    void searchHandler.current({}, 1, 20, DEFAULT_PROJECT_SORT);
  }, []);

  async function submitSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (await onSearch(filter, 1, pageSize, sorting)) setFiltersVisible(false);
  }

  async function resetFilters() {
    setFilter({});
    if (await onSearch({}, 1, pageSize, sorting)) setFiltersVisible(false);
  }

  function searchPage(pageNumber: number) {
    void onSearch(filter, pageNumber, pageSize, sorting);
  }

  function changePageSize(nextPageSize: number) {
    void onSearch(filter, 1, nextPageSize, sorting);
  }

  function changeSorting(nextSorting: ProjectTrackerSort[]) {
    setSorting(nextSorting);
    void onSearch(filter, 1, pageSize, nextSorting);
  }

  const activeFilterCount = Object.values(filter).filter(value =>
    Array.isArray(value) ? value.length > 0 : value !== undefined && value !== '',
  ).length;
  const tableBodyState = isLoading
    ? <div className="project-table-state" role="status"><span className="project-loading-spinner"/>Loading projects…</div>
    : error
      ? <div className="project-table-state project-list-error" role="alert">
        <b>Projects could not be loaded</b>
        <span>{error}</span>
        <button type="button" className="secondary-btn" disabled={isLoading} onClick={() => void submitSearch()}>Retry</button>
      </div>
      : response
        ? <div className="project-table-state"><b>No projects found</b><span>Try changing or clearing the selection criteria.</span></div>
        : <div className="project-table-state" role="status"><span className="project-loading-spinner"/>Loading projects…</div>;

  return <section className={`panel table-panel${ownerPortal ? ' owner-project-ui' : ''}`}>
    <div className="panel-heading table-heading">
      <div><h2>Project Tracker</h2><p>Search and review project records available to your workspace. <span className="project-mock-notice">{isApiProjectTracker
  ? integrationLabel ?? 'Backend API · live integration'
  : 'Mock adapter · live API not connected'}</span></p></div>
      {canCreate && !isApiProjectTracker && <button className="table-primary" onClick={open}>＋ New project</button>}
    </div>
    <div className="project-filter-toolbar">
      <button
        type="button"
        className="project-filter-toggle"
        aria-expanded={filtersVisible}
        onClick={() => setFiltersVisible(visible => !visible)}
      >
        {filtersVisible ? 'Hide Filters' : 'Show Filters'}
        {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
        <b aria-hidden="true">{filtersVisible ? '−' : '+'}</b>
      </button>
    </div>
    {filtersVisible && <form className="project-criteria" onSubmit={submitSearch}>
      <div className="project-criteria-heading">
        <div><h3>Selection Criteria</h3><p>Use basic filters for common searches, or expand Advanced Filters for more criteria.</p></div>
      </div>
      <div className="project-basic-filters" aria-label="Basic filters">
        <label>Project Name<input value={filter.Project_Name ?? ''} placeholder="Search project name..." onChange={event => setFilter(current => ({ ...current, Project_Name: event.target.value || undefined }))}/></label>
        {isApiProjectTracker
          ? <ProjectArrayInput label="Project Status" value={filter.Project_Status} onChange={Project_Status => setFilter(current => ({ ...current, Project_Status }))}/>
          : <SearchableMultiSelect label="Project Status" options={PROJECT_TRACKER_STATUSES} value={filter.Project_Status ?? []} onChange={Project_Status => setFilter(current => ({ ...current, Project_Status }))}/>}
        {isApiProjectTracker
          ? <ProjectArrayInput label="Priority" value={filter.Priority} onChange={Priority => setFilter(current => ({ ...current, Priority }))}/>
          : <SearchableMultiSelect label="Priority" options={PROJECT_TRACKER_PRIORITIES} value={filter.Priority ?? []} onChange={Priority => setFilter(current => ({ ...current, Priority }))}/>}
      </div>
      {isApiProjectTracker && <p className="project-lookup-pending" role="note">Lookup values for status, ownership, client, classification and organization filters are pending backend master-data and user-list APIs. Enter exact API values as comma-separated items when known.</p>}
      <div className="project-advanced">
        <button
          type="button"
          className="project-advanced-toggle"
          aria-expanded={advancedFiltersVisible}
          onClick={() => setAdvancedFiltersVisible(visible => !visible)}
        >
          <span>Advanced Filters</span>
          <small>{Object.entries(filter).filter(([key, value]) =>
            !['Project_Name', 'Project_Status', 'Priority'].includes(key) &&
            (Array.isArray(value) ? value.length > 0 : value !== undefined && value !== ''),
          ).length || 'Optional'}</small>
          <b aria-hidden="true">{advancedFiltersVisible ? '−' : '+'}</b>
        </button>
        {advancedFiltersVisible && <div className="project-advanced-content">
          <div className="project-criteria-section" aria-labelledby="project-information-heading">
            <h4 id="project-information-heading">Project Information</h4>
            <div className="project-criteria-grid">
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project ID" value={filter.Project_ID} onChange={Project_ID => setFilter(current => ({ ...current, Project_ID }))}/>
                : <label>Project ID (IDs, comma-separated)<input value={filter.Project_ID?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Project_ID: commaSeparatedValues(event.target.value) }))}/></label>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project Code" value={Array.isArray(filter.Project_Code) ? filter.Project_Code : filter.Project_Code ? [filter.Project_Code] : undefined} onChange={Project_Code => setFilter(current => ({ ...current, Project_Code }))}/>
                : <label>Project Code<input value={Array.isArray(filter.Project_Code) ? filter.Project_Code.join(', ') : filter.Project_Code ?? ''} onChange={event => setFilter(current => ({ ...current, Project_Code: event.target.value || undefined }))}/></label>}
            </div>
          </div>
          <div className="project-criteria-section" aria-labelledby="project-ownership-heading">
            <h4 id="project-ownership-heading">Ownership &amp; Client</h4>
            <div className="project-criteria-grid">
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project Owner IDs" value={filter.Project_Owner} onChange={Project_Owner => setFilter(current => ({ ...current, Project_Owner }))}/>
                : <label>Project Owner (IDs, comma-separated)<input value={filter.Project_Owner?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Project_Owner: commaSeparatedValues(event.target.value) }))}/></label>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project Manager IDs" value={filter.Project_Manager} onChange={Project_Manager => setFilter(current => ({ ...current, Project_Manager }))}/>
                : <label>Project Manager (IDs, comma-separated)<input value={filter.Project_Manager?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Project_Manager: commaSeparatedValues(event.target.value) }))}/></label>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Client IDs" value={filter.Client_ID} onChange={Client_ID => setFilter(current => ({ ...current, Client_ID }))}/>
                : <label>Client ID (IDs, comma-separated)<input value={filter.Client_ID?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Client_ID: commaSeparatedValues(event.target.value) }))}/></label>}
            </div>
          </div>
          <div className="project-criteria-section" aria-labelledby="project-classification-heading">
            <h4 id="project-classification-heading">Classification</h4>
            <div className="project-criteria-grid">
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project Type" value={filter.Project_Type} onChange={Project_Type => setFilter(current => ({ ...current, Project_Type }))}/>
                : <SearchableMultiSelect label="Project Type" options={PROJECT_TRACKER_TYPES} value={filter.Project_Type ?? []} onChange={Project_Type => setFilter(current => ({ ...current, Project_Type }))}/>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Project Category" value={filter.Project_Category} onChange={Project_Category => setFilter(current => ({ ...current, Project_Category }))}/>
                : <SearchableMultiSelect label="Project Category" options={PROJECT_TRACKER_CATEGORIES} value={filter.Project_Category ?? []} onChange={Project_Category => setFilter(current => ({ ...current, Project_Category }))}/>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Health Status" value={filter.Health_Status} onChange={Health_Status => setFilter(current => ({ ...current, Health_Status }))}/>
                : <SearchableMultiSelect label="Health Status" options={PROJECT_TRACKER_HEALTH} value={filter.Health_Status ?? []} onChange={Health_Status => setFilter(current => ({ ...current, Health_Status }))}/>}
            </div>
          </div>
          <div className="project-criteria-section" aria-labelledby="project-organization-heading">
            <h4 id="project-organization-heading">Organization</h4>
            <div className="project-criteria-grid">
              {isApiProjectTracker
                ? <ProjectArrayInput label="Department" value={filter.Department} onChange={Department => setFilter(current => ({ ...current, Department }))}/>
                : <label>Department (names, comma-separated)<input value={filter.Department?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Department: commaSeparatedValues(event.target.value) }))}/></label>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Business Unit" value={filter.Business_Unit} onChange={Business_Unit => setFilter(current => ({ ...current, Business_Unit }))}/>
                : <label>Business Unit (names, comma-separated)<input value={filter.Business_Unit?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Business_Unit: commaSeparatedValues(event.target.value) }))}/></label>}
              {isApiProjectTracker
                ? <ProjectArrayInput label="Location" value={filter.Location} onChange={Location => setFilter(current => ({ ...current, Location }))}/>
                : <label>Location (names, comma-separated)<input value={filter.Location?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Location: commaSeparatedValues(event.target.value) }))}/></label>}
            </div>
          </div>
          <div className="project-criteria-section" aria-labelledby="project-timeline-heading">
            <h4 id="project-timeline-heading">Timeline</h4>
            <div className="project-date-ranges">
              <div className="project-date-range">
                <span>Start Date</span>
                <div className="project-date-range-fields">
                  <label>From<input type="date" value={filter.Start_Date_From ?? ''} onChange={event => setFilter(current => ({ ...current, Start_Date_From: event.target.value || undefined }))}/></label>
                  <label>To<input type="date" value={filter.Start_Date_To ?? ''} onChange={event => setFilter(current => ({ ...current, Start_Date_To: event.target.value || undefined }))}/></label>
                </div>
              </div>
              <div className="project-date-range">
                <span>End Date</span>
                <div className="project-date-range-fields">
                  <label>From<input type="date" value={filter.End_Date_From ?? ''} onChange={event => setFilter(current => ({ ...current, End_Date_From: event.target.value || undefined }))}/></label>
                  <label>To<input type="date" value={filter.End_Date_To ?? ''} onChange={event => setFilter(current => ({ ...current, End_Date_To: event.target.value || undefined }))}/></label>
                </div>
              </div>
            </div>
          </div>
          <div className="project-criteria-section project-additional-section" aria-labelledby="project-additional-heading">
            <h4 id="project-additional-heading">Additional Information</h4>
            <div className="project-criteria-grid">
              {isApiProjectTracker
                ? <ProjectArrayInput label="Tags" value={filter.Tags} onChange={Tags => setFilter(current => ({ ...current, Tags }))}/>
                : <label>Tags (comma-separated)<input value={filter.Tags?.join(', ') ?? ''} onChange={event => setFilter(current => ({ ...current, Tags: commaSeparatedValues(event.target.value) }))}/></label>}
            </div>
          </div>
        </div>}
      </div>
      <div className="project-criteria-actions">
        <button type="button" className="secondary-btn" onClick={resetFilters}>Reset</button>
        <button type="submit" className="primary-btn" disabled={isLoading}>{isLoading ? 'Searching…' : 'Search'}<span>⌕</span></button>
      </div>
    </form>}
    {responseHeader && isApiProjectTracker && <div className="project-summary" aria-label="Filtered project summary">
      {summaryItems.length
        ? summaryItems.map(item => <span className={item.field === 'Total_Records' ? 'project-summary-total' : undefined} key={item.field}>{item.label} <b>{item.value}</b></span>)
        : <span>Summary data is not available in this response.</span>}
    </div>}
    {responseHeader && !isApiProjectTracker && responseHeader.Summary && <div className="project-summary" aria-label="Filtered project summary">
      <b>{responseHeader.Summary.Total_Records} total projects</b>
      <span>Draft {responseHeader.Summary.Draft_Projects}</span>
      <span>Active {responseHeader.Summary.Active_Projects}</span>
      <span>On hold {responseHeader.Summary.On_Hold_Projects}</span>
      <span>Completed {responseHeader.Summary.Completed_Projects}</span>
      <span>Cancelled {responseHeader.Summary.Cancelled_Projects}</span>
      <span>At risk {responseHeader.Summary.At_Risk_Projects}</span>
    </div>}
    {responseHeader && response?.Data.Item.length > 0 && <p className="project-sort-help">Select a column heading to sort. Shift-select headings to add secondary sort fields.</p>}
    {!isApiProjectTracker && isLoading && <div className="project-list-state" role="status"><span className="project-loading-spinner"/>Loading projects…</div>}
    {!isApiProjectTracker && !isLoading && error && <div className="project-list-state project-list-error" role="alert"><b>Projects could not be loaded</b><span>{error}</span><button type="button" className="secondary-btn" onClick={() => void submitSearch()}>Retry</button></div>}
    {!isApiProjectTracker && !isLoading && !error && response && response.Data.Item.length === 0 && <div className="project-list-state"><b>No projects found</b><span>Try changing or clearing the selection criteria.</span></div>}
    {(isApiProjectTracker || (!isLoading && !error && response && response.Data.Item.length > 0 && responseHeader)) && <ConfiguredTable<ProjectTrackerItem, ProjectTrackerSortField>
      definition={projectTrackerTable}
      rows={response?.Data.Item ?? []}
      bodyState={isApiProjectTracker && !(response?.Data.Item.length) ? tableBodyState : undefined}
      pageNo={responseHeader?.Pagination.Page_Number ?? 1}
      setPageNo={searchPage}
      itemLabel="projects"
      rowKey={project => project.Project_ID ?? project.Project_Code ?? `${project.Project_Name ?? 'project'}-${project.Created_Date ?? ''}`}
      onRowClick={isApiProjectTracker && onOpen ? project => {
        if (project.Project_ID) onOpen(project);
      } : undefined}
      serverPagination={responseHeader ? {
        ...responseHeader.Pagination,
        isLoading,
        onPageChange: searchPage,
        onPageSizeChange: changePageSize,
      } : undefined}
      serverSorting={{ fields: sorting, onChange: changeSorting, isSortField: isProjectTrackerSortField }}
      renderCell={(project, column) => {
        switch (column.key) {
          case 'Project_ID': return project.Project_ID ?? '—';
          case 'Project_Code': return project.Project_Code ?? '—';
          case 'Project_Name': return onOpen && project.Project_ID
            ? <button
              type="button"
              className="project-name-link"
              onClick={event => {
                event.stopPropagation();
                onOpen(project);
              }}
            >{project.Project_Name ?? '—'}</button>
            : <b>{project.Project_Name ?? '—'}</b>;
          case 'Project_Status': return project.Project_Status
            ? isApiProjectTracker ? <TrackerBadge value={project.Project_Status} kind="status"/> : project.Project_Status
            : '—';
          case 'Project_Type': return project.Project_Type ?? '—';
          case 'Priority': return project.Priority ?? '—';
          case 'Health_Status': return project.Health_Status
            ? isApiProjectTracker ? <TrackerBadge value={project.Health_Status} kind="health"/> : project.Health_Status
            : '—';
          case 'Project_Owner': return project.Project_Owner_Name ?? project.Project_Owner ?? '—';
          case 'Client_Name': return project.Client_Name ?? '—';
          case 'Start_Date': return project.Start_Date ?? '—';
          case 'End_Date': return project.End_Date ?? '—';
          case 'Progress_Percentage': {
            const progress = project.Progress_Percentage;
            if (progress === undefined || progress === null || !Number.isFinite(progress)) return '—';
            const barWidth = Math.min(100, Math.max(0, progress));
            return <div className="project-progress" role="img" aria-label={`${progress}% complete`}>
              <span className="project-progress-track"><i style={{ width: `${barWidth}%` }}/></span>
              <small>{progress}%</small>
            </div>;
          }
          case 'Overdue_Tasks': return project.Overdue_Tasks ?? '—';
          case 'Created_Date': return project.Created_Date ?? '—';
          default: return '—';
        }
      }}
    />}
  </section>;
}

type UpdateProjectField =
  | 'Project_Name'
  | 'Project_Description'
  | 'Project_Objective'
  | 'Project_Scope'
  | 'External_Reference'
  | 'Project_Status'
  | 'Priority'
  | 'Start_Date'
  | 'End_Date'
  | 'Remarks';

type UpdateProjectValues = Partial<Record<UpdateProjectField, string>>;

const UPDATE_PROJECT_FIELDS: Array<{
  name: UpdateProjectField;
  label: string;
  type?: 'text' | 'date' | 'textarea';
}> = [
  { name: 'Project_Name', label: 'Project name' },
  { name: 'Project_Description', label: 'Project description', type: 'textarea' },
  { name: 'Project_Objective', label: 'Project objective', type: 'textarea' },
  { name: 'Project_Scope', label: 'Project scope', type: 'textarea' },
  { name: 'External_Reference', label: 'External reference' },
  { name: 'Project_Status', label: 'Project status' },
  { name: 'Priority', label: 'Priority' },
  { name: 'Start_Date', label: 'Start date', type: 'date' },
  { name: 'End_Date', label: 'Target end date', type: 'date' },
  { name: 'Remarks', label: 'Remarks', type: 'textarea' },
];

function updateValuesFromProject(project: ProjectDetailsProject): UpdateProjectValues {
  const values: UpdateProjectValues = {};
  for (const field of UPDATE_PROJECT_FIELDS) {
    const value = project[field.name];
    if (typeof value === 'string') values[field.name] = value;
  }
  return values;
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value)) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

export function UpdateProjectPage({
  projectId,
  onBack,
  onUpdated,
  ownerPortal = false,
}: {
  projectId: string;
  onBack: () => void;
  onUpdated: (projectCode: string, refreshWarning?: string) => void;
  ownerPortal?: boolean;
}) {
  const [project, setProject] = useState<ProjectDetailsProject>();
  const [originalValues, setOriginalValues] = useState<UpdateProjectValues>({});
  const [values, setValues] = useState<UpdateProjectValues>({});
  const [changeReason, setChangeReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);
  const savingRequest = useRef(false);

  useEffect(() => {
    const activeRequest = ++requestId.current;
    setProject(undefined);
    setOriginalValues({});
    setValues({});
    setChangeReason('');
    setError(undefined);
    setLoading(true);
    void projectDetailsService.getByProjectId(projectId, [], [])
      .then(result => {
        if (activeRequest !== requestId.current) return;
        if (!result || result.Project.Project_ID !== projectId) {
          setError('The selected project could not be found.');
          return;
        }
        const initialValues = updateValuesFromProject(result.Project);
        setProject(result.Project);
        setOriginalValues(initialValues);
        setValues(initialValues);
      })
      .catch(loadError => {
        if (activeRequest === requestId.current) {
          setError(loadError instanceof Error ? loadError.message : 'Project details could not be loaded.');
        }
      })
      .finally(() => {
        if (activeRequest === requestId.current) setLoading(false);
      });

    return () => {
      requestId.current += 1;
    };
  }, [projectId]);

  async function submitUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project || savingRequest.current) return;
    const changes: ProjectUpdateItem = { Project_ID: project.Project_ID };
    for (const field of UPDATE_PROJECT_FIELDS) {
      const currentValue = values[field.name];
      if (currentValue !== undefined && currentValue !== originalValues[field.name]) {
        changes[field.name] = currentValue;
      }
    }

    const startChanged = changes.Start_Date !== undefined;
    const endChanged = changes.End_Date !== undefined;
    if (changes.Project_Name !== undefined && !changes.Project_Name.trim()) {
      setError('Project name is required.');
      return;
    }
    if (
      (changes.Start_Date !== undefined && !isValidIsoDate(changes.Start_Date)) ||
      (changes.End_Date !== undefined && !isValidIsoDate(changes.End_Date))
    ) {
      setError('Start date and target end date must be valid dates in YYYY-MM-DD format.');
      return;
    }
    const nextStart = changes.Start_Date ?? project.Start_Date;
    const nextEnd = changes.End_Date ?? project.End_Date;
    if (nextStart && nextEnd && nextEnd < nextStart) {
      setError('Target end date cannot be earlier than the start date.');
      return;
    }
    const nextStatus = changes.Project_Status ?? project.Project_Status;
    const requiresReason =
      startChanged ||
      endChanged ||
      (changes.Project_Status !== undefined &&
        changes.Project_Status !== project.Project_Status &&
        ['ON_HOLD', 'CANCELLED'].includes(nextStatus));
    const reason = changeReason.trim();
    if (requiresReason && !reason) {
      setError('Change reason is required when changing project dates or moving a project to On Hold or Cancelled.');
      return;
    }
    if (reason) changes.Change_Reason = reason;
    if (Object.keys(changes).every(key => key === 'Project_ID' || key === 'Change_Reason')) {
      setError('No project fields have changed.');
      return;
    }

    savingRequest.current = true;
    setSaving(true);
    setError(undefined);
    try {
      const updated = await projectService.updateProjectApi(project.Project_ID, changes);
      let refreshWarning: string | undefined;
      try {
        const refreshed = await projectDetailsService.getByProjectId(project.Project_ID, [], []);
        if (!refreshed || refreshed.Project.Project_ID !== project.Project_ID) {
          refreshWarning = 'Updated project details were not returned by the refresh request.';
        } else {
          setProject(refreshed.Project);
          const refreshedValues = updateValuesFromProject(refreshed.Project);
          setOriginalValues(refreshedValues);
          setValues(refreshedValues);
        }
      } catch (refreshError) {
        refreshWarning = refreshError instanceof Error
          ? refreshError.message
          : 'Updated project details could not be refreshed.';
      }
      onUpdated(updated.Project_Code, refreshWarning);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Project update failed unexpectedly.');
    } finally {
      savingRequest.current = false;
      setSaving(false);
    }
  }

  if (loading) {
    return <section className={`project-details-state${ownerPortal ? ' owner-project-ui' : ''}`} role="status"><span className="project-loading-spinner"/>Loading project details…</section>;
  }
  if (error && !project) {
    return <section className={`project-details-state project-details-error${ownerPortal ? ' owner-project-ui' : ''}`} role="alert">
      <span className="project-details-state-icon">!</span>
      <h2>Project details unavailable</h2>
      <p>{error}</p>
      <button type="button" className="secondary-btn" onClick={onBack}>Back to Projects</button>
    </section>;
  }
  if (!project) return null;

  return <form className={`create-project-page${ownerPortal ? ' owner-project-ui' : ''}`} onSubmit={submitUpdate}>
    <section className="panel create-project-section">
      <div className="create-section-heading">
        <div><span className="section-step">PROJECT UPDATE</span><h2>{project.Project_Name}</h2><p>{project.Project_Code} · Edit supported project information.</p></div>
        <span className="section-count">{project.Project_Status.replaceAll('_', ' ')}</span>
      </div>
      <div className="project-update-identity">
        <label className="field-label">Project ID<input value={project.Project_ID} readOnly/></label>
        <label className="field-label">Project owner ID<input value={project.Project_Owner ?? 'Not returned by API'} readOnly/></label>
      </div>
      <div className="create-project-fields">
        {UPDATE_PROJECT_FIELDS.map(field => <label className="field-label" key={field.name}>
          {field.label}
          {field.type === 'textarea'
            ? <textarea rows={3} value={values[field.name] ?? ''} disabled={saving} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))}/>
            : <input
              type={field.type ?? 'text'}
              value={values[field.name] ?? ''}
              required={field.name === 'Project_Name'}
              disabled={saving}
              onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))}
            />}
        </label>)}
      </div>
      <label className="field-label project-update-reason">Change reason<input value={changeReason} disabled={saving} onChange={event => setChangeReason(event.target.value)} placeholder="Required for date or certain status changes"/></label>
      <p className="project-lookup-pending" role="note">Lookup-backed fields are not editable because user, client, and organization lookup APIs are unavailable. Existing backend values are preserved.</p>
      {error && <p className="create-project-error" role="alert">{error}</p>}
      <div className="create-project-actions">
        <span><i/> Changes are saved to the backend</span>
        <div>
          <button type="button" className="secondary-btn" onClick={onBack} disabled={saving}>Back to Projects</button>
          <button type="submit" className="primary-btn" disabled={saving}>{saving ? 'Saving changes…' : 'Save changes'} {!saving && <span>→</span>}</button>
        </div>
      </div>
    </section>
  </form>;
}

export function CreateProjectPage({
  ownerId,
  isSubmitting,
  error,
  onCancel,
  onSubmit,
  ownerPortal = false,
}: {
  ownerId: string;
  isSubmitting: boolean;
  error?: string;
  onCancel: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
  ownerPortal?: boolean;
}) {
  const [validationError, setValidationError] = useState<string>();
  const definition = getFormDefinition('projectCreate');
  if (!definition) throw new Error('Project creation form configuration is missing.');
  const informationFields = definition.fields.filter(field => field.section === 'information');
  const planningFields = definition.fields.filter(field => field.section === 'planning');
  const optionsByKey = {
    owners: ownerId ? [ownerId] : [],
    priorities: [],
    statuses: [],
    teams: [],
  };
  const values = { owner: ownerId };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const startDate = String(formData.get('start') ?? '');
    const endDate = String(formData.get('end') ?? '');
    if (!ownerId) {
      event.preventDefault();
      setValidationError('The authenticated user ID is unavailable. Configure VITE_USER_ID before creating a project.');
      return;
    }
    if (formData.get('owner') !== ownerId) {
      event.preventDefault();
      setValidationError('The project owner must match the authenticated user.');
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      event.preventDefault();
      setValidationError('Target end date cannot be earlier than the start date.');
      return;
    }
    setValidationError(undefined);
    void onSubmit(event);
  };

  return <form className={`create-project-page${ownerPortal ? ' owner-project-ui' : ''}`} onSubmit={submit}>
    <section className="panel create-project-section">
      <div className="create-section-heading"><div><span className="section-step">01 / PROJECT INFORMATION</span><h2>Project information</h2><p>Enter the key details and ownership for this project.</p></div><span className="section-count">1 of 2</span></div>
      <div className="create-project-fields"><ConfiguredFields fields={informationFields} values={values} optionsByKey={optionsByKey}/></div>
    </section>
    <section className="panel create-project-section">
      <div className="create-section-heading"><div><span className="section-step">02 / TIMELINE AND PLANNING</span><h2>Timeline and planning</h2><p>Set the expected schedule and initial delivery status.</p></div><span className="section-count">2 of 2</span></div>
      <div className="create-project-fields"><ConfiguredFields fields={planningFields} values={values} optionsByKey={optionsByKey}/></div>
      <div className="project-guidance"><span>i</span><div><b>Before creating the project</b><small>Review the project details, ownership, and timeline so everyone starts with a shared understanding of the objectives.</small></div></div>
      {(validationError || error || !ownerId) && <p className="create-project-error" role="alert">{validationError || error || 'Authenticated user ID is not configured. Set VITE_USER_ID to enable project creation.'}</p>}
      <div className="create-project-actions"><span><i/> Required fields</span><div><button type="button" className="secondary-btn" onClick={onCancel} disabled={isSubmitting}>Cancel</button><button type="submit" className="primary-btn" disabled={isSubmitting || !ownerId}>{isSubmitting ? 'Creating project…' : '＋ Create project'} {!isSubmitting && <span>→</span>}</button></div></div>
    </section>
  </form>;
}
