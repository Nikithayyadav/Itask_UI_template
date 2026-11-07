import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  FileText,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  MessageSquare,
  Clock,
  Upload,
  Search,
  User,
} from "lucide-react";

export const iconRegistry = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  tasks: CheckSquare,
  notifications: Bell,
  documents: FileText,
  team: Users,
  reviews: ClipboardList,
  reports: BarChart3,
  settings: Settings,
  feedback: MessageSquare,
  activity: Clock,
  submissions: Upload,
  search: Search,
  profile: User,
};

export type IconName = keyof typeof iconRegistry;