import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileText, 
  Files, 
  ShieldCheck, 
  Settings, 
  LogOut,
  Cross,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type NavigationPage = 
  | 'dashboard'
  | 'patients'
  | 'register'
  | 'record-detail'
  | 'documents'
  | 'upload-doc'
  | 'doc-viewer'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentPage: NavigationPage;
  onNavigate: (page: NavigationPage, patientId?: string, docId?: string) => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  onNavigate, 
  isOpenMobile = false, 
  onCloseMobile 
}) => {
  const { logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as NavigationPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients' as NavigationPage, label: 'Patients', icon: Users },
    { id: 'register' as NavigationPage, label: 'Register Patient', icon: UserPlus },
    { id: 'record-detail' as NavigationPage, label: 'Medical Records', icon: FileText },
    { id: 'documents' as NavigationPage, label: 'Documents', icon: Files },
    { id: 'audit' as NavigationPage, label: 'Audit Logs', icon: ShieldCheck },
    { id: 'settings' as NavigationPage, label: 'Settings', icon: Settings },
  ];

  const handleItemClick = (pageId: NavigationPage) => {
    onNavigate(pageId);
    if (onCloseMobile) onCloseMobile();
  };

  const handleLogout = () => {
    if (onCloseMobile) onCloseMobile();
    logout();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full bg-white select-none">
      <div>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Cross className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="font-bold text-slate-900 tracking-tight text-lg leading-tight">MediVault</div>
              <div className="text-[11px] font-medium text-slate-400 tracking-wide">Patient Records</div>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              title="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = 
              currentPage === item.id || 
              (item.id === 'record-detail' && (currentPage === 'record-detail' || currentPage === 'upload-doc' || currentPage === 'doc-viewer')) ||
              (item.id === 'documents' && currentPage === 'documents');

            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Laptop docked sidebar */}
      <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 h-screen sticky top-0 z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile & Tablet Drawer Modal */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            onClick={onCloseMobile} 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Drawer content */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl z-50 transform transition-transform animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
