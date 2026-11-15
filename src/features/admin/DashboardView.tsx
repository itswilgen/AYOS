import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardList,
  Gauge,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
import { type AdminDashboard } from "../../services/admin.service";
import { dateText, humanize } from "./admin-config";
import { Panel, Empty, Metric } from "./AdminUI";

export default function DashboardView({
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
