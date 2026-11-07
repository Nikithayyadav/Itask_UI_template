import type { FormEvent } from 'react';
import type { ModalKind, Profile } from '../../app/types';
import type { Project } from '../../features/projects/types';
import type { Task } from '../../features/tasks/types';
import { ProfileSettingsFields } from '../../features/profile/ProfileSettingsFields';
import { QuickProjectFields } from '../../features/projects/QuickProjectFields';
import { QuickTaskFields } from '../../features/tasks/QuickTaskFields';
import { DailyActivityFields } from '../../features/activity/DailyActivityFields';
import { SubmissionFields } from '../../features/submissions/SubmissionFields';
import { ReviewFields } from '../../features/reviews/ReviewFields';

type WorkspaceModalProps = {
  modal: Exclude<ModalKind, null>;
  profile: Profile;
  projects: Project[];
  tasks: Task[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

const headings: Record<WorkspaceModalProps['modal'], string> = {
  project: 'Create a project', task: 'Create a task', activity: 'Log daily activity',
  submission: 'Submit for review', review: 'Review submission', profile: 'Profile settings',
};

export function WorkspaceModal({ modal, profile, projects, tasks, onClose, onSubmit }: WorkspaceModalProps) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <form className={`modal-card ${modal === 'profile' ? 'profile-modal' : ''}`} onSubmit={onSubmit}>
      <div className="modal-header"><div><span className="modal-kicker">WORKSPACE</span><h2>{headings[modal]}</h2></div><button type="button" className="close-btn" onClick={onClose} aria-label="Close dialog">×</button></div>
      <div className="modal-fields">
        {modal === 'profile' && <ProfileSettingsFields profile={profile}/>}
        {modal === 'project' && <QuickProjectFields/>}
        {modal === 'task' && <QuickTaskFields projects={projects}/>}
        {modal === 'activity' && <DailyActivityFields/>}
        {modal === 'submission' && <SubmissionFields tasks={tasks}/>}
        {modal === 'review' && <ReviewFields/>}
      </div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancel</button><button className="primary-btn" type="submit">{modal === 'submission' ? 'Submit for review' : modal === 'review' ? 'Save review' : modal === 'profile' ? 'Save profile' : 'Save'} <span>→</span></button></div>
    </form>
  </div>;
}
