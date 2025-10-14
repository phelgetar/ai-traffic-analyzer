import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// Types
import { Incident, AISummary } from './types';
import { Filters } from './components/FilterControls';

// Services
import { fetchLatestIncidents } from './services/api';
import { summarizeIncident } from './services/geminiService';
import { syncWithExternalApis } from './services/importer';
import logger from './utils/logger';

// Hooks
import { useLocation } from './hooks/useLocation';
import { usePrevious } from './hooks/usePrevious';

// Utils
import { calculateDistance } from './utils/location';

// Components
import Header from './components/Header';
import IncidentList from './components/IncidentList';
import IncidentDetail from './components/IncidentDetail';
import IncidentMap from './components/IncidentMap';
import FilterControls from './components/FilterControls';
import ErrorMessage from './components/ErrorMessage';
import LocationPermissionBanner from './components/LocationPermissionBanner';
import HistoryList from './components/HistoryList';
import NotificationContainer from './components/NotificationToast';
import FeedbackModal from './components/FeedbackModal';
import LogViewerModal from './components/LogViewerModal';

// This type is exported for use in NotificationToast.tsx
export interface Notification {
  id: number;
  message: string;
  type: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'SUCCESS' | 'ERROR';
}

const VIEW_HISTORY_LIMIT = 5;
const AUTO_REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const FILTERS_STORAGE_KEY = 'traffic_app_filters';

const defaultFilters: Filters = {
    query: '',
    state: '',
    severity: '',
    route: '',
    category: '',
    status: 'ACTIVE', // Default to active incidents
    startDate: '',
    endDate: '',
};


