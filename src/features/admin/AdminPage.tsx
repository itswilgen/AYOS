import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  KeyRound,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import Brand from "../../components/common/Brand";
import { useAuth } from "../../lib/auth/useAuth";
import { adminService, type AdminDashboard, type AdminPageResult } from "../../services/admin.service";
import {
  type RecordValue,
  navGroups,
  sections,
  accountSection,
  asText,
  asNumber,
  assignableRoles,
} from "./admin-config";
import { Panel } from "./AdminUI";
import AddAdministrator from "./AddAdministrator";
import AdminAccount from "./AdminAccount";
import AdminRowActions from "./AdminRowActions";
import AdminSectionTable from "./AdminSectionTable";
import DashboardView from "./DashboardView";
import SettingsView from "./SettingsView";
import AnalyticsView from "./AnalyticsView";
import SecurityView from "./SecurityView";
import DetailPanel from "./DetailPanel";
import "./admin.css";

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
      setDetail(null);
      // After the reload: `load` clears the notice when it starts.
      await load(page, query);
      setNotice(success);
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
      noticeForm.is_active
        ? "Notice published and sent to every user’s notifications."
        : "Notice saved as a draft.",
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

  const actionCell = (row: RecordValue) => (
    <AdminRowActions
      sectionId={section.id}
      row={row}
      saving={saving}
      mutate={mutate}
      openDetail={openDetail}
      setReviewNote={setReviewNote}
    />
  );

  const tableProps = {
    sectionId: section.id,
    rows,
    actionCell,
    mutate,
    setCategory,
    setEditingCategoryId,
  };

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
                <AdminSectionTable {...tableProps} />
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
                    <span>Publish now and notify every user</span>
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
                <AdminSectionTable {...tableProps} />
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
                <AdminSectionTable
                  {...tableProps}
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
                  <AdminSectionTable
                    {...tableProps}
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
