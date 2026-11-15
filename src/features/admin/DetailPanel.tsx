import { FileText } from "lucide-react";
import { backendUrl } from "../../lib/api/client";
import {
  type RecordValue,
  asText,
  asNumber,
  dateText,
  humanize,
} from "./admin-config";
import { StatusPill } from "./AdminUI";

export default function DetailPanel({
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