const App: React.FC = () => {
    // State for data and loading
    const [allIncidents, setAllIncidents] = useState<Incident[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // State for UI interaction
    const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
    const [viewHistory, setViewHistory] = useState<Incident[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const notificationIdCounter = useRef(0);

    // State for modals and panels
    const [isFeedbackModalOpen, setFeedbackModalOpen] = useState(false);
    const [isLogViewerOpen, setLogViewerOpen] = useState(false);

    // State for AI summary
    const [summary, setSummary] = useState<AISummary | null>(null);
    const [isSummaryLoading, setIsSummaryLoading] = useState<boolean>(false);
    
    // State for filtering, initialized from localStorage
    const [filters, setFilters] = useState<Filters>(() => {
        try {
            const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
            if (savedFilters) {
                return JSON.parse(savedFilters);
            }
        } catch (e) {
            logger.log(`Failed to parse saved filters from localStorage: ${e}`);
        }
        return defaultFilters;
    });

    // Save filters to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
        } catch (e) {
            logger.log(`Failed to save filters to localStorage: ${e}`);
        }
    }, [filters]);


    // State for background sync process
    const [isSyncing, setIsSyncing] = useState(false);

    // Custom hooks
    const { location, permissionStatus, isTracking, requestLocation, stopTracking } = useLocation();
    const prevIncidents = usePrevious(allIncidents);

    // Function to add notifications
    const addNotification = useCallback((message: string, type: Notification['type']) => {
        const newId = notificationIdCounter.current++;
        setNotifications(prev => [...prev, { id: newId, message, type }]);
    }, []);
    
    // Function to fetch incidents - used for refreshes
    const loadIncidents = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            logger.log("Fetching latest incidents from backend...");
            const incidents = await fetchLatestIncidents();
            setAllIncidents(incidents);
            setLastUpdated(new Date());
            logger.log(`Successfully fetched ${incidents.length} incidents.`);
        } catch (err: any) {
            setError(err.message || 'An unknown error occurred while fetching data.');
            logger.log(`Error fetching incidents: ${err.message}`);
            addNotification('Failed to fetch incident data.', 'ERROR');
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);

    const handleRefresh = useCallback(() => {
        setSelectedIncident(null);
        loadIncidents();
    }, [loadIncidents]);

    const handleSync = useCallback(async () => {
        setIsSyncing(true);
        addNotification('Starting data sync with external APIs...', 'MEDIUM');
        const result = await syncWithExternalApis();
        if (result.success) {
            addNotification(result.message, 'SUCCESS');
            handleRefresh(); // Refresh data after successful sync
        } else {
            addNotification(result.message, 'ERROR');
        }
        setIsSyncing(false);
    }, [addNotification, handleRefresh]);


    // Initial data load and automatic sync trigger
    useEffect(() => {
        const initialLoad = async () => {
            setIsLoading(true);
            setError(null);
            try {
                logger.log("Performing initial incident load...");
                const incidents = await fetchLatestIncidents();
                setAllIncidents(incidents);
                setLastUpdated(new Date());
                logger.log(`Successfully fetched ${incidents.length} incidents.`);

                // If the database is empty, trigger the first sync automatically
                if (incidents.length === 0) {
                    logger.log("Database appears empty. Triggering automatic initial data sync.");
                    // We don't need to await this; it runs in the background and provides its own notifications.
                    handleSync();
                }
            } catch (err: any) {
                setError(err.message || 'An unknown error occurred while fetching data.');
                logger.log(`Error fetching incidents: ${err.message}`);
                addNotification('Failed to fetch initial incident data.', 'ERROR');
            } finally {
                setIsLoading(false);
            }
        };

        initialLoad();
    }, [addNotification, handleSync]);

    // Auto-refresh handler
    const handleAutoRefresh = useCallback(() => {
        if (isLoading || isSyncing) {
            logger.log("Skipping auto-refresh because another operation is in progress.");
            return;
        }
        logger.log("Performing automatic background refresh...");
        loadIncidents();
    }, [isLoading, isSyncing, loadIncidents]);

    // Set up the auto-refresh interval
    useEffect(() => {
        logger.log(`Setting up auto-refresh for every ${AUTO_REFRESH_INTERVAL_MS / 1000 / 60} minutes.`);
        const intervalId = setInterval(handleAutoRefresh, AUTO_REFRESH_INTERVAL_MS);
        
        // Cleanup function to clear the interval when the component unmounts
        return () => {
            logger.log("Clearing auto-refresh interval.");
            clearInterval(intervalId);
        };
    }, [handleAutoRefresh]);
    
    // Check for new high-severity incidents
    useEffect(() => {
        if (prevIncidents && prevIncidents.length > 0) {
            const prevUuids = new Set(prevIncidents.map(i => i.uuid));
            const newIncidents = allIncidents.filter(i => !prevUuids.has(i.uuid));
            
            newIncidents.forEach(incident => {
                if (incident.severity_flag === 'CRITICAL' || incident.severity_flag === 'HIGH') {
                    addNotification(`New ${incident.severity_flag} alert: ${incident.event_type} on ${incident.route}`, incident.severity_flag);
                }
            });
        }
    }, [allIncidents, prevIncidents, addNotification]);

    // Filter logic
    const filteredIncidents = useMemo(() => {
        return allIncidents.filter(incident => {
            const queryLower = filters.query.toLowerCase();
            const searchContent = `${incident.route} ${incident.county} ${incident.event_type} ${incident.description}`.toLowerCase();
            
            const matchesQuery = queryLower ? searchContent.includes(queryLower) : true;
            const matchesState = filters.state ? incident.state === filters.state : true;
            const matchesSeverity = filters.severity ? incident.severity_flag === filters.severity : true;
            const matchesRoute = filters.route ? incident.route === filters.route : true;
            const matchesCategory = filters.category ? incident.category === filters.category : true;
            const matchesStatus = filters.status ? (filters.status === 'ACTIVE' ? incident.is_active : !incident.is_active) : true;
            
            let matchesDate = true;
            if (filters.startDate || filters.endDate) {
                const incidentDate = new Date(incident.updated_time);
                // Set time to 0 to compare dates only
                const startDate = filters.startDate ? new Date(filters.startDate) : null;
                if(startDate) startDate.setUTCHours(0,0,0,0);

                const endDate = filters.endDate ? new Date(filters.endDate) : null;
                if(endDate) endDate.setUTCHours(23,59,59,999);

                if (startDate && incidentDate < startDate) matchesDate = false;
                if (endDate && incidentDate > endDate) matchesDate = false;
            }

            return matchesQuery && matchesState && matchesSeverity && matchesRoute && matchesCategory && matchesStatus && matchesDate;
        }).sort((a, b) => new Date(b.updated_time).getTime() - new Date(a.updated_time).getTime());
    }, [allIncidents, filters]);
    
    // Stats for filter controls
    const incidentStats = useMemo(() => {
        const stats = {
            total: allIncidents.length,
            states: new Set<string>(),
            severities: new Set<string>(),
            routes: new Set<string>(),
            counts: {
                states: {} as Record<string, number>,
                severities: {} as Record<string, number>,
                categories: {} as Record<string, number>,
                status: {} as Record<string, number>,
            },
        };

        allIncidents.forEach(incident => {
            if (incident.state) {
                stats.states.add(incident.state);
                stats.counts.states[incident.state] = (stats.counts.states[incident.state] || 0) + 1;
            }
            if (incident.severity_flag) {
                stats.severities.add(incident.severity_flag);
                stats.counts.severities[incident.severity_flag] = (stats.counts.severities[incident.severity_flag] || 0) + 1;
            }
            if (incident.route) {
                stats.routes.add(incident.route);
            }
            if (incident.category) {
                stats.counts.categories[incident.category] = (stats.counts.categories[incident.category] || 0) + 1;
            }
            const statusKey = incident.is_active ? 'ACTIVE' : 'CLEARED';
            stats.counts.status[statusKey] = (stats.counts.status[statusKey] || 0) + 1;
        });

        return { ...stats, states: Array.from(stats.states), severities: Array.from(stats.severities), routes: Array.from(stats.routes) };
    }, [allIncidents]);

    const handleSelectIncident = useCallback((incident: Incident) => {
        setSelectedIncident(incident);
        // Add to history, avoiding duplicates and limiting size
        setViewHistory(prev => {
            const newHistory = [incident, ...prev.filter(i => i.uuid !== incident.uuid)];
            return newHistory.slice(0, VIEW_HISTORY_LIMIT);
        });
    }, []);

    // Fetch AI summary when selected incident changes
    useEffect(() => {
        if (!selectedIncident) {
            setSummary(null);
            return;
        }

        const fetchSummary = async () => {
            setIsSummaryLoading(true);
            setSummary(null);
            try {
                logger.log(`Generating AI summary for incident: ${selectedIncident.uuid}`);
                // Find nearby and historical incidents for context
                const nearbyIncidents = allIncidents.filter(i => 
                    i.uuid !== selectedIncident.uuid && 
                    i.is_active && 
                    i.latitude && i.longitude && selectedIncident.latitude && selectedIncident.longitude &&
                    calculateDistance(selectedIncident.latitude, selectedIncident.longitude, i.latitude, i.longitude) <= 5
                );

                const historicalIncidents = allIncidents.filter(i => 
                    !i.is_active &&
                    i.route === selectedIncident.route &&
                    i.latitude && i.longitude && selectedIncident.latitude && selectedIncident.longitude &&
                    calculateDistance(selectedIncident.latitude, selectedIncident.longitude, i.latitude, i.longitude) <= 2
                );

                const aiSummary = await summarizeIncident(selectedIncident, null, nearbyIncidents, historicalIncidents);
                setSummary(aiSummary);
                logger.log(`AI summary generated successfully for incident: ${selectedIncident.uuid}`);
            } catch (err: any) {
                console.error("Failed to get AI summary:", err);
                logger.log(`Failed to generate AI summary for incident ${selectedIncident.uuid}: ${err.message}`);
                setSummary({
                    summary: 'Could not generate AI summary due to an error.',
                    confidence: 'LOW',
                    reasoning: err.message || 'Unknown error',
                });
            } finally {
                setIsSummaryLoading(false);
            }
        };

        fetchSummary();
    }, [selectedIncident, allIncidents]);


    // Handlers
    const handleFilterChange = (name: keyof Filters, value: string | boolean) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };
    
    const handleToggleLocation = () => {
        if (isTracking) {
            stopTracking();
        } else {
            requestLocation();
        }
    };

    const handleFeedbackSubmit = (feedback: string) => {
        logger.log(`Feedback submitted: ${feedback}`);
        addNotification('Thank you for your feedback!', 'SUCCESS');
        setFeedbackModalOpen(false);
    };

    const handleDownloadData = () => {
        const dataStr = JSON.stringify(filteredIncidents, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'incidents.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-100 font-sans">
            <Header 
                onRefresh={handleRefresh}
                isLoading={isLoading}
                onToggleLocation={handleToggleLocation}
                isTracking={isTracking}
                onFeedbackClick={() => setFeedbackModalOpen(true)}
                onSync={handleSync}
                isSyncing={isSyncing}
                onLogViewerClick={() => setLogViewerOpen(true)}
            />
            
            <NotificationContainer 
                notifications={notifications}
                onDismiss={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
            />

            <main className="flex flex-grow min-h-0">
                <aside className="w-full max-w-sm bg-white flex flex-col border-r border-slate-200 shadow-lg z-10">
                    <FilterControls
                        filters={filters}
                        onFilterChange={handleFilterChange}
                        incidentStats={incidentStats}
                        onDownloadData={handleDownloadData}
                    />
                    {error && <div className="p-4"><ErrorMessage message={error} /></div>}
                    <IncidentList
                        incidents={filteredIncidents}
                        selectedIncidentUuid={selectedIncident?.uuid || null}
                        onSelectIncident={handleSelectIncident}
                        isLoading={isLoading}
                        userLocation={location}
                        lastUpdated={lastUpdated}
                    />
                    <HistoryList
                        incidents={viewHistory}
                        onSelectIncident={handleSelectIncident}
                    />
                </aside>
                <section className="flex-grow relative">
                    {permissionStatus === 'prompt' && !isTracking && <LocationPermissionBanner onRequest={requestLocation} />}
                    <IncidentMap 
                        incidents={filteredIncidents}
                        selectedIncident={selectedIncident}
                        onSelectIncident={handleSelectIncident}
                        userLocation={location}
                    />
                    {selectedIncident && (
                        <IncidentDetail
                            incident={selectedIncident}
                            summary={summary}
                            isSummaryLoading={isSummaryLoading}
                            onClose={() => setSelectedIncident(null)}
                        />
                    )}
                </section>
            </main>
            
            <FeedbackModal 
                isOpen={isFeedbackModalOpen}
                onClose={() => setFeedbackModalOpen(false)}
                onSubmit={handleFeedbackSubmit}
            />

            <LogViewerModal
                isOpen={isLogViewerOpen}
                onClose={() => setLogViewerOpen(false)}
            />
        </div>
    );
}

export default App;