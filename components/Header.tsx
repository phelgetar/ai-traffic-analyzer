import React from 'react';
import { RoadIcon, RefreshIcon, CrosshairIcon, ChatBubbleIcon, DownloadIcon, DocumentTextIcon } from './Icons';

interface HeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  onToggleLocation: () => void;
  isTracking: boolean;
  onFeedbackClick: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onLogViewerClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onRefresh, isLoading, onToggleLocation, isTracking, onFeedbackClick, onSync, isSyncing, onLogViewerClick }) => {
  return (
    <header className="bg-brand-primary text-white shadow-md p-4 flex justify-between items-center z-20">
      <div className="flex items-center">
        <RoadIcon className="w-8 h-8 mr-3" />
        <div className="flex items-baseline">
          <h1 className="text-2xl font-bold tracking-tight">Real-Time Traffic Incident Monitor</h1>
          <span className="ml-2 text-xs font-mono text-brand-light opacity-75">v0.0.1</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={onLogViewerClick}
          className="flex items-center justify-center p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="View client-side log"
          title="View client-side log"
        >
          <DocumentTextIcon className="w-6 h-6" />
        </button>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center justify-center p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sync with external APIs"
          title="Sync with external APIs"
        >
          <DownloadIcon className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
        <button
          onClick={onFeedbackClick}
          className="flex items-center justify-center p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label="Provide feedback"
        >
          <ChatBubbleIcon className="w-6 h-6 text-white" />
        </button>
        <button
          onClick={onToggleLocation}
          className="flex items-center justify-center p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={isTracking ? "Disable location tracking" : "Enable location tracking"}
        >
          <CrosshairIcon className={`w-6 h-6 ${isTracking ? 'text-status-green animate-pulse-fast' : 'text-white'}`} />
        </button>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center justify-center p-2 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 transition-colors focus:outline-none focus:ring-2 focus:ring-white disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh incidents from local database"
          title="Refresh incidents from local database"
        >
          <RefreshIcon className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </header>
  );
};

export default Header;