import { ArrowUpRight } from "lucide-react";

import { Patient } from "../../api/types";

import { ageFromDob, dateLabel, initials } from "../../utils/display";

export function PatientCard({
  patient,
  onOpen,
  recent = false,
}: {
  patient: Patient;
  onOpen: () => void;
  recent?: boolean;
}) {
  return (
    <article className="panel patient-card">
      <div className="flex items-center gap-3">
        <span className="avatar avatar-lg">{initials(patient.name)}</span>
        <div className="min-w-0">
          <h2 className="font-semibold truncate">{patient.name}</h2>
          <p className="text-xs text-slate-500 mt-1">{patient.id}</p>
        </div>
      </div>

      <div className="flex justify-between gap-2 items-center my-5 text-[13px] text-slate-500">
        <span>
          {ageFromDob(patient.dob)} years &middot; {patient.gender}
        </span>
        <span className="badge">
          {patient.storedRecordsCount ?? 0} documents
        </span>
      </div>

      <div className="border-t border-slate-200 pt-5 flex items-center justify-between">
        <div className="text-xs">
          <p className="text-slate-500 mb-1">
            {recent ? "Last updated" : "Registered"}
          </p>
          <p>{dateLabel(recent ? patient.updatedAt : patient.createdAt)}</p>
        </div>
        <button
          className="text-blue-600 text-[13px] font-medium flex items-center gap-2"
          aria-label={`Open record for ${patient.name}`}
          onClick={onOpen}
        >
          View Record <ArrowUpRight size={15} />
        </button>
      </div>
    </article>
  );
}
