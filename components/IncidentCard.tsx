import React from 'react';
import { Incident } from '../types';
import { getTimeAgo, formatRemainingTime } from '../utils/time';
import { AlertTriangleIcon, ClockIcon, CrosshairIcon, TrafficConeIcon, CarCrashIcon, CarIcon, InfoIcon } from './Icons';
import { UserLocation } from '../hooks/useLocation';
import { calculateDistance } from '../utils/location';

interface IncidentCardProps {
  incident: Incident;
  isSelected: boolean;
  onClick: () => void;
  userLocation: UserLocation | null;
}

const severityStyles: { [key: string]: { icon: React.ReactNode; text: string; bg: string; } } = {
  CRITICAL: { icon: <AlertTriangleIcon className="w-5 h-5" />, text: 'text-red-800', bg: 'bg-red-100' },
  HIGH: { icon: <AlertTriangleIcon className="w-5 h-5" />, text: 'text-orange-800', bg: 'bg-orange-100' },
  MEDIUM: { icon: <TrafficConeIcon className="w-5 h-5" />, text: 'text-yellow-800', bg: 'bg-yellow-100' },
  LOW: { icon: <TrafficConeIcon className="w-5 h-5" />, text: 'text-blue-800', bg: 'bg-blue-100' },
};

const severityBorderStyles: { [key: string]: string } = {
  CRITICAL: 'border-red-500',
  HIGH: 'border-orange-500',
  MEDIUM: 'border-yellow-500',
  LOW: 'border-blue-500',
};

// A predefined, curated palette of Tailwind CSS classes for state tags.
const stateColorPalette = [
    'bg-sky-100 text-sky-800', 'bg-emerald-100 text-emerald-800', 'bg-amber-100 text-amber-800',
    'bg-indigo-100 text-indigo-800', 'bg-rose-100 text-rose-800', 'bg-teal-100 text-teal-800',
    'bg-fuchsia-100 text-fuchsia-800', 'bg-lime-100 text-lime-800', 'bg-cyan-100 text-cyan-800',
];

/**
 * Generates a consistent background and text color class for a state tag
 * by hashing the state's name to pick from a predefined color palette.
 * @param state - The 2-letter state abbreviation (e.g., "OH", "CA").
 * @returns A string of Tailwind CSS classes (e.g., "bg-sky-100 text-sky-800").
 */
const getStateTagStyle = (state: string | null): string => {
    if (!state) return 'bg-slate-100 text-slate-800'; // Default for unknown states
    
    // Simple hash function to get a deterministic index from the state string.
    let hash = 0;
    for (let i = 0; i < state.length; i++) {
        hash = state.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash % stateColorPalette.length);
    return stateColorPalette[index];
};


const getEventTypeIcon = (category: Incident['category'], eventType: string | null): React.ReactNode => {
    if (category === 'ROADWORK') {
        return <TrafficConeIcon className="w-5 h-5 text-slate-500" />;
    }

    const typeLower = eventType?.toLowerCase() || '';

    if (typeLower.includes('crash')) {
        return <CarCrashIcon className="w-5 h-5 text-slate-500" />;
    }
    if (typeLower.includes('stall') || typeLower.includes('vehicle')) {
        return <CarIcon className="w-5 h-5 text-slate-500" />;
    }
    
    return <InfoIcon className="w-5 h-5 text-slate-500" />;
};

const IncidentCard: React.FC<IncidentCardProps> = ({ incident, isSelected, onClick, userLocation }) => {
  const { icon, text, bg } = severityStyles[incident.severity_flag || 'LOW'] || severityStyles.LOW;
  const cardClasses = `
    block w-full text-left p-4 border-l-8 cursor-pointer transition-colors duration-200
    ${isSelected ? 'bg-brand-light border-brand-primary' : `bg-white hover:bg-slate-50 ${severityBorderStyles[incident.severity_flag || 'LOW']}`}
    border-b border-slate-200
  `;

  // The 'route' field is now the single source of truth for the primary name.
  const primaryRouteName = incident.route;
  const routeTitle = [primaryRouteName, incident.direction].filter(Boolean).join(' ');

  let cardTitle = routeTitle;
  // Append event_type only if it's not already in the title to avoid redundancy.
  if (incident.event_type && routeTitle && !routeTitle.toLowerCase().includes(incident.event_type.toLowerCase())) {
      cardTitle = `${routeTitle} - ${incident.event_type}`;
  }
  
  // The useLocation hook ensures `userLocation` is only present when tracking is active
  // and permission has been granted. This check is therefore sufficient.
  const distanceInMiles = userLocation && incident.latitude && incident.longitude
    ? calculateDistance(userLocation.latitude, userLocation.longitude, incident.latitude, incident.longitude)
    : null;

  const eventIcon = getEventTypeIcon(incident.category, incident.event_type);

  const remainingTime = incident.is_active && incident.cleared_time ? formatRemainingTime(incident.cleared_time) : null;

  return (
    <button onClick={onClick} className={cardClasses}>
      <div className="flex justify-between items-start gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
            {icon}
            <span className="ml-1.5">{incident.severity_flag}</span>
        </span>
        <div className="flex items-center gap-2">
            {incident.state && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStateTagStyle(incident.state)}`}>
                    {incident.state}
                </span>
            )}
            <span className={`text-xs font-semibold ${incident.is_active ? 'text-status-red' : 'text-status-green'}`}>
              {incident.is_active ? 'ACTIVE' : 'CLEARED'}
            </span>
        </div>
      </div>
      
      <div className="flex items-center mt-2 gap-2">
        <div className="flex-shrink-0 w-5 h-5">
            {eventIcon}
        </div>
        <h3 className="font-semibold text-slate-800 truncate">
            {cardTitle}
        </h3>
      </div>
      
      {incident.county && (
        <p className="text-sm text-slate-600 truncate ml-7">{incident.county} County</p>
      )}
      <div className="flex justify-between items-center text-xs text-slate-500 mt-2">
        <span>{getTimeAgo(incident.updated_time)}</span>
        <div className="flex items-center gap-3">
          {remainingTime && (
            <span className="flex items-center font-medium text-amber-700" title="Estimated clearance time">
                <ClockIcon className="w-3 h-3 mr-1" />
                {remainingTime}
            </span>
          )}
          {distanceInMiles !== null && (
            <span className="flex items-center" title="Distance from your location">
              <CrosshairIcon className="w-3 h-3 mr-1" />
              ~{distanceInMiles.toFixed(1)} mi
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default IncidentCard;