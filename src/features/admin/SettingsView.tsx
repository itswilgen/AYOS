import { type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { type RecordValue, asText } from "./admin-config";
import { Panel } from "./AdminUI";

export default function SettingsView({
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
