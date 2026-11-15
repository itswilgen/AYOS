import { type ReactNode } from "react";
import { backendUrl } from "../../lib/api/client";
import {
  type RecordValue,
  asText,
  asNumber,
  dateText,
  humanize,
} from "./admin-config";
import { StatusPill, DataTable } from "./AdminUI";
import type { AdminMutate } from "./AdminRowActions";

type CategoryForm = { name: string; slug: string; description: string };

type ColumnDeps = {
  sectionId: string;
  actionCell: (row: RecordValue) => ReactNode;
  mutate: AdminMutate;
  setCategory: (form: CategoryForm) => void;
  setEditingCategoryId: (id: string | null) => void;
};

/** Table columns for the current admin section. */
function adminColumns({ sectionId, actionCell, mutate, setCategory, setEditingCategoryId }: ColumnDeps) {
  const action = { key: "actions", label: "Actions", render: actionCell };
  switch (sectionId) {
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
                  row.is_active
                    ? "Notice unpublished."
                    : row.notified_at
                      ? "Notice published. Users were already notified about it."
                      : "Notice published and sent to every user’s notifications.",
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
}

type TableProps = ColumnDeps & {
  rows: RecordValue[];
  onRowClick?: (row: RecordValue) => void;
};

/**
 * The current section's table. Columns are built here from props rather than in AdminPage's render,
 * so the row callbacks reach them the way React expects.
 */
export default function AdminSectionTable({ rows, onRowClick, ...deps }: TableProps) {
  return <DataTable rows={rows} columns={adminColumns(deps)} onRowClick={onRowClick} />;
}
