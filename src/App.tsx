import React, { useState, useEffect, useCallback } from 'react';
import {
  loadUserPreferences,
  saveUserPreferences,
  DEFAULT_PREFERENCES,
  type UserPreferences,
} from './utils/storage.ts';
import type { FilterSettings, CameraFacingMode } from './types.ts';
import { HomeScreen } from './components/HomeScreen.tsx';
import { CameraView } from './components/CameraView.tsx';
import { InfoModal } from './components/InfoModal.tsx';

export default function App() {
  const [preferences, setPreferences] = useState<UserPreferences>(() => loadUserPreferences());
  const [currentView, setCurrentView] = useState<'home' | 'camera' | 'simulation'>('home');
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);

  // Check URL params for autostart or direct simulation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' || params.get('view') === 'camera') {
        setCurrentView('camera');
      } else if (params.get('simulation') === '1') {
        setCurrentView('simulation');
      }
    }
  }, []);

  // Update filter settings and persist to localStorage
  const handleUpdateSettings = useCallback((partial: Partial<FilterSettings>) => {
    setPreferences((prev) => {
      const nextSettings = { ...prev.settings, ...partial };
      const nextPrefs: UserPreferences = {
        ...prev,
        settings: nextSettings,
      };
      saveUserPreferences(nextPrefs);
      return nextPrefs;
    });
  }, []);

  // Save both settings and facing mode from camera view
  const handleSavePreferences = useCallback((settings: FilterSettings, facingMode: CameraFacingMode) => {
    const updated: UserPreferences = { settings, facingMode };
    setPreferences(updated);
    saveUserPreferences(updated);
  }, []);

  return (
    <div className="w-full min-h-screen bg-black text-slate-100 flex flex-col">
      {currentView === 'home' && (
        <HomeScreen
          settings={preferences.settings}
          onUpdateSettings={handleUpdateSettings}
          onOpenCamera={() => setCurrentView('camera')}
          onStartSimulation={() => setCurrentView('simulation')}
          onOpenInfo={() => setIsInfoOpen(true)}
        />
      )}

      {currentView === 'camera' && (
        <CameraView
          initialSettings={preferences.settings}
          initialFacingMode={preferences.facingMode}
          isSimulation={false}
          onBack={() => setCurrentView('home')}
          onSavePreferences={handleSavePreferences}
        />
      )}

      {currentView === 'simulation' && (
        <CameraView
          initialSettings={preferences.settings}
          initialFacingMode={preferences.facingMode}
          isSimulation={true}
          onBack={() => setCurrentView('home')}
          onSavePreferences={handleSavePreferences}
        />
      )}

      {/* Info & Instructions Modal */}
      <InfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </div>
  );
}
