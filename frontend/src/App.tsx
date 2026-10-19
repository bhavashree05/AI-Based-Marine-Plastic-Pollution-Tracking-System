import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { ObservationModal } from './components/ObservationModal';
import { DashboardOverview } from './pages/DashboardOverview';
import { DetectionPage } from './pages/DetectionPage';
import { MapPage } from './pages/MapPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { HotspotsPage } from './pages/HotspotsPage';
import { CleanupPage } from './pages/CleanupPage';
import { AlertsReportsPage } from './pages/AlertsReportsPage';
import { AboutVivaPage } from './pages/AboutVivaPage';
import { fetchAlerts } from './services/api';
import { AlertItem } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isObservationModalOpen, setIsObservationModalOpen] = useState<boolean>(false);
  const [modalCoords, setModalCoords] = useState<{ lat: number; lng: number } | undefined>(undefined);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts({ limit: 10 });
      setAlerts(data);
    } catch (e) {
      // Backend might be warming up
    }
  };

  const handleOpenObservationModal = (coords?: { lat: number; lng: number }) => {
    setModalCoords(coords);
    setIsObservationModalOpen(true);
  };

  const titles: Record<string, string> = {
    overview: 'Overview Dashboard & Analytics',
    detection: 'AI-Based Marine Plastic Detection',
    map: 'Geographical Pollution Tracking Map',
    analytics: 'Dataset Preprocessing & Exploratory Analysis',
    hotspots: 'Intelligent Hotspot Prioritization',
    cleanup: 'Marine Cleanup Operations & Management',
    alerts: 'Environmental Alerts & Reporting',
    about: 'System Architecture & Viva Voce Guide',
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAlertsCount={unreadCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Navbar
          activeTabTitle={titles[activeTab] || 'MarineGuard AI'}
          onOpenObservationModal={() => handleOpenObservationModal()}
          onQuickAiScan={() => setActiveTab('detection')}
          alerts={alerts}
          onOpenAlerts={() => setActiveTab('alerts')}
        />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <ErrorBoundary>
            {activeTab === 'overview' && (
              <DashboardOverview
                onNavigateTab={(tab) => setActiveTab(tab)}
                onOpenObservationModal={() => handleOpenObservationModal()}
              />
            )}

            {activeTab === 'detection' && <DetectionPage />}

            {activeTab === 'map' && (
              <MapPage
                onOpenObservationModalWithCoords={(coords) => handleOpenObservationModal(coords)}
              />
            )}

            {activeTab === 'analytics' && <AnalyticsPage />}

            {activeTab === 'hotspots' && (
              <HotspotsPage onNavigateToCleanup={() => setActiveTab('cleanup')} />
            )}

            {activeTab === 'cleanup' && <CleanupPage />}

            {activeTab === 'alerts' && <AlertsReportsPage />}

            {activeTab === 'about' && <AboutVivaPage />}
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Observation Logging Modal */}
      <ObservationModal
        isOpen={isObservationModalOpen}
        onClose={() => {
          setIsObservationModalOpen(false);
          setModalCoords(undefined);
        }}
        onSuccess={() => {
          loadAlerts();
        }}
        initialCoords={modalCoords}
      />
    </div>
  );
}

export default App;
