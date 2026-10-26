import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Copy, Dices, UserPlus, X } from "lucide-react";
import { ApiError, validationErrors } from "../../lib/api/client";
import {
  adminService,
  type AdminRoleOption,
  type CreatedAdministrator,
  type NewAdministrator,
} from "../../services/admin.service";
import { PasswordInput } from "./AdminAccount";

type Field = keyof NewAdministrator;
type Errors = Partial<Record<Field, string>>;

const MIN_LENGTH = 12;
const emptyValues: NewAdministrator = {
  name: "",
  email: "",
  mobile_number: "",
  role: "",
  password: "",
  password_confirmation: "",
};
const fields = Object.keys(emptyValues) as Field[];

/** What each role can reach, so the creator can pick the least access that does the job. Mirrors the role_permissions seed. */
const roleScope: Record<string, string> = {
  super_admin: "Every section, and can add other super admins.",
  admin: "Every section. Can add admins, but not super admins.",
  moderator: "Provider applications, listings, requests, reviews, reports and disputes.",
  support: "Looks up users, providers and requests. Handles reports and disputes.",
};

/** Letters and digits that can't be misread when the password is read out or retyped. */
const READABLE = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** Four groups of five joined by hyphens: about 116 bits of randomness, and the hyphens satisfy the symbol rule. */
function generatePassword() {
  const characters = Array.from(
    crypto.getRandomValues(new Uint32Array(20)),
    (value) => READABLE[value % READABLE.length],
  );
  return [0, 5, 10, 15].map((start) => characters.slice(start, start + 5).join("")).join("-");
}

