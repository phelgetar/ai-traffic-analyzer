import React from 'react';
import { Incident } from '../types';
import IncidentCard from './IncidentCard';
import Spinner from './Spinner';
import { UserLocation } from '../hooks/useLocation';
import { getTimeAgo } from '../utils/time';

interface IncidentListProps {
  incidents: Incident[];
  selectedIncidentUuid: string | null;
  onSelectIncident: (incident: Incident) => void;
  isLoading: boolean;
  userLocation: UserLocation | null;
  lastUpdated: Date | null;
}

const IncidentList: React.FC<IncidentListProps> = ({ incidents, selectedIncidentUuid, onSelectIncident, isLoading, userLocation, lastUpdated }) => {
  return (
    <div className="flex flex-col flex-grow min-h-0">
      <div className="p-4 bg-slate-50 border-b border-t border-slate-200 flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold text-slate-700">Latest Incidents ({incidents.length})</h2>
        {lastUpdated && !isLoading && (
          <span className="text-xs text-slate-500">
            Updated {getTimeAgo(lastUpdated.toISOString())}
          </span>
        )}
      </div>
      <div className="flex-grow overflow-y-auto">
        {isLoading && incidents.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <Spinner />
          </div>
        ) : (
          incidents.length > 0 ? (
            <ul>
              {incidents.map((incident) => (
                <li key={incident.uuid}>
                  <IncidentCard
                    incident={incident}
                    isSelected={incident.uuid === selectedIncidentUuid}
                    onClick={() => onSelectIncident(incident)}
                    userLocation={userLocation}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-4 text-center text-slate-500">No incidents found for this filter.</p>
          )
        )}
      </div>
    </div>
  );
};

export default IncidentList;