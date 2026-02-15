import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { footballApi } from '../api/footballApi';
import FootballSpinner from './FootballSpinner';
import {
  getNotificationSettings,
  addNotificationTeam,
  removeNotificationTeam,
  markModalShown,
  markReminderShown,
  saveNotificationSettings,
} from '../services/notificationStore';
import {
  isPushSupported,
  subscribeToPush,
  getPermissionStatus,
} from '../services/pushNotificationService';

/**
 * NotificationSetupModal
 *
 * Modal for setting up push notifications and selecting favorite teams.
 * Shows on first visit and as a reminder after 3 days if not set up.
 */
export default function NotificationSetupModal({ isOpen, onClose, isReminder = false }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('intro'); // intro, teams, success
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState('');
  const searchTimeout = useRef(null);
  const inputRef = useRef(null);

  // Load existing teams on mount
  useEffect(() => {
    if (isOpen) {
      const settings = getNotificationSettings();
      setSelectedTeams(settings.favoriteTeams || []);
      setStep('intro');
      setSearchQuery('');
      setSearchResults([]);
      setError('');
    }
  }, [isOpen]);

  // Focus input when on teams step
  useEffect(() => {
    if (step === 'teams' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [step]);

  // Debounced search
  const handleSearch = useCallback(async (query) => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await footballApi.searchTeams(query);
        // Filter out already selected teams
        const filtered = results.filter(
          team => !selectedTeams.some(t => t.id === team.id)
        );
        setSearchResults(filtered.slice(0, 10));
      } catch (e) {
        console.error('Team search failed:', e);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [selectedTeams]);

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleAddTeam = (team) => {
    if (selectedTeams.length >= 28) {
      setError(t('notifications.maxTeamsReached', 'Maximum 28 teams allowed'));
      return;
    }
    setSelectedTeams(prev => [...prev, team]);
    addNotificationTeam(team);
    setSearchQuery('');
    setSearchResults([]);
    setError('');
  };

  const handleRemoveTeam = (teamId) => {
    setSelectedTeams(prev => prev.filter(t => t.id !== teamId));
    removeNotificationTeam(teamId);
  };

  const handleEnableNotifications = async () => {
    setEnabling(true);
    setError('');

    try {
      // Check if push is supported
      if (!isPushSupported()) {
        // Still allow setup without push - we can show in-app notifications
        saveNotificationSettings({ enabled: true });
        setStep('success');
        return;
      }

      // Try to subscribe to push
      await subscribeToPush();
      setStep('success');
    } catch (e) {
      console.error('Failed to enable notifications:', e);
      if (e.message?.includes('denied')) {
        setError(t('notifications.permissionDenied', 'Please allow notifications in your browser settings'));
      } else {
        // Still enable in-app notifications even if push fails
        saveNotificationSettings({ enabled: true });
        setStep('success');
      }
    } finally {
      setEnabling(false);
    }
  };

  const handleClose = () => {
    if (step === 'intro') {
      markModalShown();
    }
    if (isReminder) {
      markReminderShown();
    }
    onClose();
  };

  const handleSkip = () => {
    markModalShown();
    if (isReminder) {
      markReminderShown();
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={handleClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-xl animate-slideUp max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Intro Step */}
        {step === 'intro' && (
          <div className="p-6">
            {/* Header */}
            <div className="flex justify-end mb-2">
              <button onClick={handleClose} className="text-gray-400 p-1">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Bell Icon */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {isReminder
                  ? t('notifications.reminderTitle', 'Never miss your team!')
                  : t('notifications.setupTitle', 'Stay updated!')}
              </h2>
              <p className="text-gray-500 text-sm leading-relaxed">
                {isReminder
                  ? t('notifications.reminderDesc', 'Set up notifications to get alerts when your favorite teams play. You\'ll also get the best betting tips!')
                  : t('notifications.setupDesc', 'Get notified when your favorite teams play, plus receive exclusive betting tips and value bets.')}
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  {t('notifications.benefit1', 'Match reminders 1 hour before kickoff')}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-amber-50 rounded-xl p-3">
                <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  {t('notifications.benefit2', '"Value bet" alerts for your teams')}
                </p>
              </div>
              <div className="flex items-center gap-3 bg-purple-50 rounded-xl p-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 2a2 2 0 00-2 2v14l3.5-2 3.5 2 3.5-2 3.5 2V4a2 2 0 00-2-2H5zm2.5 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm6.207.293a1 1 0 00-1.414 0l-6 6a1 1 0 101.414 1.414l6-6a1 1 0 000-1.414zM12.5 10a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" clipRule="evenodd"/>
                  </svg>
                </div>
                <p className="text-sm text-gray-700">
                  {t('notifications.benefit3', 'Special offers and bonuses')}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={() => setStep('teams')}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl shadow-lg shadow-primary-200 mb-3"
            >
              {t('notifications.setupButton', 'Set Up Notifications')}
            </button>
            <button
              onClick={handleSkip}
              className="w-full py-3 text-gray-500 font-medium text-sm"
            >
              {t('notifications.skipButton', 'Maybe later')}
            </button>
          </div>
        )}

        {/* Teams Selection Step */}
        {step === 'teams' && (
          <>
            {/* Header */}
            <div className="sticky top-0 bg-white px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => setStep('intro')} className="text-gray-400 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/>
                  </svg>
                </button>
                <h3 className="text-lg font-bold text-gray-900">
                  {t('notifications.selectTeams', 'Select Teams')}
                </h3>
                <button onClick={handleClose} className="text-gray-400 p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('notifications.searchPlaceholder', 'Search teams... (e.g. Barcelona, Liverpool)')}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <FootballSpinner size="xs" />
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Error */}
              {error && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                  </svg>
                  {error}
                </div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">
                    {t('notifications.searchResults', 'Search Results')}
                  </p>
                  <div className="space-y-2">
                    {searchResults.map(team => (
                      <button
                        key={team.id}
                        onClick={() => handleAddTeam(team)}
                        className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-500">
                              {team.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 text-sm">{team.name}</p>
                          {team.country && (
                            <p className="text-xs text-gray-500">{team.country}</p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Teams */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-500">
                    {t('notifications.yourTeams', 'Your Teams')}
                  </p>
                  <span className="text-xs text-gray-400">
                    {selectedTeams.length}/28
                  </span>
                </div>

                {selectedTeams.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
                      </svg>
                    </div>
                    <p className="text-gray-500 text-sm">
                      {t('notifications.noTeamsYet', 'Search and add your favorite teams above')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedTeams.map(team => (
                      <div
                        key={team.id}
                        className="flex items-center gap-3 p-3 bg-primary-50 border border-primary-100 rounded-xl"
                      >
                        {team.logo ? (
                          <img
                            src={team.logo}
                            alt={team.name}
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-bold text-primary-700">
                              {team.name?.charAt(0)}
                            </span>
                          </div>
                        )}
                        <p className="flex-1 font-medium text-gray-900 text-sm">{team.name}</p>
                        <button
                          onClick={() => handleRemoveTeam(team.id)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleEnableNotifications}
                disabled={enabling}
                className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-green-200"
              >
                {enabling ? (
                  <>
                    <FootballSpinner size="xs" light />
                    {t('notifications.enabling', 'Enabling...')}
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/>
                    </svg>
                    {selectedTeams.length > 0
                      ? t('notifications.enableWithTeams', `Enable Notifications (${selectedTeams.length} teams)`)
                      : t('notifications.enableButton', 'Enable Notifications')}
                  </>
                )}
              </button>
              {selectedTeams.length === 0 && (
                <p className="text-center text-xs text-gray-400 mt-2">
                  {t('notifications.addTeamsHint', 'Add teams to get personalized match alerts')}
                </p>
              )}
            </div>
          </>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="p-6 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('notifications.successTitle', 'You\'re all set!')}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {selectedTeams.length > 0
                ? t('notifications.successDescWithTeams', `We'll notify you about matches for ${selectedTeams.length} team(s) and send you the best betting tips.`)
                : t('notifications.successDesc', 'You\'ll receive the best betting tips and match alerts.')}
            </p>

            {selectedTeams.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center mb-6">
                {selectedTeams.slice(0, 5).map(team => (
                  <div key={team.id} className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1.5">
                    {team.logo && (
                      <img src={team.logo} alt="" className="w-4 h-4 object-contain"/>
                    )}
                    <span className="text-xs font-medium text-gray-700">{team.name}</span>
                  </div>
                ))}
                {selectedTeams.length > 5 && (
                  <div className="bg-gray-100 rounded-full px-3 py-1.5">
                    <span className="text-xs font-medium text-gray-700">+{selectedTeams.length - 5}</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleClose}
              className="w-full py-3.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold rounded-xl"
            >
              {t('notifications.doneButton', 'Done')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
