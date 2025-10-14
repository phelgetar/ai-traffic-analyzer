import React from 'react';
import { DownloadIcon, XCircleIcon } from './Icons';
import CustomDropdown from './CustomDropdown';

export interface Filters {
  query: string;
  state: string;
  severity: string;
  route: string;
  category: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface IncidentStats {
    total: number;
    states: string[];
    severities: string[];
    routes: string[];
    counts: {
        states: { [key: string]: number };
        severities: { [key: string]: number };
        categories: { [key: string]: number };
        status: { [key: string]: number };
    };
}

interface FilterControlsProps {
  filters: Filters;
  onFilterChange: (name: keyof Filters, value: string | boolean) => void;
  incidentStats: IncidentStats;
  onDownloadData: () => void;
}

const FilterButton: React.FC<{
    label: string;
    value: string;
    filterKey: keyof Filters;
    currentValue: string;
    onClick: (name: keyof Filters, value: string) => void;
}> = ({ label, value, filterKey, currentValue, onClick }) => {
    const isActive = currentValue === value;
    return (
        <button
            onClick={() => onClick(filterKey, value)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                isActive ? 'bg-brand-primary text-white shadow' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
        >
            {label}
        </button>
    );
};

const ActiveFilterTag: React.FC<{
    filterKey: keyof Filters;
    value: string;
    onClear: (name: keyof Filters) => void;
}> = ({ filterKey, value, onClear }) => {
    const label = filterKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    return (
        <span className="inline-flex items-center pl-3 pr-2 py-1 text-sm font-medium bg-brand-primary text-white rounded-full">
            {label}: {value}
            <button onClick={() => onClear(filterKey)} className="ml-1.5 flex-shrink-0">
                <XCircleIcon className="w-4 h-4 text-brand-light hover:text-white" />
            </button>
        </span>
    )
};

const FilterControls: React.FC<FilterControlsProps> = ({ filters, onFilterChange, incidentStats, onDownloadData }) => {
  const { counts } = incidentStats;

  const createStateOptions = (): string[] => {
    const options = new Set<string>(incidentStats.states);
    if (filters.state) options.add(filters.state);
    return Array.from(options).sort();
  };
  
  const createSeverityOptions = (): string[] => {
    const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const options = new Set<string>(incidentStats.severities);
    if (filters.severity) options.add(filters.severity);
    return Array.from(options).sort((a, b) => severityOrder.indexOf(a) - severityOrder.indexOf(b));
  };
  
  const createRouteOptions = (): string[] => {
    const options = new Set<string>(incidentStats.routes);
    if (filters.route) options.add(filters.route);
    return Array.from(options).sort();
  };

  const stateOptions = createStateOptions();
  const severityOptions = createSeverityOptions();
  const routeOptions = createRouteOptions();

  const activeFilters = Object.entries(filters).filter(([key, value]) => value && key !== 'query' && key !== 'status' && key !== 'category');

  const clearAllFilters = () => {
    (Object.keys(filters) as Array<keyof Filters>).forEach(key => {
        if(key !== 'query' && key !== 'status' && key !== 'category') {
            onFilterChange(key, '');
        }
    })
  };

  return (
    <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 shadow-sm space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          name="query"
          value={filters.query}
          onChange={(e) => onFilterChange('query', e.target.value)}
          placeholder={`Search ${incidentStats.total} incidents (e.g., "I-75", "Franklin", "Crash")...`}
          className="w-full px-4 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary"
        />
        <button
          onClick={onDownloadData}
          className="p-2 border border-slate-300 rounded-md bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-primary flex-shrink-0"
          title="Download filtered incidents as JSON"
          aria-label="Download filtered incidents as JSON"
        >
          <DownloadIcon className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* FIX: Replaced the 2-column grid with a flex-col layout to stack filter groups vertically, preventing overlap. */}
      <div className="space-y-4">
        <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Event Type</label>
            {/* FIX: Added flex-wrap and gap-y-2 to allow buttons to wrap gracefully on smaller screens. */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <FilterButton label="All" value="" filterKey="category" currentValue={filters.category} onClick={onFilterChange} />
                <FilterButton label={`Incidents (${counts.categories.INCIDENT || 0})`} value="INCIDENT" filterKey="category" currentValue={filters.category} onClick={onFilterChange} />
                <FilterButton label={`Roadwork (${counts.categories.ROADWORK || 0})`} value="ROADWORK" filterKey="category" currentValue={filters.category} onClick={onFilterChange} />
            </div>
        </div>
        <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase">Status</label>
            {/* FIX: Added flex-wrap and gap-y-2 to allow buttons to wrap gracefully on smaller screens. */}
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                <FilterButton label={`Active (${counts.status.ACTIVE || 0})`} value="ACTIVE" filterKey="status" currentValue={filters.status} onClick={onFilterChange} />
                <FilterButton label={`Cleared (${counts.status.CLEARED || 0})`} value="CLEARED" filterKey="status" currentValue={filters.status} onClick={onFilterChange} />
                <FilterButton label="All" value="" filterKey="status" currentValue={filters.status} onClick={onFilterChange} />
            </div>
        </div>
       </div>

      {activeFilters.length > 0 && (
        <div className="space-y-2 p-2 bg-slate-50 rounded-md">
            <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-slate-500 uppercase">Active Filters</label>
                <button onClick={clearAllFilters} className="text-xs font-semibold text-brand-primary hover:underline">
                    Clear All
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {activeFilters.map(([key, value]) => (
                    <ActiveFilterTag 
                        key={key}
                        filterKey={key as keyof Filters}
                        value={String(value)}
                        onClear={(name) => onFilterChange(name, '')}
                    />
                ))}
            </div>
        </div>
      )}
      
      {/* This layout remains the same as it was already well-structured. */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="state" className="block text-sm font-medium text-slate-700 mb-1">State</label>
          <select
            id="state"
            name="state"
            value={filters.state}
            onChange={(e) => onFilterChange('state', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value="">All States ({incidentStats.total})</option>
            {stateOptions.map(s => (
              <option key={s} value={s}>{s} ({counts.states[s] || 0})</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="severity" className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
          <select
            id="severity"
            name="severity"
            value={filters.severity}
            onChange={(e) => onFilterChange('severity', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          >
            <option value="">All Severities</option>
            {severityOptions.map(s => (
              <option key={s} value={s}>{s} ({counts.severities[s] || 0})</option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
            <CustomDropdown
                label="Route Name"
                options={routeOptions}
                value={filters.route}
                onChange={(value) => onFilterChange('route', value)}
                placeholder="All Routes"
            />
        </div>
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          />
        </div>
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-primary bg-white"
          />
        </div>
      </div>
    </div>
  );
};

export default FilterControls;