function TextField({
  name,
  label,
  value,
  error,
  onChange,
  type = "text",
  placeholder,
  wide = false,
}: {
  name: Field;
  label: string;
  value: string;
  error?: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  type?: "text" | "email" | "tel";
  placeholder?: string;
  wide?: boolean;
}) {
  const id = `add-admin-${name}`;
  return (
    <div className={`admin-field${wide ? " is-wide" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <small className="admin-field-error" id={`${id}-error`}>
          {error}
        </small>
      )}
    </div>
  );
}

function GeneratedPassword({ password }: { password: string }) {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };
  return (
    <div className="admin-generated-password">
      <span>
        <small>Generated password</small>
        <code>{password}</code>
      </span>
      <button type="button" className="admin-outline-button" onClick={() => void copyPassword()}>
        {copy === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        {copy === "copied" ? "Copied" : "Copy"}
      </button>
      {copy === "failed" && <p role="alert">Couldn’t copy. Select the password and copy it yourself.</p>}
    </div>
  );
}

/**
 * Creates an administrator account with a first password the creator chooses and shares privately.
 * `roles` comes from the server, so an administrator is never offered Super admin.
 */
export default function AddAdministrator({
  roles,
  onClose,
  onCreated,
}: {
  roles: AdminRoleOption[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [values, setValues] = useState<NewAdministrator>(emptyValues);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [generated, setGenerated] = useState("");
  const [created, setCreated] = useState<CreatedAdministrator | null>(null);
  const roleName = (slug: string) => roles.find((role) => role.slug === slug)?.name ?? slug;

  useEffect(() => {
    document.getElementById(created ? "add-admin-done" : "add-admin-name")?.focus();
  }, [created]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, saving]);

  const update = (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.target.name as Field;
    setValues((current) => ({ ...current, [field]: event.target.value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (field === "password" || field === "password_confirmation") setGenerated("");
  };

  const generate = () => {
    const password = generatePassword();
    setValues((current) => ({ ...current, password, password_confirmation: password }));
    setErrors((current) => ({ ...current, password: undefined, password_confirmation: undefined }));
    setGenerated(password);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Errors = {};
    if (!values.name.trim()) next.name = "Enter their full name.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) next.email = "Enter an email address, like name@example.com.";
    if (!values.mobile_number.trim()) next.mobile_number = "Enter their mobile number.";
    if (!values.role) next.role = "Choose a role.";
    if (values.password.length < MIN_LENGTH) next.password = `Use at least ${MIN_LENGTH} characters.`;
    else if (!/[\p{Z}\p{S}\p{P}]/u.test(values.password)) next.password = "Include at least one symbol, like - or !.";
    if (values.password !== values.password_confirmation) next.password_confirmation = "The passwords don’t match.";
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;

    setSaving(true);
    try {
      const { data } = await adminService.createAdministrator(values);
      setValues(emptyValues);
      setCreated(data);
      onCreated();
    } catch (cause) {
      const { fields: fieldErrors, other } = validationErrors(cause, fields);
      if (other || Object.keys(fieldErrors).length) {
        setErrors(fieldErrors);
        setFormError(other ?? "");
      } else if (cause instanceof ApiError && cause.status === 403) setFormError("Your role can’t add administrators.");
      else if (cause instanceof ApiError && cause.status === 429) setFormError("Too many attempts. Wait a minute, then try again.");
      else setFormError(cause instanceof Error ? cause.message : "We couldn’t add this administrator. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const addAnother = () => {
    setCreated(null);
    setGenerated("");
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="admin-modal admin-add-admin" role="dialog" aria-modal="true" aria-labelledby="add-admin-title">
        <header>
          <div>
            <span className="admin-eyebrow">ADMIN SECURITY</span>
            <h2 id="add-admin-title">{created ? "Administrator added" : "Add an administrator"}</h2>
          </div>
          <button className="admin-icon-button" type="button" onClick={onClose} disabled={saving} aria-label="Close">
            <X size={19} />
          </button>
        </header>

        {created ? (
          <div className="admin-modal-body admin-add-admin-body">
            <p className="admin-account-message is-success" role="status">
              <Check size={16} aria-hidden="true" /> {created.name} can now sign in to the admin console.
            </p>
            <dl className="admin-add-admin-summary">
              <div>
                <dt>Email</dt>
                <dd>{created.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleName(created.role)}</dd>
              </div>
            </dl>
            {generated && <GeneratedPassword password={generated} />}
            <p className="admin-add-admin-note">
              Share the password with them privately. AYOS won’t show it again, and they can change it under My account.
            </p>
            <div className="admin-modal-actions">
              <button id="add-admin-done" type="button" className="admin-primary-button" onClick={onClose}>
                Done
              </button>
              <button type="button" onClick={addAnother}>
                Add another
              </button>
            </div>
          </div>
        ) : (
          <form className="admin-modal-body admin-add-admin-body" onSubmit={(event) => void submit(event)} noValidate>
            <div className="admin-add-admin-grid">
              <TextField name="name" label="Full name" value={values.name} error={errors.name} onChange={update} wide />
              <TextField name="email" label="Email" type="email" value={values.email} error={errors.email} onChange={update} />
              <TextField
                name="mobile_number"
                label="Mobile number"
                type="tel"
                placeholder="+63 917 123 4567"
                value={values.mobile_number}
                error={errors.mobile_number}
                onChange={update}
              />
            </div>

            <fieldset className="admin-role-options" aria-describedby={errors.role ? "add-admin-role-error" : undefined}>
              <legend>Role</legend>
              {roles.map((role) => (
                <label key={role.slug} className="admin-role-option">
                  <input type="radio" name="role" value={role.slug} checked={values.role === role.slug} onChange={update} />
                  <span>
                    <strong>{role.name}</strong>
                    <small>{roleScope[role.slug]}</small>
                  </span>
                </label>
              ))}
              {errors.role && (
                <small className="admin-field-error" id="add-admin-role-error">
                  {errors.role}
                </small>
              )}
            </fieldset>

            <div className="admin-add-admin-password">
              <div className="admin-add-admin-grid">
                <PasswordInput
                  idPrefix="add-admin"
                  name="password"
                  label="First password"
                  autoComplete="new-password"
                  value={values.password}
                  error={errors.password}
                  onChange={update}
                />
                <PasswordInput
                  idPrefix="add-admin"
                  name="password_confirmation"
                  label="Confirm password"
                  autoComplete="new-password"
                  value={values.password_confirmation}
                  error={errors.password_confirmation}
                  onChange={update}
                />
              </div>
              <div className="admin-password-rules">
                <span>At least {MIN_LENGTH} characters, including a symbol.</span>
                <button type="button" className="admin-outline-button" onClick={generate}>
                  <Dices size={15} aria-hidden="true" /> {generated ? "Generate another" : "Generate a strong password"}
                </button>
              </div>
              {generated && <GeneratedPassword key={generated} password={generated} />}
            </div>

            {formError && (
              <p className="admin-account-message is-error" role="alert">
                {formError}
              </p>
            )}
            <div className="admin-modal-actions">
              <button type="submit" className="admin-primary-button" disabled={saving}>
                <UserPlus size={16} aria-hidden="true" /> {saving ? "Adding…" : "Add administrator"}
              </button>
              <button type="button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
