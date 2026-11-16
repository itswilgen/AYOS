/** Admin console configuration and formatting helpers shared by every admin section. */
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  ClipboardList,
  Eye,
  FileText,
  Gauge,
  KeyRound,
  MapPin,
  MessageSquareWarning,
  Settings2,
  ShieldCheck,
  Tag,
  Users,
  Wallet,
} from "lucide-react";
import { type AdminRoleOption } from "../../services/admin.service";
import { apiTime } from "../../lib/time/api-time";

export type RecordValue = Record<string, unknown>;
/** Sidebar groups, in nav order. Each section names one, so a new section can't silently drop out of the sidebar. */
export const navGroups = [
  "Operations",
  "Marketplace",
  "Trust & payments",
  "Platform",
] as const;
export type Section = {
  id: string;
  label: string;
  permission: string;
  icon: typeof Gauge;
  group: (typeof navGroups)[number] | "Account";
};
export const sections: Section[] = [
  {
    id: "dashboard",
    label: "Overview",
    permission: "dashboard.view",
    icon: Gauge,
    group: "Operations",
  },
  {
    id: "applications",
    label: "Provider applications",
    permission: "providers.review",
    icon: BriefcaseBusiness,
    group: "Operations",
  },
  {
    id: "providers",
    label: "Service providers",
    permission: "providers.view",
    icon: Building2,
    group: "Operations",
  },
  {
    id: "users",
    label: "Users",
    permission: "users.view",
    icon: Users,
    group: "Operations",
  },
  {
    id: "listings",
    label: "Provider listings",
    permission: "listings.manage",
    icon: Eye,
    group: "Operations",
  },
  {
    id: "requests",
    label: "Service requests",
    permission: "requests.view",
    icon: ClipboardList,
    group: "Operations",
  },
  {
    id: "categories",
    label: "Service categories",
    permission: "categories.manage",
    icon: Tag,
    group: "Marketplace",
  },
  {
    id: "locations",
    label: "Supported locations",
    permission: "locations.manage",
    icon: MapPin,
    group: "Marketplace",
  },
  {
    id: "reviews",
    label: "Reviews",
    permission: "reviews.view",
    icon: BadgeCheck,
    group: "Trust & payments",
  },
  {
    id: "reports",
    label: "Reports",
    permission: "reports.manage",
    icon: MessageSquareWarning,
    group: "Trust & payments",
  },
  {
    id: "disputes",
    label: "Disputes",
    permission: "disputes.manage",
    icon: AlertTriangle,
    group: "Trust & payments",
  },
  {
    id: "payments",
    label: "Activation payments",
    permission: "payments.manage",
    icon: Wallet,
    group: "Trust & payments",
  },
  {
    id: "settings",
    label: "Platform settings",
    permission: "settings.manage",
    icon: Settings2,
    group: "Platform",
  },
  {
    id: "notices",
    label: "Notifications & notices",
    permission: "notices.manage",
    icon: Bell,
    group: "Platform",
  },
  {
    id: "audit",
    label: "Audit logs",
    permission: "audit.view",
    icon: FileText,
    group: "Platform",
  },
  {
    id: "analytics",
    label: "Reports & analytics",
    permission: "analytics.view",
    icon: Activity,
    group: "Platform",
  },
  {
    id: "security",
    label: "Admin security",
    permission: "security.view",
    icon: ShieldCheck,
    group: "Platform",
  },
];
/** Every administrator can manage their own sign-in, whatever their role. */
export const accountSection: Section = {
  id: "account",
  label: "My account",
  permission: "",
  icon: KeyRound,
  group: "Account",
};
export const asText = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
export const asNumber = (value: unknown) => Number(value ?? 0).toLocaleString("en-PH");
export const dateText = (value: unknown) =>
  value
    ? apiTime(String(value)).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
export const humanize = (value: unknown) =>
  asText(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
/** Empty unless the signed-in admin may add administrators. */
export const assignableRoles = (security: RecordValue | null) =>
  Array.isArray(security?.assignableRoles)
    ? (security.assignableRoles as AdminRoleOption[])
    : [];
