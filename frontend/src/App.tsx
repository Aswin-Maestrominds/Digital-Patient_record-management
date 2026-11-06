import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { usePatientRecords, PatientRecordProvider } from './context/PatientRecordContext';
import { Loading, ErrorNotice } from './components/common/ApiState';
import { Sidebar, NavigationPage } from './components/layout/Sidebar';
import { TopNavbar } from './components/layout/TopNavbar';
import { DigitalHealthCardModal } from './components/common/DigitalHealthCardModal';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsDirectoryPage } from './pages/PatientsDirectoryPage';
import { PatientRegistrationPage } from './pages/PatientRegistrationPage';
import { PatientRecordDetailPage } from './pages/PatientRecordDetailPage';
import { UploadDocumentPage } from './pages/UploadDocumentPage';
import { DocumentViewerPage } from './pages/DocumentViewerPage';
import { CentralizedDocumentsPage } from './pages/CentralizedDocumentsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsSecurityPage } from './pages/SettingsSecurityPage';

export const App: React.FC = () => {
  const { currentUser, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Loading text="Checking your session…" />
      </div>
    );
  if (!currentUser) return <LoginPage />;
  return (
    <PatientRecordProvider key={currentUser.id}>
      <Workspace />
    </PatientRecordProvider>
  );
};

const Workspace: React.FC = () => {
  const { error } = useAuth();
  const { digitalCardModalPatient, closeDigitalCardModal } = usePatientRecords();

  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const handleNavigate = (page: NavigationPage, patientId?: string, docId?: string) => {
    if (page === 'record-detail' && !patientId && !selectedPatientId) page = 'patients';
    if (page === 'upload-doc') setSelectedPatientId(patientId || '');
    if (patientId) setSelectedPatientId(patientId);
    if (docId) setSelectedDocId(docId);
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar (Docked on desktop/laptop, off-canvas drawer on mobile/tablet) */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <TopNavbar
          onNavigate={handleNavigate}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        <main className="flex-1 pb-16 px-3 sm:px-6 lg:px-8 max-w-full">
          <ErrorNotice message={error} />
          {currentPage === 'dashboard' && <DashboardPage onNavigate={handleNavigate} />}

          {currentPage === 'patients' && <PatientsDirectoryPage onNavigate={handleNavigate} />}

          {currentPage === 'register' && <PatientRegistrationPage onNavigate={handleNavigate} />}

          {currentPage === 'record-detail' && (
            <PatientRecordDetailPage
              key={selectedPatientId}
              patientId={selectedPatientId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'upload-doc' && (
            <UploadDocumentPage
              key={selectedPatientId}
              initialPatientId={selectedPatientId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'doc-viewer' && (
            <DocumentViewerPage
              key={selectedDocId}
              patientId={selectedPatientId}
              docId={selectedDocId}
              onNavigate={handleNavigate}
            />
          )}

          {currentPage === 'documents' && <CentralizedDocumentsPage onNavigate={handleNavigate} />}

          {currentPage === 'audit' && <AuditLogsPage onNavigate={handleNavigate} />}

          {currentPage === 'settings' && <SettingsSecurityPage onNavigate={handleNavigate} />}
        </main>
      </div>

      {/* Digital Health Pass Modal (NFC Badge) */}
      <DigitalHealthCardModal patient={digitalCardModalPatient} onClose={closeDigitalCardModal} />
    </div>
  );
};

export default App;
