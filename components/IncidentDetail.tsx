import React from 'react';
import { Incident, AISummary } from '../types';
import { formatDateTime } from '../utils/time';
import Spinner from './Spinner';
import { AlertTriangleIcon, ClockIcon, MapPinIcon, TrafficConeIcon, XMarkIcon, CarCrashIcon, CarIcon, InfoIcon } from './Icons';

interface IncidentDetailProps {
  incident: Incident;
  summary: AISummary | null;
  isSummaryLoading: boolean;
  onClose: () => void;
}

const severityStyles: { [key: string]: { text: string; bg: string; border: string; icon: React.ReactNode } } = {
  CRITICAL: { text: 'text-red-800', bg: 'bg-red-50', border: 'border-red-500', icon: <AlertTriangleIcon className="w-5 h-5 mr-2" /> },
  HIGH: { text: 'text-orange-800', bg: 'bg-orange-50', border: 'border-orange-500', icon: <AlertTriangleIcon className="w-5 h-5 mr-2" /> },
  MEDIUM: { text: 'text-yellow-800', bg: 'bg-yellow-50', border: 'border-yellow-500', icon: <TrafficConeIcon className="w-5 h-5 mr-2" /> },
  LOW: { text: 'text-blue-800', bg: 'bg-blue-50', border: 'border-blue-500', icon: <TrafficConeIcon className="w-5 h-5 mr-2" /> },
};

const confidenceStyles: { [key: string]: { text: string; bg: string; } } = {
  HIGH: { text: 'text-green-800', bg: 'bg-green-100' },
  MEDIUM: { text: 'text-yellow-800', bg: 'bg-yellow-100' },
  LOW: { text: 'text-red-800', bg: 'bg-red-100' },
};

const DetailItem: React.FC<{ label: string; value: string | number | null | undefined, icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div>
    <dt className="text-sm font-medium text-slate-500 flex items-center">
      {icon}
      {label}
    </dt>
    <dd className="mt-1 text-md text-slate-900">{value || 'N/A'}</dd>
  </div>
);

const getCategoryIcon = (incident: Incident): React.ReactNode => {
    if (incident.category === 'ROADWORK') {
        return <TrafficConeIcon className="w-8 h-8 text-slate-600" />;
    }
    const typeLower = incident.event_type?.toLowerCase() || '';
    if (typeLower.includes('crash')) return <CarCrashIcon className="w-8 h-8 text-slate-600" />;
    if (typeLower.includes('stall') || typeLower.includes('vehicle')) return <CarIcon className="w-8 h-8 text-slate-600" />;
    return <InfoIcon className="w-8 h-8 text-slate-600" />;
};


const IncidentDetail: React.FC<IncidentDetailProps> = ({ incident, summary, isSummaryLoading, onClose }) => {
  const severity = incident.severity_flag || 'LOW';
  const styles = severityStyles[severity] || severityStyles.LOW;
  const statusClass = incident.is_active ? 'bg-status-red text-white' : 'bg-status-green text-white';

  const confidence = summary?.confidence || 'LOW';
  const confidenceStyle = confidenceStyles[confidence];

  const categoryIcon = getCategoryIcon(incident);

  return (
    <div className="absolute top-4 right-4 bottom-4 w-full max-w-md bg-white/80 backdrop-blur-sm rounded-lg shadow-2xl flex flex-col overflow-hidden transition-transform transform-gpu">
      <div className="flex-grow overflow-y-auto">
        <div className={`p-4 border-b border-slate-200 ${styles.bg} border-l-4 ${styles.border} relative`}>
          <button 
            onClick={onClose} 
            className="absolute top-2 right-2 p-1 rounded-full text-slate-500 hover:bg-slate-200"
            aria-label="Close details"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <div className="flex justify-between items-center">
              <div className={`flex items-center font-bold ${styles.text}`}>
                  {styles.icon}
                  <span className="text-lg">{incident.event_type} - {severity}</span>
              </div>
              <span className={`px-3 py-1 text-xs font-bold rounded-full ${statusClass}`}>
                  {incident.is_active ? 'ACTIVE' : 'CLEARED'}
              </span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-shrink-0">
                {categoryIcon}
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800">
                    {incident.route} {incident.direction}
                </h2>
                <p className="text-md text-slate-600">
                    {[incident.county, incident.state].filter(Boolean).join(', ')}
                </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center mb-4 gap-3">
              <h3 className="text-lg font-semibold text-slate-800">AI Summary</h3>
              {!isSummaryLoading && summary && (
                  <span 
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${confidenceStyle.bg} ${confidenceStyle.text}`}
                      title={`Reasoning: ${summary.reasoning}`}
                  >
                      Confidence: {summary.confidence}
                  </span>
              )}
          </div>
          <div className="bg-slate-50 p-4 rounded-lg text-slate-700 min-h-[100px] flex items-center justify-center">
            {isSummaryLoading ? <Spinner size="small" /> : <p className="text-sm">{summary?.summary || 'No summary available.'}</p>}
          </div>
        </div>
        
        <div className="border-t border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Generated Description</h3>
          <div className="bg-slate-50 p-4 rounded-lg text-slate-700">
              <p className="text-sm italic">{incident.description}</p>
          </div>
        </div>

        <div className="border-t border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Incident Details</h3>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-8">
              <DetailItem label="Lanes Affected" value={incident.lanes_affected} />
              <DetailItem label="Closure Status" value={incident.closure_status} />
              <DetailItem label="Units Involved" value={incident.units_involved} />
              <DetailItem label="Last Updated" value={formatDateTime(incident.updated_time)} icon={<ClockIcon className="w-4 h-4 mr-1.5" />} />
              <DetailItem label="Reported" value={formatDateTime(incident.reported_time)} icon={<ClockIcon className="w-4 h-4 mr-1.5" />} />
              <DetailItem label="Est. Clearance" value={formatDateTime(incident.cleared_time)} icon={<ClockIcon className="w-4 h-4 mr-1.5" />} />
              {incident.milepost ? <DetailItem label="Milepost" value={String(incident.milepost)} icon={<MapPinIcon className="w-4 h-4 mr-1.5" />} /> : null}
              {incident.latitude && incident.longitude ? (
                  <DetailItem 
                      label="Coordinates" 
                      value={`${incident.latitude.toFixed(4)}, ${incident.longitude.toFixed(4)}`} 
                      icon={<MapPinIcon className="w-4 h-4 mr-1.5" />} 
                  />
              ) : null}
              <DetailItem label="Data Source" value={incident.source_system} />
          </dl>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;