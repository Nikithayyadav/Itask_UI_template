import type { Notification, Page, Role } from '../../app/types';
import { ActivityPage } from '../activity/ActivityPage';
import { DocumentsPage } from '../documents/DocumentsPage';
import { FeedbackPage } from '../feedback/FeedbackPage';
import { NotificationsPage } from '../notifications/NotificationsPage';
import { ReportsPage } from '../reports/ReportsPage';
import { ReviewQueuePage } from '../reviews/ReviewQueuePage';
import { SubmissionsPage } from '../submissions/SubmissionsPage';
import { TeamTrackerPage } from '../team/TeamTrackerPage';

type Module=Role['modules'][number];
type PageProps={role:Role;module?:Module;transactionCode:string;onAction:()=>void;onTransaction:(module:Module,transaction:Module['transactions'][number])=>void};

export function ModulePanel({page,role,module,transactionCode,notifications,setNotifications,onAction,onTransaction}:{page:Page;role:Role;module?:Module;transactionCode:string;notifications:Notification[];setNotifications:(items:Notification[])=>void;onAction:()=>void;onTransaction:(module:Module,transaction:Module['transactions'][number])=>void}) {
  if(page==='Notifications') return <NotificationsPage notifications={notifications} setNotifications={setNotifications}/>;
  const pageProps:PageProps={role,module,transactionCode,onAction,onTransaction};
  switch(page) {
    case 'My Daily Activity': return <ActivityPage {...pageProps}/>;
    case 'My Submissions': return <SubmissionsPage {...pageProps}/>;
    case 'Documents & Evidence': return <DocumentsPage {...pageProps}/>;
    case 'Feedback & Reviews': return <FeedbackPage {...pageProps}/>;
    case 'Review Queue': return <ReviewQueuePage {...pageProps}/>;
    case 'Team Tracker': return <TeamTrackerPage {...pageProps}/>;
    case 'Reports': return <ReportsPage {...pageProps}/>;
    default: return <ReportsPage {...pageProps}/>;
  }
}
