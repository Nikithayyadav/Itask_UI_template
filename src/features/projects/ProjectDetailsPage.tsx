
import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Project } from './types';
import type { Task } from '../tasks/types';
import type {
  ProjectDetailsResponse,
  ProjectDetailsTab,
  ProjectDocument,
  ProjectDetailTask,
} from './types';
import { projectDetailsService } from '../../services/resources/projectDetails';

const TABS: ProjectDetailsTab[] = [
  'Overview',
  'Tasks',
  'Team',
  'Milestones',
  'Documents',
  'Activity',
];

const TASK_STATUSES = [
  'All statuses',
  'To do',
  'In progress',
  'In review',
  'Done',
];

const TASK_PAGE_SIZE = 5;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
}

function statusClass(value: string): string {
  return value.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-');
}

export function ProjectDetailsPage({
  projectId,
  projects,
  tasks,
  onBack,
  ownerPortal = false,
}: {
  projectId?: string;
  projects: Project[];
  tasks: Task[];
  onBack: () => void;
  ownerPortal?: boolean;
}) {
  const [details, setDetails] = useState<ProjectDetailsResponse>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [activeTab, setActiveTab] = useState<ProjectDetailsTab>('Overview');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatus, setTaskStatus] = useState(TASK_STATUSES[0]);
  const [taskPage, setTaskPage] = useState(1);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [documentNotice, setDocumentNotice] = useState('');
  const uploadRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  useEffect(() => {
    const activeRequest = ++requestId.current;

    setDetails(undefined);
    setDocuments([]);
    setDocumentNotice('');
    setError(undefined);
    setActiveTab('Overview');
    setLoading(true);

    if (!projectId) {
      setLoading(false);
      setError('Select a project from View My Projects to open its details.');
      return;
    }

    void projectDetailsService
      .getByProjectId(projectId, projects, tasks)
      .then(result => {
        if (activeRequest !== requestId.current) return;

        if (!result) {
          setError('The selected project could not be found.');
          return;
        }

        setDetails(result);
      })
      .catch(loadError => {
        if (activeRequest === requestId.current) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Project details could not be loaded.',
          );
        }
      })
      .finally(() => {
        if (activeRequest === requestId.current) {
          setLoading(false);
        }
      });

    return () => {
      requestId.current += 1;
    };
  }, [projectId, projects, tasks]);

  const visibleTasks = useMemo(() => {
    const search = taskSearch.trim().toLowerCase();

    return (details?.Tasks ?? []).filter(
      task =>
        (!search ||
          `${task.Task_ID} ${task.Task_Name} ${task.Assignee_Name}`
            .toLowerCase()
            .includes(search)) &&
        (taskStatus === TASK_STATUSES[0] || task.Status === taskStatus),
    );
  }, [details?.Tasks, taskSearch, taskStatus]);

  const taskPages = Math.max(
    1,
    Math.ceil(visibleTasks.length / TASK_PAGE_SIZE),
  );

  const pageTasks = visibleTasks.slice(
    (taskPage - 1) * TASK_PAGE_SIZE,
    taskPage * TASK_PAGE_SIZE,
  );

  function changeTaskSearch(value: string) {
    setTaskSearch(value);
    setTaskPage(1);
  }

  function changeTaskStatus(value: string) {
    setTaskStatus(value);
    setTaskPage(1);
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);

    if (!selectedFiles.length) return;

    const now = new Date().toLocaleDateString('en', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const uploaded = selectedFiles.map((file, index) => ({
      Document_ID: `LOCAL-${Date.now()}-${index}`,
      Name: file.name,
      File_Type: file.name.split('.').pop()?.toUpperCase() ?? 'FILE',
      Uploaded_By: 'Current user',
      Uploaded_Date: now,
      Size:
        file.size < 1024 * 1024
          ? `${Math.max(1, Math.round(file.size / 1024))} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));

    setDocuments(current => [...uploaded, ...current]);

    setDocumentNotice(
      `${uploaded.length} file${uploaded.length === 1 ? '' : 's'} added for this session only. Upload persistence is not connected.`,
    );

    event.currentTarget.value = '';
  }

  if (loading) {
    return (
      <section className={`project-details-state${ownerPortal ? ' owner-project-ui' : ''}`} role="status">
        <span className="project-loading-spinner" />
        Loading project details…
      </section>
    );
  }

  if (error || !details) {
    return (
      <section
        className={`project-details-state project-details-error${ownerPortal ? ' owner-project-ui' : ''}`}
        role="alert"
      >
        <span className="project-details-state-icon">!</span>
        <h2>Project details unavailable</h2>
        <p>{error ?? 'Project details could not be loaded.'}</p>
        <button
          type="button"
          className="secondary-btn"
          onClick={onBack}
        >
          Back to Projects
        </button>
      </section>
    );
  }

  const project = details.Project;
  const allDocuments = [...documents, ...details.Documents];

  return (
    <section className={`project-details-page${ownerPortal ? ' owner-project-ui' : ''}`}>
      <div className="project-details-banner">
        <div className="project-details-banner-top">
          <button
            type="button"
            className="project-back-button"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span> Back to Projects
          </button>

          <span className="project-mock-pill">
            <i /> Live API data
          </span>
        </div>

        <div className="project-details-heading">
          <div className="project-details-mark" aria-hidden="true">
            {initials(project.Project_Name)}
          </div>

          <div className="project-details-title">
            <div className="project-details-badges">
              <span
                className={`project-detail-badge status-${statusClass(project.Project_Status)}`}
              >
                {project.Project_Status.replaceAll('_', ' ')}
              </span>

              <span
                className={`project-detail-badge priority-${statusClass(project.Priority)}`}
              >
                {project.Priority} priority
              </span>

              <span className="project-details-type">
                {project.Project_Type}
              </span>
            </div>

            <h2>{project.Project_Name}</h2>

            <div className="project-details-identifiers">
              <span>
                ID <b>{project.Project_ID}</b>
              </span>
              <i />
              <span>
                Code <b>{project.Project_Code}</b>
              </span>
            </div>

            <p>{project.Project_Description}</p>
          </div>
        </div>

        <div className="project-summary-cards">
          <article className="project-summary-card project-progress-summary">
            <span>Overall progress</span>
            <b>{project.Progress_Percentage}%</b>
            <div className="project-details-progress-track">
              <i
                style={{
                  width: `${Math.min(100, Math.max(0, project.Progress_Percentage))}%`,
                }}
              />
            </div>
          </article>

          <article className="project-summary-card">
            <span>Total tasks</span>
            <b>{project.Total_Tasks}</b>
            <small>Across this project</small>
          </article>

          <article className="project-summary-card">
            <span>Completed tasks</span>
            <b>{project.Completed_Tasks}</b>
            <small>
              {project.Total_Tasks
                ? Math.round(
                    (project.Completed_Tasks / project.Total_Tasks) * 100,
                  )
                : 0}
              % of total
            </small>
          </article>

          <article className="project-summary-card">
            <span>Overdue tasks</span>
            <b className={project.Overdue_Tasks ? 'has-overdue' : ''}>
              {project.Overdue_Tasks}
            </b>
            <small>
              {project.Overdue_Tasks ? 'Needs attention' : 'On schedule'}
            </small>
          </article>
        </div>
      </div>

      <nav
        className="project-details-tabs"
        aria-label="Project details sections"
      >
        {TABS.map(tab => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {tab === 'Tasks' && <span>{details.Tasks.length}</span>}
          </button>
        ))}
      </nav>

      {activeTab === 'Overview' && (
        <div className="project-overview-grid">
          <article className="project-detail-card project-information-card">
            <div className="project-detail-card-heading">
              <div>
                <h3>Project information</h3>
                <p>Core details and delivery timeline</p>
              </div>
              <span className="project-card-icon">▤</span>
            </div>

            <div className="project-info-grid">
              <div>
                <small>Project owner</small>
                <b>{project.Project_Owner_Name}</b>
              </div>
              <div>
                <small>Project manager</small>
                <b>{project.Project_Manager_Name}</b>
              </div>
              <div>
                <small>Client</small>
                <b>{project.Client_Name}</b>
              </div>
              <div>
                <small>Department</small>
                <b>{project.Department}</b>
              </div>
              <div>
                <small>Start date</small>
                <b>{project.Start_Date}</b>
              </div>
              <div>
                <small>End date</small>
                <b>{project.End_Date}</b>
              </div>
              <div>
                <small>Project health</small>
                <b>
                  <span
                    className={`health-dot health-${statusClass(project.Health_Status)}`}
                  />
                  {project.Health_Status}
                </b>
              </div>
              <div>
                <small>Project type</small>
                <b>{project.Project_Type}</b>
              </div>
            </div>
          </article>

          <article className="project-detail-card project-description-card">
            <div className="project-detail-card-heading">
              <div>
                <h3>Project description</h3>
                <p>Scope and delivery context</p>
              </div>
              <span className="project-card-icon">✦</span>
            </div>

            <p>{project.Project_Description}</p>

            <div className="project-description-progress">
              <div>
                <span>Delivery progress</span>
                <b>{project.Progress_Percentage}%</b>
              </div>

              <div className="project-details-progress-track">
                <i
                  style={{
                    width: `${Math.min(100, Math.max(0, project.Progress_Percentage))}%`,
                  }}
                />
              </div>

              <small>
                {project.Completed_Tasks} of {project.Total_Tasks} tasks
                complete
              </small>
            </div>
          </article>
        </div>
      )}

      {activeTab === 'Tasks' && (
        <article className="project-detail-card project-tasks-card">
          <div className="project-detail-card-heading">
            <div>
              <h3>Project tasks</h3>
              <p>Search and filter the work assigned to this project.</p>
            </div>
          </div>

          <div className="project-task-toolbar">
            <label className="project-task-search">
              <span aria-hidden="true">⌕</span>
              <input
                aria-label="Search project tasks"
                placeholder="Search tasks or assignees..."
                value={taskSearch}
                onChange={event => changeTaskSearch(event.target.value)}
              />
            </label>

            <label className="project-task-status">
              Status
              <select
                value={taskStatus}
                onChange={event => changeTaskStatus(event.target.value)}
              >
                {TASK_STATUSES.map(status => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
          </div>

          {pageTasks.length ? (
            <div className="project-detail-table-wrap">
              <table className="project-detail-table">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Assignee</th>
                    <th>Due date</th>
                    <th>Priority</th>
                    <th>Progress</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {pageTasks.map(task => (
                    <tr key={task.Task_ID}>
                      <TaskRow task={task} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="project-detail-empty">
              <b>No task details available</b>
              <span>
                Task-level API integration is not available yet.
              </span>
            </div>
          )}

          <div className="project-task-pagination">
            <span>
              Showing{' '}
              {visibleTasks.length
                ? (taskPage - 1) * TASK_PAGE_SIZE + 1
                : 0}
              –{Math.min(taskPage * TASK_PAGE_SIZE, visibleTasks.length)} of{' '}
              {visibleTasks.length} tasks
            </span>

            <div>
              <button
                type="button"
                disabled={taskPage <= 1}
                aria-label="Previous task page"
                onClick={() => setTaskPage(page => page - 1)}
              >
                ‹
              </button>

              <b>
                {taskPage} / {taskPages}
              </b>

              <button
                type="button"
                disabled={taskPage >= taskPages}
                aria-label="Next task page"
                onClick={() => setTaskPage(page => page + 1)}
              >
                ›
              </button>
            </div>
          </div>
        </article>
      )}

      {activeTab === 'Team' && (
        <section className="project-tab-section">
          <div className="project-section-intro">
            <div>
              <h3>Project team</h3>
              <p>People coordinating delivery and outcomes.</p>
            </div>
            <span>{details.Team.length} members</span>
          </div>

          {details.Team.length > 0 ? (
            <div className="project-team-grid">
              {details.Team.map(member => (
                <article
                  className="project-detail-card project-team-card"
                  key={member.Member_ID}
                >
                  <span className="project-team-avatar">
                    {member.Initials}
                  </span>
                  <div>
                    <h4>{member.Name}</h4>
                    <span className="project-team-role">{member.Role}</span>
                    <p>{member.Responsibility}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="project-detail-empty">
              <b>No team details available</b>
              <span>Project member API integration is pending.</span>
            </div>
          )}
        </section>
      )}

      {activeTab === 'Milestones' && (
        <article className="project-detail-card project-milestones-card">
          <div className="project-detail-card-heading">
            <div>
              <h3>Milestone timeline</h3>
              <p>Key checkpoints for this project</p>
            </div>
          </div>

          {details.Milestones.length > 0 ? (
            <div className="project-milestone-list">
              {details.Milestones.map((milestone, index) => (
                <div
                  className="project-milestone"
                  key={milestone.Milestone_ID}
                >
                  <div
                    className={`project-milestone-marker milestone-${statusClass(milestone.Status)}`}
                  >
                    {milestone.Status === 'COMPLETED'
                      ? '✓'
                      : String(index + 1).padStart(2, '0')}
                  </div>

                  {index < details.Milestones.length - 1 && (
                    <span className="project-milestone-connector" />
                  )}

                  <div className="project-milestone-content">
                    <div>
                      <h4>{milestone.Name}</h4>
                      <span
                        className={`project-detail-badge status-${statusClass(milestone.Status)}`}
                      >
                        {milestone.Status.replaceAll('_', ' ')}
                      </span>
                    </div>
                    <p>{milestone.Description}</p>
                    <small>Target date · {milestone.Target_Date}</small>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="project-detail-empty">
              <b>No milestone details available</b>
              <span>Milestone API integration is pending.</span>
            </div>
          )}
        </article>
      )}

      {activeTab === 'Documents' && (
        <article className="project-detail-card project-documents-card">
          <div className="project-detail-card-heading">
            <div>
              <h3>Project documents</h3>
              <p>Files associated with this project.</p>
            </div>

            <button
              type="button"
              className="project-upload-button"
              onClick={() => uploadRef.current?.click()}
            >
              ＋ Upload document
            </button>

            <input
              ref={uploadRef}
              className="project-upload-input"
              type="file"
              multiple
              onChange={handleUpload}
              aria-label="Choose documents to upload"
            />
          </div>

          <p className="project-upload-notice">
            Document upload is currently available for this session only.
            Backend integration is pending.
          </p>

          {documentNotice && (
            <p className="project-upload-feedback" role="status">
              {documentNotice}
            </p>
          )}

          {allDocuments.length ? (
            <div className="project-document-list">
              {allDocuments.map(document => (
                <article
                  className="project-document-row"
                  key={document.Document_ID}
                >
                  <span
                    className={`project-file-icon file-${statusClass(document.File_Type)}`}
                  >
                    {document.File_Type.slice(0, 4)}
                  </span>

                  <div className="project-document-name">
                    <b>{document.Name}</b>
                    <small>
                      {document.File_Type} · {document.Size}
                    </small>
                  </div>

                  <span className="project-document-uploader">
                    {document.Uploaded_By}
                  </span>

                  <span className="project-document-date">
                    {document.Uploaded_Date}
                  </span>

                  <button
                    type="button"
                    className="project-document-action"
                    aria-label={`Preview ${document.Name}`}
                    onClick={() =>
                      setDocumentNotice(
                        `Preview is not connected for ${document.Name}.`,
                      )
                    }
                  >
                    View
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="project-detail-empty">
              <b>No documents available</b>
              <span>
                No documents are available from the backend yet. You can
                select files to add them to this session.
              </span>
            </div>
          )}
        </article>
      )}

      {activeTab === 'Activity' && (
        <article className="project-detail-card project-activity-card">
          <div className="project-detail-card-heading">
            <div>
              <h3>Project activity</h3>
              <p>Recent updates in the project workspace.</p>
            </div>
          </div>

          {details.Activity.length > 0 ? (
            <div className="project-activity-list">
              {details.Activity.map(activity => (
                <article
                  className="project-activity-item"
                  key={activity.Activity_ID}
                >
                  <span
                    className={`project-activity-marker activity-${statusClass(activity.Type)}`}
                  >
                    {activity.Type === 'PROJECT'
                      ? '✦'
                      : activity.Type === 'PROGRESS'
                        ? '↗'
                        : '•'}
                  </span>

                  <div>
                    <p>{activity.Description}</p>
                    <small>
                      {activity.Actor_Name} <i /> {activity.Occurred_At}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="project-detail-empty">
              <b>No activity available</b>
              <span>Project activity API integration is pending.</span>
            </div>
          )}
        </article>
      )}
    </section>
  );
}

function TaskRow({ task }: { task: ProjectDetailTask }) {
  return (
    <>
      <td>
        <div className="project-task-name">
          <b>{task.Task_Name}</b>
          <small>{task.Task_ID}</small>
        </div>
      </td>

      <td>
        <span className="project-task-assignee">{task.Assignee_Name}</span>
      </td>

      <td>{task.Due_Date}</td>

      <td>
        <span
          className={`project-task-priority priority-${statusClass(task.Priority)}`}
        >
          {task.Priority}
        </span>
      </td>

      <td>
        <div className="project-task-progress">
          <span>
            <i
              style={{
                width: `${Math.min(100, Math.max(0, task.Progress_Percentage))}%`,
              }}
            />
          </span>
          <small>{task.Progress_Percentage}%</small>
        </div>
      </td>

      <td>
        <span
          className={`project-detail-badge status-${statusClass(task.Status)}`}
        >
          {task.Status}
        </span>
      </td>
    </>
  );
}
