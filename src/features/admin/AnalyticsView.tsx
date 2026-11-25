import {
  AlertTriangle,
  ArrowDownRight,
  Check,
  ClipboardList,
  Wallet,
} from "lucide-react";
import { type RecordValue, asText, asNumber } from "./admin-config";
import { Panel, Empty, Metric } from "./AdminUI";

export default function AnalyticsView({
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
      <div className="admin-dashboard-bottom admin-analytics-bottom">
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
