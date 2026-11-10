import { Eye, Upload, UserPlus, FilePenLine } from "lucide-react";

import { AuditEvent, roleLabel } from "../../api/types";

import { timestampLabel, timeLabel } from "../../utils/display";

export const activityLabel = (action: string) =>
  ({
    PATIENT_CREATE: "Patient registered",
    PATIENT_UPDATE: "Record updated",
    PATIENT_VIEW: "Patient record viewed",
    DOCUMENT_VIEW: "Document accessed",
    DOCUMENT_UPLOAD: "Document uploaded",
    DOCUMENT_DOWNLOAD: "Document downloaded",
    LOGIN: "Signed in",
  })[action] ?? action.replace(/_/g, " ").toLowerCase();

export function ActivityFeed({
  logs,
  compact = false,
}: {
  logs: AuditEvent[];
  compact?: boolean;
}) {
  return (
    <div>
      {!logs.length && (
        <p className="text-sm text-slate-500 py-6">No activity recorded yet.</p>
      )}
      {logs.map((event) => {
        const Icon = event.action.includes("UPLOAD")
          ? Upload
          : event.action.includes("CREATE")
            ? UserPlus
            : event.action.includes("UPDATE")
              ? FilePenLine
              : Eye;
        return (
          <div
            key={event._id}
            className={`flex gap-4 py-3 ${compact ? "" : "items-center"}`}
          >
            <span className="bg-slate-50 text-blue-500 p-2.5 rounded-lg self-start">
              <Icon size={18} strokeWidth={1.5} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">{activityLabel(event.action)}</p>
              <p className="text-xs text-slate-500 mt-1 break-words">
                {compact
                  ? `${event.actorName ?? "Authorized user"} - ${roleLabel(event.actorRole)}`
                  : (event.patientId ?? event.resourceId ?? event.outcome)}
              </p>
              {compact && (
                <p className="text-xs text-slate-500 mt-2">
                  {timestampLabel(event.occurredAt)}
                </p>
              )}
            </div>
            {!compact && (
              <>
                <span className="hidden md:block text-[13px] text-slate-500 w-32">
                  {event.actorName ?? "Authorized user"}
                </span>
                <time className="text-xs text-slate-500">
                  {timeLabel(event.occurredAt)}
                </time>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
