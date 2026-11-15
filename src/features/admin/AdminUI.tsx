/** Small building blocks shared by the admin sections: status pill, panel, empty state, table, metric. */
import { type ReactNode } from "react";
import { ClipboardList, Gauge } from "lucide-react";
import {
  type RecordValue,
  asText,
  asNumber,
  humanize,
} from "./admin-config";

export function StatusPill({ value }: { value: unknown }) {
  const status = asText(value).toLowerCase().replaceAll("_", "-");
  return <span className={`admin-status is-${status}`}>{humanize(value)}</span>;
}

export function Panel({
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

export function Empty({
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

export function DataTable({
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

export function Metric({
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
