import { type RecordValue, asText } from "./admin-config";

export type AdminMutate = (path: string, method: string, body?: unknown, success?: string) => Promise<void>;

type Props = {
  sectionId: string;
  row: RecordValue;
  saving: boolean;
  mutate: AdminMutate;
  openDetail: (path: string) => Promise<void>;
  setReviewNote: (note: string) => void;
};

/** The action buttons at the end of a table row; which ones show depends on the admin section. */
export default function AdminRowActions({ sectionId, row, saving, mutate, openDetail, setReviewNote }: Props) {
  const id = asText(row.id);
  if (sectionId === "applications")
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
  if (sectionId === "users")
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
  if (sectionId === "providers")
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
  if (sectionId === "listings")
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
  if (sectionId === "locations")
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
  if (sectionId === "reports")
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
    sectionId === "disputes" &&
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
  if (sectionId === "payments" && row.status === "pending")
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
}
