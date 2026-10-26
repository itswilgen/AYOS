import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  Bell,
  BriefcaseBusiness,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Eye,
  FileText,
  Gauge,
  KeyRound,
  MapPin,
  Menu,
  MessageSquareWarning,
  Search,
  Settings2,
  ShieldCheck,
  Tag,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import Brand from "../../components/common/Brand";
import AddAdministrator from "./AddAdministrator";
import AdminAccount from "./AdminAccount";
import { backendUrl } from "../../lib/api/client";
import { useAuth } from "../../lib/auth/useAuth";
import {
  adminService,
  type AdminDashboard,
  type AdminPageResult,
  type AdminRoleOption,
} from "../../services/admin.service";
import "./admin.css";

type RecordValue = Record<string, unknown>;
/** Sidebar groups, in nav order. Each section names one, so a new section can't silently drop out of the sidebar. */
const navGroups = [
  "Operations",
  "Marketplace",
  "Trust & payments",
  "Platform",
] as const;
type Section = {
  id: string;
  label: string;
  permission: string;
  icon: typeof Gauge;
  group: (typeof navGroups)[number] | "Account";
};
const sections: Section[] = [
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
const accountSection: Section = {
  id: "account",
  label: "My account",
  permission: "",
  icon: KeyRound,
  group: "Account",
};
const asText = (value: unknown) =>
  value == null || value === "" ? "—" : String(value);
const asNumber = (value: unknown) => Number(value ?? 0).toLocaleString("en-PH");
const dateText = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("en-PH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const humanize = (value: unknown) =>
  asText(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
/** Empty unless the signed-in admin may add administrators. */
const assignableRoles = (security: RecordValue | null) =>
  Array.isArray(security?.assignableRoles)
    ? (security.assignableRoles as AdminRoleOption[])
    : [];

function StatusPill({ value }: { value: unknown }) {
  const status = asText(value).toLowerCase().replaceAll("_", "-");
  return <span className={`admin-status is-${status}`}>{humanize(value)}</span>;
}

function Panel({
  title,
  children,
  action,
}: {
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="admin-panel">
      {(title || action) && (
        <header className="admin-panel-head">
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

function Empty({
  title = "Nothing here yet",
  detail = "Items will appear here when AYOS has activity.",
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className="admin-empty">
      <span>
        <ClipboardList size={20} />
      </span>
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

function DataTable({
  rows,
  columns,
  onRowClick,
}: {
  rows: RecordValue[];
  columns: {
    key: string;
    label: string;
    render?: (row: RecordValue) => ReactNode;
  }[];
  onRowClick?: (row: RecordValue) => void;
}) {
  if (!rows.length) return <Empty />;
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={asText(row.id ?? index)}
              className={onRowClick ? "is-clickable" : ""}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render ? column.render(row) : asText(row[column.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: unknown;
  icon: typeof Gauge;
  tone: string;
  hint: string;
}) {
  const attention = (tone === "orange" || tone === "red") && Number(value) > 0;
  // Rates arrive already formatted ("6%"), so show them as given rather than as "NaN".
  const shown =
    typeof value === "string" && Number.isNaN(Number(value))
      ? value
      : asNumber(value);
  return (
    <article className={`admin-metric${attention ? " needs-attention" : ""}`}>
      <span className={`admin-metric-icon ${tone}`} aria-hidden="true">
        <Icon size={19} />
      </span>
      <div>
        <span>{label}</span>
        <strong
          className={
            Number.parseFloat(String(value ?? 0)) === 0 ? "is-zero" : undefined
          }
        >
          {shown}
        </strong>
        <small>{hint}</small>
      </div>
    </article>
  );
}

export default function AdminPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const sectionId = pathname.split("/")[2] || "dashboard";
  const section =
    sectionId === accountSection.id
      ? accountSection
      : (sections.find((item) => item.id === sectionId) ?? sections[0]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const permissionsLoaded = useRef(false);
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [rows, setRows] = useState<RecordValue[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [settings, setSettings] = useState<RecordValue>({});
  const [special, setSpecial] = useState<RecordValue | null>(null);
  const [detail, setDetail] = useState<RecordValue | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [category, setCategory] = useState({
    name: "",
    slug: "",
    description: "",
  });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    body: "",
    is_active: true,
  });
  const [reviewNote, setReviewNote] = useState("");
  const [addingAdministrator, setAddingAdministrator] = useState(false);

  const visibleSections = useMemo(
    () => sections.filter((item) => permissions.includes(item.permission)),
    [permissions],
  );
  const load = useCallback(
    async (targetPage = 1, search = "") => {
      setLoading(true);
      setError("");
      setNotice("");
      setDetail(null);
      setPage(targetPage);
      try {
        if (!permissionsLoaded.current) {
          setPermissions((await adminService.access()).permissions);
          permissionsLoaded.current = true;
        }
        if (section.id === accountSection.id) {
          setRows([]);
          setSpecial(null);
        } else if (section.id === "dashboard") {
          const response = await adminService.dashboard();
          setDashboard(response.data);
          setRows([]);
          setSpecial(null);
        } else if (section.id === "settings") {
          const response =
            await adminService.get<RecordValue>("/admin/settings");
          setSettings(response.data);
          setSpecial(null);
          setRows([]);
        } else if (section.id === "analytics" || section.id === "security") {
          const response = await adminService.get<RecordValue>(
            `/admin/${section.id}`,
          );
          setSpecial(response.data);
          setRows([]);
        } else if (section.id === "categories") {
          const response =
            await adminService.get<RecordValue[]>("/admin/categories");
          setRows(response.data);
          setMeta({
            current_page: 1,
            last_page: 1,
            total: response.data.length,
          });
          setSpecial(null);
        } else {
          const pathBySection: Record<string, string> = {
            applications: "/admin/provider-applications",
            providers: "/admin/providers",
            users: "/admin/users",
            listings: "/admin/listings",
            requests: "/admin/requests",
            locations: "/admin/locations",
            reviews: "/admin/reviews",
            reports: "/admin/reports",
            disputes: "/admin/disputes",
            payments: "/admin/activation-payments",
            notices: "/admin/notices",
            audit: "/admin/audit-logs",
          };
          const params: Record<string, string | number | undefined> = {
            page: targetPage,
            per_page: 20,
            q: search || undefined,
          };
          if (section.id === "applications") params.all = "1";
          const response = (await adminService.list<RecordValue>(
            pathBySection[section.id],
            params,
          )) as AdminPageResult<RecordValue>;
          setRows(response.data);
          setMeta({
            current_page: response.current_page,
            last_page: response.last_page,
            total: response.total,
          });
          setSpecial(null);
        }
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not load this admin section.",
        );
      } finally {
        setLoading(false);
      }
    },
    [section.id],
  );

  useEffect(() => {
    void Promise.resolve().then(() => load(1, ""));
  }, [load]);

  const mutate = async (
    path: string,
    method: string,
    body?: unknown,
    success = "Changes saved.",
  ) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await adminService.send(path, method, body);
      setNotice(success);
      setDetail(null);
      await load(page, query);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The change could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (path: string) => {
    setError("");
    setDetail({ loading: true });
    try {
      setDetail((await adminService.get<RecordValue>(path)).data);
    } catch (cause) {
      setDetail(null);
      setError(
        cause instanceof Error ? cause.message : "Could not load details.",
      );
    }
  };

  const search = (event: FormEvent) => {
    event.preventDefault();
    void load(1, query);
  };
  const saveSettings = (event: FormEvent) => {
    event.preventDefault();
    void mutate(
      "/admin/settings",
      "PUT",
      settings,
      "Platform settings updated.",
    );
  };
  const createCategory = (event: FormEvent) => {
    event.preventDefault();
    void mutate(
      editingCategoryId
        ? `/admin/categories/${editingCategoryId}`
        : "/admin/categories",
      editingCategoryId ? "PUT" : "POST",
      category,
      editingCategoryId
        ? "Service category updated."
        : "Service category created.",
    ).then(() => {
      setCategory({ name: "", slug: "", description: "" });
      setEditingCategoryId(null);
    });
  };
  const saveNotice = (event: FormEvent) => {
    event.preventDefault();
    void mutate(
      "/admin/notices",
      "POST",
      noticeForm,
      "Platform notice saved.",
    ).then(() => setNoticeForm({ title: "", body: "", is_active: true }));
  };
  /** Updates the administrator list behind the add dialog. `load` would show the loading state and hide the view. */
  const refreshSecurity = async () => {
    try {
      setSpecial((await adminService.get<RecordValue>("/admin/security")).data);
    } catch {
      // The list catches up the next time this section loads.
    }
  };
  const signOutAdmin = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  const actionCell = (row: RecordValue) => {
    const id = asText(row.id);
    if (section.id === "applications")
      return (
        <div className="admin-row-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void openDetail(`/admin/provider-applications/${id}`);
            }}
          >
            Review
          </button>
          <button
            type="button"
            className="is-positive"
            disabled={saving}
            onClick={(event) => {
              event.stopPropagation();
              void mutate(
                `/admin/provider-applications/${id}/decision`,
                "POST",
                { status: "approved" },
                "Provider application approved.",
              );
            }}
          >
            Approve
          </button>
        </div>
      );
    if (section.id === "users")
      return row.status === "suspended" ? (
        <button
          type="button"
          className="admin-text-action is-positive"
          disabled={saving}
          onClick={(event) => {
            event.stopPropagation();
            void mutate(
              `/admin/users/${id}/status`,
              "PATCH",
              { status: "active" },
              "Account reactivated.",
            );
          }}
        >
          Reactivate
        </button>
      ) : (
        <button
          type="button"
          className="admin-text-action is-danger"
          disabled={saving}
          onClick={(event) => {
            event.stopPropagation();
            const reason = window.prompt("Reason for suspending this account:");
            if (reason?.trim())
              void mutate(
                `/admin/users/${id}/status`,
                "PATCH",
                { status: "suspended", reason },
                "Account suspended.",
              );
          }}
        >
          Suspend
        </button>
      );
    if (section.id === "providers")
      return (
        <div className="admin-row-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void openDetail(`/admin/providers/${id}`);
            }}
          >
            View
          </button>
          <button
            type="button"
            className={row.status === "suspended" ? "is-positive" : "is-danger"}
            onClick={(event) => {
              event.stopPropagation();
              const reason = window.prompt(
                row.status === "suspended"
                  ? "Reason for reactivating this provider:"
                  : "Reason for suspending this provider:",
              );
              if (reason?.trim())
                void mutate(
                  `/admin/providers/${id}/status`,
                  "PATCH",
                  {
                    status:
                      row.status === "suspended" ? "approved" : "suspended",
                    reason,
                  },
                  row.status === "suspended"
                    ? "Provider reactivated."
                    : "Provider suspended.",
                );
            }}
          >
            {row.status === "suspended" ? "Reactivate" : "Suspend"}
          </button>
        </div>
      );
    if (section.id === "listings")
      return (
        <div className="admin-row-actions">
          {["pending", "rejected"].includes(asText(row.cover_status)) && (
            <button
              type="button"
              className="is-positive"
              disabled={saving}
              onClick={(event) => {
                event.stopPropagation();
                void mutate(
                  `/admin/listings/service/${id}/cover-review`,
                  "POST",
                  { decision: "approved" },
                  "Cover approved. The provider has been notified.",
                );
              }}
            >
              Approve cover
            </button>
          )}
          {["pending", "approved"].includes(asText(row.cover_status)) && (
            <button
              type="button"
              className="is-danger"
              disabled={saving}
              onClick={(event) => {
                event.stopPropagation();
                const reason = window.prompt(
                  "Tell the provider why the cover was not approved (for example: remove the phone number from the poster):",
                );
                if (reason?.trim())
                  void mutate(
                    `/admin/listings/service/${id}/cover-review`,
                    "POST",
                    { decision: "rejected", reason },
                    "Cover rejected. The provider has been notified.",
                  );
              }}
            >
              Reject cover
            </button>
          )}
          <button
            type="button"
            className={row.is_visible ? "is-danger" : "is-positive"}
            disabled={saving}
            onClick={(event) => {
              event.stopPropagation();
              const reason = window.prompt(
                row.is_visible
                  ? "Reason for hiding this listing:"
                  : "Reason for restoring this listing:",
              );
              if (reason?.trim())
                void mutate(
                  `/admin/listings/${asText(row.type)}/${id}/visibility`,
                  "PATCH",
                  { is_visible: !row.is_visible, reason },
                  "Listing visibility updated.",
                );
            }}
          >
            {row.is_visible ? "Hide listing" : "Restore listing"}
          </button>
        </div>
      );
    if (section.id === "locations")
      return (
        <button
          type="button"
          className="admin-text-action"
          onClick={(event) => {
            event.stopPropagation();
            void mutate(
              `/admin/locations/${asText(row.code)}/status`,
              "PATCH",
              { is_active: !row.is_active },
              row.is_active
                ? "Marketplace area disabled."
                : "Marketplace area enabled.",
            );
          }}
        >
          {row.is_active ? "Disable" : "Enable"}
        </button>
      );
    if (section.id === "reports")
      return (
        <div className="admin-row-actions">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              void mutate(
                `/admin/reports/${id}/review`,
                "POST",
                { status: "dismissed", note: "Reviewed by AYOS moderation." },
                "Report dismissed.",
              );
            }}
          >
            Dismiss
          </button>
          {["service", "portfolio"].includes(asText(row.target_type)) && (
            <button
              type="button"
              className="is-danger"
              onClick={(event) => {
                event.stopPropagation();
                void mutate(
                  `/admin/reports/${id}/review`,
                  "POST",
                  {
                    status: "actioned",
                    action: "hide",
                    note: "Listing hidden after report review.",
                  },
                  "Report action recorded.",
                );
              }}
            >
              Hide item
            </button>
          )}
        </div>
      );
    if (
      section.id === "disputes" &&
      ["open", "in_review"].includes(asText(row.status))
    )
      return (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setReviewNote("");
            void openDetail(`/admin/disputes/${id}`);
          }}
        >
          Review dispute
        </button>
      );
    if (section.id === "payments" && row.status === "pending")
      return (
        <div className="admin-row-actions">
          <button
            type="button"
            className="is-positive"
            onClick={(event) => {
              event.stopPropagation();
              if (
                window.confirm(
                  "Confirm this manual payment reference and grant lifetime provider access?",
                )
              )
                void mutate(
                  `/admin/activation-payments/${id}/review`,
                  "POST",
                  { status: "confirmed" },
                  "Payment confirmed and lifetime access activated.",
                );
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            className="is-danger"
            onClick={(event) => {
              event.stopPropagation();
              const note = window.prompt(
                "Reason for rejecting this payment reference:",
              );
              if (note?.trim())
                void mutate(
                  `/admin/activation-payments/${id}/review`,
                  "POST",
                  { status: "rejected", admin_note: note },
                  "Payment rejected.",
                );
            }}
          >
            Reject
          </button>
        </div>
      );
    return null;
  };

  const columns = (() => {
    const action = { key: "actions", label: "Actions", render: actionCell };
    switch (section.id) {
      case "applications":
        return [
          { key: "display_name", label: "Applicant / business" },
          { key: "owner_name", label: "Account holder" },
          { key: "email", label: "Email" },
          {
            key: "document_count",
            label: "Documents",
            render: (row: RecordValue) => asNumber(row.document_count),
          },
          {
            key: "status",
            label: "Status",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          action,
        ];
      case "providers":
        return [
          { key: "display_name", label: "Provider" },
          { key: "owner_name", label: "Account holder" },
          {
            key: "average_rating",
            label: "Rating",
            render: (row: RecordValue) =>
              `${Number(row.average_rating).toFixed(1)} · ${asNumber(row.review_count)} reviews`,
          },
          {
            key: "verified",
            label: "Identity",
            render: (row: RecordValue) => (
              <StatusPill value={row.verified ? "verified" : "pending"} />
            ),
          },
          {
            key: "access_kind",
            label: "Access",
            render: (row: RecordValue) => (
              <StatusPill value={row.access_kind} />
            ),
          },
          action,
        ];
      case "users":
        return [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          {
            key: "email_verified_at",
            label: "Email status",
            render: (row: RecordValue) => (
              <StatusPill
                value={row.email_verified_at ? "verified" : "unverified"}
              />
            ),
          },
          {
            key: "provider_status",
            label: "Provider status",
            render: (row: RecordValue) =>
              row.provider_status ? (
                <StatusPill value={row.provider_status} />
              ) : (
                "Customer"
              ),
          },
          {
            key: "status",
            label: "Account",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          action,
        ];
      case "listings":
        return [
          {
            key: "type",
            label: "Listing type",
            render: (row: RecordValue) => humanize(row.type),
          },
          {
            key: "title",
            label: "Listing",
            render: (row: RecordValue) => asText(row.title ?? row.category),
          },
          {
            key: "cover_status",
            label: "Home cover",
            render: (row: RecordValue) => {
              if (!row.cover_image) return "—";
              const image = asText(row.cover_image);
              const src = image.startsWith("/") ? backendUrl(image) : image;
              return (
                <div className="admin-cover-cell">
                  <a
                    href={src}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Open the full ${asText(row.category)} cover from ${asText(row.display_name)} in a new tab`}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <img src={src} alt="" />
                  </a>
                  <div>
                    <StatusPill value={row.cover_status} />
                    {row.cover_status === "rejected" && row.cover_review_note ? (
                      <small>{asText(row.cover_review_note)}</small>
                    ) : null}
                  </div>
                </div>
              );
            },
          },
          { key: "display_name", label: "Provider" },
          { key: "owner_name", label: "Account holder" },
          {
            key: "is_visible",
            label: "Visibility",
            render: (row: RecordValue) => (
              <StatusPill value={row.is_visible ? "visible" : "hidden"} />
            ),
          },
          action,
        ];
      case "requests":
        return [
          { key: "service", label: "Service" },
          { key: "customer_name", label: "Customer" },
          { key: "provider_name", label: "Provider" },
          { key: "city", label: "City / municipality" },
          {
            key: "status",
            label: "Request status",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          {
            key: "created_at",
            label: "Submitted",
            render: (row: RecordValue) => dateText(row.created_at),
          },
        ];
      case "categories":
        return [
          { key: "name", label: "Service" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Description" },
          {
            key: "is_active",
            label: "Status",
            render: (row: RecordValue) => (
              <StatusPill value={row.is_active ? "active" : "disabled"} />
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row: RecordValue) => (
              <div className="admin-row-actions">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCategoryId(asText(row.id));
                    setCategory({
                      name: asText(row.name),
                      slug: asText(row.slug),
                      description: asText(row.description),
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={row.is_active ? "is-danger" : "is-positive"}
                  onClick={() =>
                    void mutate(
                      `/admin/categories/${asText(row.id)}/status`,
                      "PATCH",
                      { is_active: !row.is_active },
                      "Category status updated.",
                    )
                  }
                >
                  {row.is_active ? "Disable" : "Enable"}
                </button>
              </div>
            ),
          },
        ];
      case "locations":
        return [
          { key: "name", label: "City / municipality" },
          { key: "province", label: "Province" },
          { key: "region", label: "Region" },
          {
            key: "is_active",
            label: "Marketplace",
            render: (row: RecordValue) => (
              <StatusPill value={row.is_active ? "available" : "not enabled"} />
            ),
          },
          action,
        ];
      case "reviews":
        return [
          {
            key: "rating",
            label: "Rating",
            render: (row: RecordValue) => (
              <span className="admin-rating">★ {asText(row.rating)} / 5</span>
            ),
          },
          { key: "service", label: "Service" },
          { key: "provider_name", label: "Provider" },
          { key: "customer_name", label: "Customer" },
          { key: "comment", label: "Review" },
          {
            key: "created_at",
            label: "Date",
            render: (row: RecordValue) => dateText(row.created_at),
          },
        ];
      case "reports":
        return [
          {
            key: "target_type",
            label: "Reported item",
            render: (row: RecordValue) =>
              `${humanize(row.target_type)} #${asText(row.target_id)}`,
          },
          {
            key: "reason",
            label: "Reason",
            render: (row: RecordValue) => humanize(row.reason),
          },
          { key: "details", label: "Details" },
          { key: "reporter_name", label: "Reported by" },
          {
            key: "status",
            label: "Status",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          action,
        ];
      case "disputes":
        return [
          { key: "id", label: "Case" },
          {
            key: "reason",
            label: "Reason",
            render: (row: RecordValue) => humanize(row.reason),
          },
          { key: "customer_name", label: "Customer" },
          { key: "provider_name", label: "Provider" },
          {
            key: "status",
            label: "Status",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          action,
        ];
      case "payments":
        return [
          { key: "display_name", label: "Provider" },
          { key: "owner_name", label: "Account holder" },
          {
            key: "amount",
            label: "Amount",
            render: (row: RecordValue) =>
              `₱${Number(row.amount).toLocaleString("en-PH")}`,
          },
          { key: "reference", label: "Reference" },
          {
            key: "status",
            label: "Status",
            render: (row: RecordValue) => <StatusPill value={row.status} />,
          },
          {
            key: "created_at",
            label: "Submitted",
            render: (row: RecordValue) => dateText(row.created_at),
          },
          action,
        ];
      case "notices":
        return [
          { key: "title", label: "Notice" },
          { key: "body", label: "Message" },
          {
            key: "is_active",
            label: "Publication",
            render: (row: RecordValue) => (
              <StatusPill value={row.is_active ? "active" : "draft"} />
            ),
          },
          {
            key: "created_at",
            label: "Created",
            render: (row: RecordValue) => dateText(row.created_at),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row: RecordValue) => (
              <button
                className="admin-text-action"
                type="button"
                onClick={() =>
                  void mutate(
                    `/admin/notices/${asText(row.id)}`,
                    "PUT",
                    {
                      title: row.title,
                      body: row.body,
                      is_active: !row.is_active,
                    },
                    row.is_active ? "Notice unpublished." : "Notice published.",
                  )
                }
              >
                {row.is_active ? "Unpublish" : "Publish"}
              </button>
            ),
          },
        ];
      case "audit":
        return [
          { key: "event_type", label: "Action" },
          { key: "actor", label: "Administrator / user" },
          { key: "ip_address", label: "IP address" },
          {
            key: "created_at",
            label: "Time",
            render: (row: RecordValue) => dateText(row.created_at),
          },
        ];
      default:
        return [];
    }
  })();

  const openProviderDetails =
    section.id === "applications"
      ? (row: RecordValue) =>
          void openDetail(`/admin/provider-applications/${asText(row.id)}`)
      : section.id === "providers"
        ? (row: RecordValue) =>
            void openDetail(`/admin/providers/${asText(row.id)}`)
        : section.id === "users"
          ? (row: RecordValue) =>
              void openDetail(`/admin/users/${asText(row.id)}`)
          : undefined;
  const searchEnabled = [
    "applications",
    "providers",
    "users",
    "listings",
    "requests",
    "locations",
    "audit",
  ].includes(section.id);
  const heading =
    section.id === "applications"
      ? "Provider applications"
      : section.id === "providers"
        ? "Service providers"
        : section.id === "audit"
          ? "Audit log"
          : section.label;

  return (
    <div className="admin-shell">
      <aside className={`admin-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="admin-brand-row">
          <div className="admin-brand-stack">
            <Brand />
            <span>ADMIN CONSOLE</span>
          </div>
          <button
            className="admin-icon-button admin-mobile-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenu(false)}
          >
            <X size={19} />
          </button>
        </div>
        <nav className="admin-nav" aria-label="Administrator sections">
          {navGroups.map((group) => {
            const items = visibleSections.filter(
              (item) => item.group === group,
            );
            const labelId = `admin-nav-${group.toLowerCase().replace(/[^a-z]+/g, "-")}`;
            return (
              items.length > 0 && (
                <div
                  key={group}
                  className="admin-nav-group"
                  role="group"
                  aria-labelledby={labelId}
                >
                  <span className="admin-side-label" id={labelId}>
                    {group}
                  </span>
                  {items.map((item) => (
                    <NavLink
                      key={item.id}
                      to={`/admin/${item.id}`}
                      end={item.id === "dashboard"}
                      onClick={() => setMobileMenu(false)}
                      className={({ isActive }) =>
                        // "/admin" opens the overview too, so mark it active there as well.
                        `admin-nav-link${isActive || item.id === section.id ? " is-active" : ""}`
                      }
                    >
                      <item.icon size={18} aria-hidden="true" />
                      <span>{item.label}</span>
                      {item.id === "applications" &&
                        dashboard &&
                        dashboard.pendingApplications > 0 && (
                          <i>{dashboard.pendingApplications}</i>
                        )}
                    </NavLink>
                  ))}
                </div>
              )
            );
          })}
        </nav>
        <div className="admin-side-label">YOUR ACCOUNT</div>
        <nav className="admin-nav" aria-label="Your account">
          <NavLink
            to={`/admin/${accountSection.id}`}
            onClick={() => setMobileMenu(false)}
            className={({ isActive }) =>
              `admin-nav-link${isActive ? " is-active" : ""}`
            }
          >
            <KeyRound size={18} aria-hidden="true" />
            <span>Password &amp; sign-in</span>
          </NavLink>
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-online-dot" /> AYOS operations{" "}
          <small>Restricted workspace</small>
        </div>
      </aside>
      {mobileMenu && (
        <button
          aria-label="Close navigation"
          className="admin-nav-scrim"
          type="button"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="admin-main-column">
        <header className="admin-topbar">
          <button
            className="admin-icon-button admin-menu-toggle"
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenu(true)}
          >
            <Menu size={20} />
          </button>
          <div className="admin-breadcrumb">
            <span>AYOS Admin</span>
            <ChevronRight size={15} />
            <strong>{section.label}</strong>
          </div>
          <div className="admin-topbar-right">
            <span className="admin-secure-label">
              <ShieldCheck size={16} /> Secure workspace
            </span>
            <Link
              className="admin-user-chip"
              to={`/admin/${accountSection.id}`}
              title="Your account and password"
            >
              <i>
                {(user?.name || "A")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </i>
              <span>
                {user?.name || "Administrator"}
                <small>Admin access</small>
              </span>
            </Link>
            <button
              className="admin-signout"
              type="button"
              onClick={() => void signOutAdmin()}
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="admin-content">
          <div className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">OPERATIONS CONSOLE</span>
              <h1>
                {section.id === "dashboard"
                  ? `Good day, ${(user?.name || "Administrator").split(" ")[0]}.`
                  : heading}
              </h1>
              <p>
                {section.id === "dashboard"
                  ? "A clear view of AYOS activity and the work that needs attention."
                  : section.id === "payments"
                    ? "Review provider submitted references against your verified payment records."
                    : section.id === accountSection.id
                      ? "Change the password you use to sign in to AYOS admin."
                    : `Review and manage ${section.label.toLowerCase()} using current AYOS records.`}
              </p>
            </div>
            {section.id === "applications" && (
              <span className="admin-heading-count">
                <BriefcaseBusiness size={18} />{" "}
                {asNumber(dashboard?.pendingApplications)} awaiting review
              </span>
            )}
          </div>
          {error && (
            <div className="admin-alert is-error" role="alert">
              <AlertTriangle size={18} />
              <span>{error}</span>
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="admin-alert is-success" role="status">
              <Check size={18} />
              <span>{notice}</span>
              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {section.id === "dashboard" && (
            <DashboardView
              data={dashboard}
              loading={loading}
              onOpen={(id) => navigate(`/admin/${id}`)}
            />
          )}
          {section.id === accountSection.id && (
            <AdminAccount email={user?.email ?? ""} />
          )}
          {section.id === "settings" && (
            <SettingsView
              settings={settings}
              setSettings={setSettings}
              saving={saving}
              onSubmit={saveSettings}
            />
          )}
          {section.id === "analytics" && (
            <AnalyticsView data={special} loading={loading} />
          )}
          {section.id === "security" && (
            <SecurityView
              data={special}
              loading={loading}
              onAddAdministrator={() => setAddingAdministrator(true)}
            />
          )}
          {section.id === "categories" && (
            <>
              <Panel
                title={
                  editingCategoryId
                    ? "Edit service category"
                    : "Add a service category"
                }
              >
                <form className="admin-category-form" onSubmit={createCategory}>
                  <label>
                    Category name
                    <input
                      value={category.name}
                      required
                      maxLength={80}
                      onChange={(event) => {
                        const name = event.target.value;
                        setCategory((current) => ({
                          ...current,
                          name,
                          slug: name
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)/g, ""),
                        }));
                      }}
                      placeholder="e.g. Electrical"
                    />
                  </label>
                  <label>
                    URL slug
                    <input
                      value={category.slug}
                      required
                      maxLength={80}
                      onChange={(event) =>
                        setCategory((current) => ({
                          ...current,
                          slug: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Description
                    <input
                      value={category.description}
                      maxLength={240}
                      onChange={(event) =>
                        setCategory((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Short description"
                    />
                  </label>
                  <div className="admin-category-actions">
                    <button
                      className="admin-primary-button"
                      disabled={saving}
                      type="submit"
                    >
                      {saving
                        ? "Saving…"
                        : editingCategoryId
                          ? "Save changes"
                          : "Add category"}{" "}
                      <ArrowRight size={16} />
                    </button>
                    {editingCategoryId && (
                      <button
                        type="button"
                        className="admin-cancel-button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategory({ name: "", slug: "", description: "" });
                        }}
                      >
                        Cancel edit
                      </button>
                    )}
                  </div>
                </form>
              </Panel>
              <Panel title={`Categories · ${rows.length}`}>
                <DataTable rows={rows} columns={columns} />
              </Panel>
            </>
          )}
          {section.id === "settings" ? null : null}
          {section.id === "notices" && (
            <>
              <Panel title="Publish a platform notice">
                <form className="admin-notice-form" onSubmit={saveNotice}>
                  <label>
                    Title
                    <input
                      required
                      maxLength={120}
                      value={noticeForm.title}
                      onChange={(event) =>
                        setNoticeForm((value) => ({
                          ...value,
                          title: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Notice
                    <textarea
                      required
                      maxLength={1000}
                      rows={3}
                      value={noticeForm.body}
                      onChange={(event) =>
                        setNoticeForm((value) => ({
                          ...value,
                          body: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="admin-switch-row">
                    <input
                      type="checkbox"
                      role="switch"
                      checked={noticeForm.is_active}
                      onChange={(event) =>
                        setNoticeForm((value) => ({
                          ...value,
                          is_active: event.target.checked,
                        }))
                      }
                    />
                    <span>Publish immediately</span>
                  </label>
                  <button
                    className="admin-primary-button"
                    disabled={saving}
                    type="submit"
                  >
                    Save notice <ArrowRight size={16} />
                  </button>
                </form>
              </Panel>
              <Panel title="Recent notices">
                <DataTable rows={rows} columns={columns} />
              </Panel>
            </>
          )}
          {searchEnabled && (
            <Panel
              title={
                section.id === "audit"
                  ? "Recent events"
                  : `${heading} · ${asNumber(meta.total)}`
              }
              action={
                <form className="admin-search" onSubmit={search}>
                  <Search size={17} />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={`Search ${section.label.toLowerCase()}…`}
                    aria-label={`Search ${section.label}`}
                  />
                  <button type="submit">Search</button>
                </form>
              }
            >
              {loading ? (
                <div className="admin-loading">
                  <span /> Loading {section.label.toLowerCase()}…
                </div>
              ) : (
                <DataTable
                  rows={rows}
                  columns={columns}
                  onRowClick={openProviderDetails}
                />
              )}
              {meta.last_page > 1 && (
                <div className="admin-pagination">
                  <span>
                    Page {meta.current_page} of {meta.last_page} ·{" "}
                    {asNumber(meta.total)} records
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={page <= 1 || loading}
                      onClick={() => void load(page - 1)}
                      aria-label="Previous page"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      disabled={page >= meta.last_page || loading}
                      onClick={() => void load(page + 1)}
                      aria-label="Next page"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              )}
            </Panel>
          )}
          {!searchEnabled &&
            ![
              "dashboard",
              "settings",
              "analytics",
              "security",
              "categories",
              "notices",
              accountSection.id,
            ].includes(section.id) && (
              <Panel title={`${heading} · ${asNumber(meta.total)}`}>
                {loading ? (
                  <div className="admin-loading">
                    <span /> Loading {section.label.toLowerCase()}…
                  </div>
                ) : (
                  <DataTable
                    rows={rows}
                    columns={columns}
                    onRowClick={
                      section.id === "disputes"
                        ? (row) => {
                            setReviewNote("");
                            void openDetail(
                              `/admin/disputes/${asText(row.id)}`,
                            );
                          }
                        : undefined
                    }
                  />
                )}
                {meta.last_page > 1 && (
                  <div className="admin-pagination">
                    <span>
                      Page {meta.current_page} of {meta.last_page} ·{" "}
                      {asNumber(meta.total)} records
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={page <= 1 || loading}
                        onClick={() => void load(page - 1)}
                        aria-label="Previous page"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        type="button"
                        disabled={page >= meta.last_page || loading}
                        onClick={() => void load(page + 1)}
                        aria-label="Next page"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </Panel>
            )}
          {section.id === "payments" && (
            <p className="admin-help-note">
              <CreditCard size={16} /> AYOS currently uses manual payment
              references. Confirm a reference only after checking the payment in
              the receiving account.
            </p>
          )}
        </main>
        <div className="admin-app-foot">
          <span>AYOS ADMIN · RESTRICTED</span>
          <span>All privileged actions are logged.</span>
        </div>
      </div>
      {detail && (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetail(null);
          }}
        >
          <section
            className="admin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-modal-title"
          >
            <header>
              <div>
                <span className="admin-eyebrow">RESTRICTED RECORD</span>
                <h2 id="admin-modal-title">
                  {detail.loading
                    ? "Loading details…"
                    : asText(
                        (detail.provider as RecordValue | undefined)
                          ?.display_name ??
                          (detail.dispute as RecordValue | undefined)?.reason ??
                          detail.name ??
                          "Review details",
                      )}
                </h2>
              </div>
              <button
                className="admin-icon-button"
                type="button"
                onClick={() => setDetail(null)}
                aria-label="Close details"
              >
                <X size={19} />
              </button>
            </header>
            {detail.loading ? (
              <div className="admin-loading">
                <span /> Loading secure record…
              </div>
            ) : (
              <DetailPanel
                detail={detail}
                sectionId={section.id}
                note={reviewNote}
                setNote={setReviewNote}
                saving={saving}
                onDecision={(status, note) =>
                  mutate(
                    `/admin/provider-applications/${asText((detail.provider as RecordValue | undefined)?.id)}/decision`,
                    "POST",
                    { status, ...(note ? { note } : {}) },
                    "Application decision saved.",
                  )
                }
                onResolve={(status, note) =>
                  mutate(
                    `/admin/disputes/${asText((detail.dispute as RecordValue | undefined)?.id)}/resolve`,
                    "POST",
                    { status, resolution_note: note },
                    "Dispute resolution saved.",
                  )
                }
                onActivate={(id, reason) =>
                  mutate(
                    `/admin/providers/${id}/activate`,
                    "POST",
                    { reason },
                    "Lifetime access activated.",
                  )
                }
                onVerify={(id, reason) =>
                  mutate(
                    `/admin/providers/${id}/verify-identity`,
                    "POST",
                    { verified: true, reason },
                    "Identity verification updated.",
                  )
                }
              />
            )}
          </section>
        </div>
      )}
      {addingAdministrator && (
        <AddAdministrator
          roles={assignableRoles(special)}
          onClose={() => setAddingAdministrator(false)}
          onCreated={() => void refreshSecurity()}
        />
      )}
    </div>
  );
}

function DashboardView({
  data,
  loading,
  onOpen,
}: {
  data: AdminDashboard | null;
  loading: boolean;
  onOpen: (id: string) => void;
}) {
  if (loading || !data)
    return (
      <div className="admin-loading">
        <span /> Loading operations overview…
      </div>
    );
  const metrics = [
    ["Total users", data.totalUsers, Users, "sky", "Registered accounts"],
    [
      "Approved providers",
      data.approvedProviders,
      Building2,
      "green",
      "Ready to serve",
    ],
    [
      "Applications to review",
      data.pendingApplications,
      BriefcaseBusiness,
      "orange",
      "Pending or needs changes",
    ],
    [
      "Active requests",
      data.activeRequests,
      ClipboardList,
      "blue",
      "New or accepted",
    ],
    [
      "Completed jobs",
      data.completedJobs,
      Check,
      "green",
      "Customer-confirmed",
    ],
    [
      "Open disputes",
      data.openDisputes,
      AlertTriangle,
      "red",
      "Needs operations review",
    ],
    [
      "At free client limit",
      data.quotaReachedProviders,
      Gauge,
      "purple",
      "New leads are paused",
    ],
    [
      "Lifetime activations",
      data.lifetimeActivations,
      Wallet,
      "sky",
      "Provider access",
    ],
  ] as const;
  return (
    <>
      {data.pendingApplications > 0 && (
        <button
          className="admin-review-banner"
          type="button"
          onClick={() => onOpen("applications")}
        >
          <span>
            <span className="admin-review-pulse" /> Review queue{" "}
            <strong>
              {data.pendingApplications} provider applications need attention
            </strong>
          </span>
          <ArrowRight size={18} />
        </button>
      )}
      <div className="admin-metrics-grid">
        {metrics.map(([label, value, icon, tone, hint]) => (
          <Metric
            key={label}
            label={label}
            value={value}
            icon={icon}
            tone={tone}
            hint={hint}
          />
        ))}
      </div>
      <div className="admin-dashboard-bottom">
        <Panel
          title="Recent activity"
          action={
            <Link to="/admin/audit">
              View audit log <ArrowRight size={15} />
            </Link>
          }
        >
          {data.recentActivity.length ? (
            <div className="admin-activity-list">
              {data.recentActivity.map((item) => (
                <article key={item.id}>
                  <span className="admin-activity-icon">
                    <Activity size={16} />
                  </span>
                  <div>
                    <strong>{humanize(item.event)}</strong>
                    <small>
                      {item.actor || "AYOS system"} ·{" "}
                      {dateText(item.created_at)}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title="No recent activity"
              detail="Administrative actions will appear here."
            />
          )}
        </Panel>
        <Panel title="Quick access">
          <div className="admin-quick-links">
            <button onClick={() => onOpen("applications")}>
              <BriefcaseBusiness size={18} />
              <span>Provider applications</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onOpen("disputes")}>
              <AlertTriangle size={18} />
              <span>Open disputes</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onOpen("settings")}>
              <Settings2 size={18} />
              <span>Platform settings</span>
              <ArrowRight size={16} />
            </button>
            <button onClick={() => onOpen("payments")}>
              <Wallet size={18} />
              <span>Pending payments</span>
              {data.pendingPayments > 0 && <i>{data.pendingPayments}</i>}
              <ArrowRight size={16} />
            </button>
          </div>
        </Panel>
      </div>
    </>
  );
}

function SettingsView({
  settings,
  setSettings,
  saving,
  onSubmit,
}: {
  settings: RecordValue;
  setSettings: (updater: (current: RecordValue) => RecordValue) => void;
  saving: boolean;
  onSubmit: (event: FormEvent) => void;
}) {
  const toggleKeys = [
    "maintenance_mode",
    "registrations_enabled",
    "customer_requests_enabled",
    "provider_applications_enabled",
    "activation_payments_enabled",
  ];
  const labels: Record<string, string> = {
    maintenance_mode: "Maintenance mode",
    registrations_enabled: "New account registrations",
    customer_requests_enabled: "Customer service requests",
    provider_applications_enabled: "Provider applications",
    activation_payments_enabled: "Manual activation payments",
  };
  return (
    <form className="admin-settings-layout" onSubmit={onSubmit}>
      <Panel title="Marketplace identity">
        <label className="admin-field">
          Marketplace name
          <input
            value={asText(settings.marketplace_name)}
            onChange={(event) =>
              setSettings((value) => ({
                ...value,
                marketplace_name: event.target.value,
              }))
            }
            maxLength={80}
            required
          />
        </label>
        <label className="admin-field">
          Support email
          <input
            type="email"
            value={asText(settings.support_email)}
            onChange={(event) =>
              setSettings((value) => ({
                ...value,
                support_email: event.target.value,
              }))
            }
            maxLength={190}
            required
          />
        </label>
      </Panel>
      <Panel title="Provider access">
        <label className="admin-field">
          Free successful-client quota
          <input
            type="number"
            min={1}
            max={10000}
            value={asText(settings.free_successful_client_quota)}
            onChange={(event) =>
              setSettings((value) => ({
                ...value,
                free_successful_client_quota: Number(event.target.value),
              }))
            }
            required
          />
          <small>
            Only distinct customers with confirmed completed services count
            toward this limit.
          </small>
        </label>
        <label className="admin-field">
          Lifetime activation fee (PHP)
          <input
            type="number"
            min={0}
            max={100000000}
            value={asText(settings.lifetime_activation_fee)}
            onChange={(event) =>
              setSettings((value) => ({
                ...value,
                lifetime_activation_fee: Number(event.target.value),
              }))
            }
            required
          />
          <small>
            Changing the fee applies to future submissions. Confirmed
            activations stay active.
          </small>
        </label>
      </Panel>
      <Panel title="Operational controls">
        <div className="admin-settings-toggles">
          {toggleKeys.map((key) => (
            <label
              className={`admin-setting-toggle ${key === "maintenance_mode" && settings[key] ? "is-maintenance" : ""}`}
              key={key}
            >
              <span>
                <strong>{labels[key]}</strong>
                <small>
                  {key === "maintenance_mode"
                    ? "Normal customers see a maintenance page; admins remain able to sign in."
                    : key === "activation_payments_enabled"
                      ? "Allow provider payment references for manual review."
                      : `Allow ${labels[key].toLowerCase()} on AYOS.`}
                </small>
              </span>
              <input
                type="checkbox"
                role="switch"
                checked={Boolean(settings[key])}
                onChange={(event) =>
                  setSettings((value) => ({
                    ...value,
                    [key]: event.target.checked,
                  }))
                }
              />
            </label>
          ))}
        </div>
        <label className="admin-field">
          Payment instructions
          <textarea
            rows={4}
            maxLength={1000}
            value={asText(settings.activation_payment_instructions)}
            onChange={(event) =>
              setSettings((value) => ({
                ...value,
                activation_payment_instructions: event.target.value,
              }))
            }
            placeholder="Enter the verified transfer account and steps for providers. Required before enabling manual payment references."
          />
          <small>
            Do not enter account passwords, secret keys, or card data.
          </small>
        </label>
      </Panel>
      <div className="admin-settings-save">
        <span>Changes are saved to AYOS and recorded in the audit log.</span>
        <button
          className="admin-primary-button"
          disabled={saving}
          type="submit"
        >
          {saving ? "Saving…" : "Save settings"} <ArrowRight size={16} />
        </button>
      </div>
    </form>
  );
}

function AnalyticsView({
  data,
  loading,
}: {
  data: RecordValue | null;
  loading: boolean;
}) {
  if (loading || !data)
    return (
      <div className="admin-loading">
        <span /> Loading analytics…
      </div>
    );
  const popular = Array.isArray(data.popularServices)
    ? (data.popularServices as RecordValue[])
    : [];
  const signups = Array.isArray(data.signups)
    ? (data.signups as RecordValue[])
    : [];
  const max = Math.max(1, ...popular.map((item) => Number(item.requests)));
  return (
    <>
      <div className="admin-analytics-summary">
        <Metric
          label="Service requests"
          value={data.requests}
          icon={ClipboardList}
          tone="sky"
          hint="All-time total"
        />
        <Metric
          label="Completed jobs"
          value={data.completedJobs}
          icon={Check}
          tone="green"
          hint="Customer-confirmed"
        />
        <Metric
          label="Cancellation rate"
          value={`${data.cancellationRate}%`}
          icon={ArrowDownRight}
          tone="orange"
          hint="Of submitted requests"
        />
        <Metric
          label="Dispute rate"
          value={`${data.disputeRate}%`}
          icon={AlertTriangle}
          tone="red"
          hint="Of submitted requests"
        />
        <Metric
          label="Activation conversions"
          value={data.activationConversion}
          icon={Wallet}
          tone="purple"
          hint="Confirmed payments"
        />
      </div>
      <div className="admin-dashboard-bottom">
        <Panel title="Most requested services">
          {popular.length ? (
            <div className="admin-bars">
              {popular.map((item) => (
                <div key={asText(item.name)}>
                  <span>{asText(item.name)}</span>
                  <i>
                    <b
                      style={{
                        width: `${Math.max(4, (Number(item.requests) / max) * 100)}%`,
                      }}
                    />
                  </i>
                  <strong>{asNumber(item.requests)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
        <Panel title="Account registrations · 30 days">
          {signups.length ? (
            <div className="admin-signup-list">
              {signups.map((item) => (
                <div key={asText(item.day)}>
                  <span>
                    {new Date(String(item.day)).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <strong>{asNumber(item.total)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    </>
  );
}

function SecurityView({
  data,
  loading,
  onAddAdministrator,
}: {
  data: RecordValue | null;
  loading: boolean;
  onAddAdministrator: () => void;
}) {
  if (loading || !data)
    return (
      <div className="admin-loading">
        <span /> Loading security overview…
      </div>
    );
  const admins = Array.isArray(data.administrators)
    ? (data.administrators as RecordValue[])
    : [];
  const events = Array.isArray(data.recentSecurityEvents)
    ? (data.recentSecurityEvents as RecordValue[])
    : [];
  return (
    <div className="admin-dashboard-bottom">
      <Panel
        title="Administrator accounts"
        action={
          assignableRoles(data).length > 0 && (
            <button
              type="button"
              className="admin-outline-button"
              onClick={onAddAdministrator}
            >
              <UserPlus size={15} aria-hidden="true" /> Add administrator
            </button>
          )
        }
      >
        <DataTable
          rows={admins}
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "role", label: "Role" },
            {
              key: "two_factor_confirmed_at",
              label: "MFA status",
              render: (row) => (
                <StatusPill
                  value={
                    row.two_factor_confirmed_at ? "confirmed" : "not enabled"
                  }
                />
              ),
            },
          ]}
        />
      </Panel>
      <Panel title="Recent security events">
        <DataTable
          rows={events}
          columns={[
            { key: "event_type", label: "Event" },
            { key: "actor", label: "Account" },
            {
              key: "created_at",
              label: "Time",
              render: (row) => dateText(row.created_at),
            },
          ]}
        />
      </Panel>
      <Panel title="Role assignment">
        <p className="admin-muted">
          Super admins and administrators add new admin accounts here. To give
          an existing AYOS account an admin role, use a trusted server shell.
        </p>
        <code>
          php artisan ayos:grant-admin-role admin@example.com super_admin
        </code>
      </Panel>
    </div>
  );
}

function DetailPanel({
  detail,
  sectionId,
  note,
  setNote,
  saving,
  onDecision,
  onResolve,
  onActivate,
  onVerify,
}: {
  detail: RecordValue;
  sectionId: string;
  note: string;
  setNote: (note: string) => void;
  saving: boolean;
  onDecision: (status: string, note?: string) => void;
  onResolve: (status: string, note: string) => void;
  onActivate: (id: string, reason: string) => void;
  onVerify: (id: string, reason: string) => void;
}) {
  const provider = detail.provider as RecordValue | undefined;
  const dispute = detail.dispute as RecordValue | undefined;
  if (sectionId === "users" && detail.email) {
    const providerInfo = detail.provider as RecordValue | null;
    return (
      <div className="admin-detail-content">
        <div className="admin-detail-grid">
          <span>
            <small>Email</small>
            <strong>{asText(detail.email)}</strong>
          </span>
          <span>
            <small>Account status</small>
            <StatusPill value={detail.status} />
          </span>
          <span>
            <small>Email verification</small>
            <StatusPill
              value={detail.emailVerified ? "verified" : "unverified"}
            />
          </span>
          <span>
            <small>Created</small>
            <strong>{dateText(detail.createdAt)}</strong>
          </span>
          <span>
            <small>Customer service requests</small>
            <strong>{asNumber(detail.customerRequests)}</strong>
          </span>
          <span>
            <small>Provider jobs</small>
            <strong>{asNumber(detail.providerJobs)}</strong>
          </span>
        </div>
        {providerInfo && (
          <>
            <h3>Provider account</h3>
            <div className="admin-detail-grid">
              <span>
                <small>Business name</small>
                <strong>{asText(providerInfo.displayName)}</strong>
              </span>
              <span>
                <small>Provider status</small>
                <StatusPill value={providerInfo.status} />
              </span>
              <span>
                <small>Identity verification</small>
                <StatusPill
                  value={providerInfo.verified ? "verified" : "pending"}
                />
              </span>
            </div>
          </>
        )}
      </div>
    );
  }
  if (sectionId === "disputes" && dispute) {
    const evidence = Array.isArray(detail.evidence)
      ? (detail.evidence as RecordValue[])
      : [];
    return (
      <div className="admin-detail-content">
        <div className="admin-detail-grid">
          <span>
            <small>Customer</small>
            <strong>{asText(dispute.customer_name)}</strong>
          </span>
          <span>
            <small>Provider</small>
            <strong>{asText(dispute.display_name)}</strong>
          </span>
          <span>
            <small>Job status</small>
            <StatusPill value={dispute.job_status} />
          </span>
          <span>
            <small>Reason</small>
            <strong>{humanize(dispute.reason)}</strong>
          </span>
        </div>
        <h3>Customer / provider statement</h3>
        <p>{asText(dispute.description)}</p>
        <h3>Related request</h3>
        <p>{asText(dispute.request_description)}</p>
        <h3>Evidence</h3>
        {evidence.length ? (
          <ul className="admin-doc-list">
            {evidence.map((item) => (
              <li key={asText(item.id)}>
                <FileText size={16} />
                <span>{asText(item.original_name)}</span>
                <a
                  href={backendUrl(
                    `/api/admin/disputes/${asText(dispute.id)}/evidence/${asText(item.id)}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open securely
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-muted">No evidence was attached.</p>
        )}
        <label className="admin-field">
          Resolution summary
          <textarea
            value={note}
            maxLength={2000}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Explain the resolution for both parties"
          />
        </label>
        <div className="admin-modal-actions">
          <button
            disabled={saving || !note.trim()}
            className="admin-primary-button"
            type="button"
            onClick={() => onResolve("resolved", note)}
          >
            Resolve dispute
          </button>
          <button
            disabled={saving || !note.trim()}
            className="admin-outline-button"
            type="button"
            onClick={() => onResolve("dismissed", note)}
          >
            Dismiss dispute
          </button>
        </div>
      </div>
    );
  }
  if (provider) {
    const services = Array.isArray(detail.services)
      ? (detail.services as RecordValue[])
      : [];
    const areas = Array.isArray(detail.areas)
      ? (detail.areas as RecordValue[])
      : [];
    const documents = Array.isArray(detail.documents)
      ? (detail.documents as RecordValue[])
      : [];
    const application = ["applications"].includes(sectionId);
    return (
      <div className="admin-detail-content">
        <div className="admin-detail-grid">
          <span>
            <small>Account holder</small>
            <strong>{asText(provider.owner_name)}</strong>
          </span>
          <span>
            <small>Email</small>
            <strong>{asText(provider.email)}</strong>
          </span>
          <span>
            <small>Application status</small>
            <StatusPill value={provider.status} />
          </span>
          <span>
            <small>Account status</small>
            <StatusPill value={provider.account_status ?? "active"} />
          </span>
          <span>
            <small>Experience</small>
            <strong>{asText(provider.years_experience)} years</strong>
          </span>
          <span>
            <small>Successful clients</small>
            <strong>
              {asText(
                (detail.stats as RecordValue | undefined)?.successfulClients,
              )}{" "}
              / {asText(detail.quota)}
            </strong>
          </span>
        </div>
        <h3>Provider introduction</h3>
        <p>{asText(provider.bio)}</p>
        <h3>Services</h3>
        <ul className="admin-detail-list">
          {services.map((item) => (
            <li key={asText(item.id)}>
              <span>
                {asText(item.category)}
                <small>{asText(item.description)}</small>
              </span>
              <StatusPill value={item.is_visible ? "visible" : "hidden"} />
            </li>
          ))}
        </ul>
        <h3>Service areas</h3>
        <ul className="admin-detail-list">
          {areas.map((item, index) => (
            <li key={`${asText(item.city)}-${index}`}>
              <span>
                {[item.city, item.province, item.region, item.barangay]
                  .filter(Boolean)
                  .map(asText)
                  .join(", ")}
              </span>
              <StatusPill value={item.active ? "active" : "inactive"} />
            </li>
          ))}
        </ul>
        <h3>Private verification documents</h3>
        {documents.length ? (
          <ul className="admin-doc-list">
            {documents.map((item) => (
              <li key={asText(item.id)}>
                <FileText size={16} />
                <span>
                  {asText(item.original_name)}
                  <small>{asText(item.mime_type)}</small>
                </span>
                <a
                  href={backendUrl(
                    `/api/admin/provider-applications/${asText(provider.id)}/documents/${asText(item.id)}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open securely
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-muted">No documents provided.</p>
        )}
        {application && (
          <>
            <label className="admin-field">
              Decision note
              <textarea
                value={note}
                maxLength={500}
                rows={2}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Required for changes requested or rejection"
              />
            </label>
            <div className="admin-modal-actions">
              <button
                disabled={saving}
                className="admin-primary-button"
                type="button"
                onClick={() => onDecision("approved")}
              >
                Approve
              </button>
              <button
                disabled={saving || !note.trim()}
                className="admin-outline-button"
                type="button"
                onClick={() => onDecision("needs_changes", note)}
              >
                Request changes
              </button>
              <button
                disabled={saving || !note.trim()}
                className="admin-danger-button"
                type="button"
                onClick={() => onDecision("rejected", note)}
              >
                Reject
              </button>
            </div>
          </>
        )}
        {!application && (
          <div className="admin-modal-actions">
            <button
              className="admin-outline-button"
              disabled={saving}
              type="button"
              onClick={() => {
                const reason = window.prompt(
                  "Reason for granting lifetime access:",
                );
                if (reason?.trim()) onActivate(asText(provider.id), reason);
              }}
            >
              Grant lifetime access
            </button>
            <button
              className="admin-outline-button"
              disabled={saving || Boolean(provider.verified)}
              type="button"
              onClick={() => {
                const reason = window.prompt(
                  "Confirm the identity review reference:",
                );
                if (reason?.trim()) onVerify(asText(provider.id), reason);
              }}
            >
              Verify identity
            </button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="admin-detail-content">
      <pre>{JSON.stringify(detail, null, 2)}</pre>
    </div>
  );
}
