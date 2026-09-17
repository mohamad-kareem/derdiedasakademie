import {
  LayoutDashboard, BookOpen, GraduationCap, ClipboardList, User, Users, Megaphone, Inbox,
  CalendarDays, Settings, LogOut, FileCheck2, Award, Home, Mail, Layers, MessageSquare,
} from "lucide-react";

const icons = {
  dashboard: LayoutDashboard,
  courses: BookOpen,
  learn: GraduationCap,
  assignments: ClipboardList,
  profile: User,
  students: Users,
  announcements: Megaphone,
  inbox: Inbox,
  calendar: CalendarDays,
  settings: Settings,
  logout: LogOut,
  grading: FileCheck2,
  certificate: Award,
  home: Home,
  mail: Mail,
  enrollments: Layers,
  message: MessageSquare,
};

export default function Icon({ name, ...props }) {
  const Cmp = icons[name] || BookOpen;
  return <Cmp {...props} />;
}
