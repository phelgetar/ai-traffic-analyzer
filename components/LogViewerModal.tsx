import React, { useState, useEffect } from 'react';
import logger from '../utils/logger';
import { DocumentTextIcon, XMarkIcon } from './Icons';

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LogViewerModal: React.FC<LogViewerModalProps> = ({ isOpen, onClose }) => {
  const [logContent, setLogContent] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLogContent(logger.getLog());
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleClearLog = () => {
    logger.clearLog();
    setLogContent(logger.getLog());
  };

  const handleDownloadLog = () => {
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 19).replace('T', '_').replace(/:/g, '-');
    link.download = `app_log_${timestamp}.txt`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-5xl h-5/6 mx-4 transform transition-all flex flex-col">
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center">
            <DocumentTextIcon className="w-6 h-6 mr-2 text-brand-primary" />
            Client-Side Application Log
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="bg-slate-900 text-white font-mono text-xs p-4 rounded-md flex-grow overflow-auto">
          {/* FIX: Correctly applied wrapping classes to ensure long lines are readable */}
          <pre className="whitespace-pre-wrap break-words">{logContent}</pre>
        </div>
        <div className="flex justify-end mt-4 flex-shrink-0">
          <button
            onClick={handleClearLog}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 mr-2"
          >
            Clear Log
          </button>
          <button
            onClick={handleDownloadLog}
            className="px-6 py-2 text-sm font-medium text-white bg-brand-primary rounded-md hover:bg-brand-dark"
          >
            Download Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogViewerModal;