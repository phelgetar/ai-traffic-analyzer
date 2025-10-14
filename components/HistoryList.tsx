import React from 'react';
import { Incident } from '../types';
import { getTimeAgo } from '../utils/time';

interface HistoryListProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ incidents, onSelectIncident }) => {
  if (incidents.length === 0) {
    return null; // Don't render anything if there's no history
  }

  return (
    <div className="border-t border-slate-200">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-700">Recently Viewed</h3>
      </div>
      <ul className="max-h-40 overflow-y-auto">
        {incidents.map(incident => (
          <li key={incident.uuid}>
            <button
              onClick={() => onSelectIncident(incident)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 focus:outline-none focus:bg-brand-light border-b border-slate-200 transition-colors"
            >
              <p className="font-medium truncate">{incident.route} - {incident.event_type}</p>
              <p className="text-xs text-slate-500">{incident.county}, {incident.state} &middot; {getTimeAgo(incident.updated_time)}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HistoryList;