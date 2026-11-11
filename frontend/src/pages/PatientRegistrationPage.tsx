import React, { useState } from "react";

import {
  UserPlus,
  RotateCcw,
  User,
  MapPin,
  HeartHandshake,
} from "lucide-react";

import { NavigationPage } from "../components/layout/Sidebar";

import { usePatientRecords } from "../context/PatientRecordContext";

import { Patient, PatientInput } from "../api/types";

import { errorMessage } from "../api/client";

import { ErrorNotice } from "../components/common/ApiState";

import { today } from "../utils/display";

interface Props {
  onNavigate: (page: NavigationPage, patientId?: string) => void;

  patient?: Patient;

  onSaved?: () => void;
}

export function PatientRegistrationPage({
  onNavigate,
  patient,
  onSaved,
}: Props) {
  const { addPatient, updatePatient } = usePatientRecords();

  const initial = {
    name: patient?.name || "",

    dob: patient?.dob || "",

    gender: patient?.gender || ("" as "" | PatientInput["gender"]),

    phone: patient?.phone || "",

    email: patient?.email || "",

    bloodGroup: patient?.bloodGroup || "",

    street: patient?.address?.street || "",

    city: patient?.address?.city || "",

    state: patient?.address?.state || "",

    zip: patient?.address?.zip || "",

    country: patient?.address?.country || "India",

    emergencyName: patient?.emergencyContact?.name || "",

    emergencyRelationship: patient?.emergencyContact?.relationship || "",

    emergencyPhone: patient?.emergencyContact?.phone || "",

    notes: patient?.notes || "",
  };

  const [form, setForm] = useState(initial);

  const [busy, setBusy] = useState(false);

  const [error, setError] = useState("");

  const field = (key: keyof typeof form) => ({
    value: form[key],

    onChange: (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => setForm((previous) => ({ ...previous, [key]: e.target.value })),
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    if (busy) return;

    setBusy(true);

    setError("");

    const input: PatientInput = {
      name: form.name.trim(),

      dob: form.dob,

      gender: form.gender as PatientInput["gender"],

      phone: form.phone.trim(),

      email: form.email.trim(),

      ...(form.bloodGroup ? { bloodGroup: form.bloodGroup } : {}),

      address: {
        street: form.street,

        city: form.city,

        state: form.state,

        zip: form.zip,

        country: form.country,
      },

      emergencyContact: {
        name: form.emergencyName,

        relationship: form.emergencyRelationship,

        ...(form.emergencyPhone.trim()
          ? { phone: form.emergencyPhone.trim() }
          : {}),
      },

      notes: form.notes,
    };

    try {
      const saved = patient
        ? await updatePatient(patient.id, {
            ...input,

            bloodGroup: form.bloodGroup || null,

            emergencyContact: {
              ...input.emergencyContact,

              phone: form.emergencyPhone.trim() || null,
            },
          })
        : await addPatient(input);

      if (onSaved) onSaved();
      else onNavigate("record-detail", saved.id);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">
            {patient ? "Edit Patient Profile" : "Register Patient"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create a patient record. Fields marked * are required.
          </p>
        </div>
        <span className="badge">
          {patient ? "Edit patient" : "New patient"}
        </span>
      </div>
      <ErrorNotice message={error} />
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <div className="settings-grid">
            <div className="space-y-6">
              <section className="panel">
                <h2>Personal Information</h2>
                <div className="registration-fields grid grid-cols-2 gap-5">
                  <label className="label col-span-2">
                    Full name *
                    <input
                      className="field"
                      required
                      minLength={2}
                      maxLength={200}
                      {...field("name")}
                    />
                  </label>
                  <label className="label">
                    Date of birth *
                    <input
                      className="field"
                      type="date"
                      required
                      min="1850-01-01"
                      max={today()}
                      {...field("dob")}
                    />
                  </label>
                  <label className="label">
                    Gender *
                    <select className="field" required {...field("gender")}>
                      <option value="">Select gender</option>
                      {["Male", "Female", "Other"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="label col-span-2">
                    Phone *
                    <input
                      className="field"
                      type="tel"
                      required
                      maxLength={20}
                      {...field("phone")}
                    />
                  </label>
                  <label className="label col-span-2">
                    Email Address
                    <input
                      className="field"
                      type="email"
                      maxLength={254}
                      {...field("email")}
                    />
                  </label>
                </div>
              </section>
              <section className="panel">
                <h2>Address</h2>
                <div className="registration-fields grid grid-cols-2 gap-5">
                  {(["street", "city", "state", "zip"] as const).map((key) => (
                    <label
                      className={`label ${key === "street" || key === "zip" ? "col-span-2" : ""}`}
                      key={key}
                    >
                      {key === "street"
                        ? "Address Line"
                        : key === "zip"
                          ? "Postal Code"
                          : key === "city"
                            ? "City"
                            : "State"}
                      <input
                        className="field"
                        maxLength={200}
                        {...field(key)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            </div>
            <div className="space-y-6">
              <section className="panel">
                <h2>Emergency Contact</h2>
                <div className="space-y-5">
                  <label className="label">
                    Contact name
                    <input
                      className="field"
                      maxLength={200}
                      {...field("emergencyName")}
                    />
                  </label>
                  <label className="label">
                    Relationship
                    <input
                      className="field"
                      maxLength={100}
                      {...field("emergencyRelationship")}
                    />
                  </label>
                  <label className="label">
                    Contact phone
                    <input
                      className="field"
                      type="tel"
                      maxLength={20}
                      {...field("emergencyPhone")}
                    />
                  </label>
                </div>
              </section>
              <section className="panel">
                <h2>Registration Details</h2>
                <div className="space-y-5">
                  <label className="label">
                    Patient ID
                    <input
                      className="field"
                      readOnly
                      value={patient?.id ?? "Assigned when you register"}
                    />
                    <span className="text-xs text-slate-500">
                      Automatically assigned on registration.
                    </span>
                  </label>
                  <label className="label">
                    Registration Date
                    <input
                      className="field"
                      readOnly
                      type="date"
                      value={patient?.createdAt.slice(0, 10) ?? today()}
                    />
                  </label>
                  <label className="label">
                    Optional Notes
                    <textarea
                      aria-label="Optional Notes"
                      className="field min-h-28"
                      placeholder="Add administrative notes about this record..."
                      maxLength={5000}
                      {...field("notes")}
                    />
                    <span className="text-xs text-slate-500">
                      Do not include clinical findings in registration notes.
                    </span>
                  </label>
                </div>
                <details className="mt-4 text-sm">
                  <summary className="text-slate-500 cursor-pointer">
                    Additional details
                  </summary>
                  <label className="label mt-3">
                    Blood group
                    <select className="field" {...field("bloodGroup")}>
                      <option value="">Not recorded</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="label mt-3">
                    Country
                    <input className="field" {...field("country")} />
                  </label>
                </details>
              </section>
            </div>
          </div>
          <div className="panel mt-6 p-5 flex flex-wrap justify-between items-center gap-4">
            <p className="text-xs text-slate-500">
              Patient details are available to authorized staff only.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => (onSaved ? onSaved() : onNavigate("patients"))}
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                {busy
                  ? "Saving..."
                  : patient
                    ? "Save Changes"
                    : "Register Patient"}
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
