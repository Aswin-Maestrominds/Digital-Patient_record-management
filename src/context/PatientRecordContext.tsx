import React, { createContext, useContext, useState } from "react";
import { api, documentBlob } from "../api/client";
import {
  Patient,
  PatientInput,
  PatientPatch,
  MedicalDocument,
  DocumentInput,
} from "../api/types";

interface RecordsState {
  revision: number;
  refresh: () => void;
  deletePatient: (id: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  addPatient: (input: PatientInput) => Promise<Patient>;
  updatePatient: (id: string, input: PatientPatch) => Promise<Patient>;
  addDocument: (input: DocumentInput, file: File) => Promise<MedicalDocument>;
  downloadDocument: (document: MedicalDocument) => Promise<void>;
  digitalCardModalPatient: Patient | null;
  openDigitalCardModal: (patient: Patient) => void;
  closeDigitalCardModal: () => void;
}
const RecordsContext = createContext<RecordsState | undefined>(undefined);

export function PatientRecordProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [revision, setRevision] = useState(0);
  const [digitalCardModalPatient, setCard] = useState<Patient | null>(null);
  const refresh = () => setRevision((value) => value + 1);
  const deletePatient = async (id: string) => {
    await api(`/patients/${encodeURIComponent(id)}`, { method: "DELETE" });
    setCard(null);
    refresh();
  };
  const deleteDocument = async (id: string) => {
    await api(`/documents/${encodeURIComponent(id)}`, { method: "DELETE" });
    refresh();
  };
  const addPatient = async (input: PatientInput) => {
    const result = await api<{ patient: Patient }>("/patients", {
      method: "POST",
      body: JSON.stringify(input),
    });
    refresh();
    return result.patient;
  };
  const updatePatient = async (id: string, input: PatientPatch) => {
    const result = await api<{ patient: Patient }>(
      `/patients/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(input),
      },
    );
    refresh();
    return result.patient;
  };
  const addDocument = async (input: DocumentInput, file: File) => {
    const form = new FormData();
    Object.entries(input).forEach(([key, value]) => {
      if (value !== undefined) form.set(key, value);
    });
    form.set("file", file);
    const result = await api<{ document: MedicalDocument }>(
      "/documents/upload",
      {
        method: "POST",
        body: form,
      },
    );
    refresh();
    return result.document;
  };
  const downloadDocument = async (document: MedicalDocument) => {
    const blob = await documentBlob(document.id, "download");
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = document.originalName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <RecordsContext.Provider
      value={{
        revision,
        refresh,
        deletePatient,
        deleteDocument,
        addPatient,
        updatePatient,
        addDocument,
        downloadDocument,
        digitalCardModalPatient,
        openDigitalCardModal: setCard,
        closeDigitalCardModal: () => setCard(null),
      }}
    >
      {children}
    </RecordsContext.Provider>
  );
}
export function usePatientRecords() {
  const context = useContext(RecordsContext);
  if (!context) throw new Error("PatientRecordProvider is required.");
  return context;
}
