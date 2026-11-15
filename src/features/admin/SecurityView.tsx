import { UserPlus } from "lucide-react";
import { type RecordValue, dateText, assignableRoles } from "./admin-config";
import { StatusPill, Panel, DataTable } from "./AdminUI";

export default function SecurityView({
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
    </div>
  );
}
