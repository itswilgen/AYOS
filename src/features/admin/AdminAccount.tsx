import { useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Eye, EyeOff, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import { ApiError, apiRequest } from "../../lib/api/client";

type Field = "current_password" | "password" | "password_confirmation";
type Values = Record<Field, string>;

const MIN_LENGTH = 12;
const emptyValues: Values = {
  current_password: "",
  password: "",
  password_confirmation: "",
};

function PasswordInput({
  name,
  label,
  autoComplete,
  value,
  error,
  hint,
  onChange,
}: {
  name: Field;
  label: string;
  autoComplete: "current-password" | "new-password";
  value: string;
  error?: string;
  hint?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const [visible, setVisible] = useState(false);
  const describedBy =
    [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className="admin-field admin-password-field">
      <label htmlFor={`admin-${name}`}>{label}</label>
      <span className="admin-password-input">
        <input
          id={`admin-${name}`}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </span>
      {hint && <small id={`${name}-hint`}>{hint}</small>}
      {error && (
        <small className="admin-field-error" id={`${name}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}

function serverErrors(cause: unknown): Partial<Values> {
  if (!(cause instanceof ApiError) || cause.status !== 422) return {};
  const details = cause.details as { errors?: Record<string, string[]> } | undefined;
  return Object.fromEntries(
    Object.entries(details?.errors ?? {}).map(([field, messages]) => [field, messages[0]]),
  ) as Partial<Values>;
}

/** The signed-in administrator's own password. Other users reset theirs through the reset-link flow. */
export default function AdminAccount({ email }: { email: string }) {
  const [values, setValues] = useState<Values>(emptyValues);
  const [errors, setErrors] = useState<Partial<Values>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as Field;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSaved(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Partial<Values> = {};
    if (!values.current_password) next.current_password = "Enter your current password.";
    if (values.password.length < MIN_LENGTH) next.password = `Use at least ${MIN_LENGTH} characters.`;
    else if (values.password === values.current_password) next.password = "Choose a password you haven’t used for this account.";
    if (values.password !== values.password_confirmation) next.password_confirmation = "The new passwords don’t match.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      await apiRequest("/account/password", { method: "PUT", body: JSON.stringify(values) });
      setValues(emptyValues);
      setSaved(true);
    } catch (cause) {
      const fieldErrors = serverErrors(cause);
      if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
      else if (cause instanceof ApiError && cause.status === 429) setFormError("Too many attempts. Wait a minute, then try again.");
      else setFormError(cause instanceof Error ? cause.message : "We couldn’t update your password. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-account-layout">
      <section className="admin-panel" aria-labelledby="admin-password-title">
        <header className="admin-panel-head">
          <h2 id="admin-password-title">Change password</h2>
        </header>
        <form className="admin-account-form" onSubmit={(event) => void submit(event)} noValidate>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <PasswordInput name="current_password" label="Current password" autoComplete="current-password" value={values.current_password} error={errors.current_password} onChange={update} />
          <PasswordInput name="password" label="New password" autoComplete="new-password" value={values.password} error={errors.password} hint={`At least ${MIN_LENGTH} characters. A short phrase is easier to remember than random symbols.`} onChange={update} />
          <PasswordInput name="password_confirmation" label="Confirm new password" autoComplete="new-password" value={values.password_confirmation} error={errors.password_confirmation} onChange={update} />
          {formError && <p className="admin-account-message is-error" role="alert">{formError}</p>}
          {saved && <p className="admin-account-message is-success" role="status"><Check size={16} aria-hidden="true" /> Password updated. Other devices were signed out.</p>}
          <button className="admin-primary-button" type="submit" disabled={saving}>
            <KeyRound size={16} aria-hidden="true" /> {saving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="admin-panel admin-account-notes" aria-labelledby="admin-account-notes-title">
        <header className="admin-panel-head">
          <h2 id="admin-account-notes-title">Before you change it</h2>
        </header>
        <p className="admin-account-email">Signed in as <strong>{email}</strong></p>
        <ul>
          <li><LogOut size={16} aria-hidden="true" /> Saving signs this account out on every other device. You stay signed in here.</li>
          <li><ShieldCheck size={16} aria-hidden="true" /> Use a password you don’t use anywhere else. Admin accounts can change every part of AYOS.</li>
          <li><KeyRound size={16} aria-hidden="true" /> AYOS staff will never ask you for your password.</li>
        </ul>
      </section>
    </div>
  );
}
