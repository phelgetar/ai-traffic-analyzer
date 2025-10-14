import React, { useEffect } from 'react';
import { Notification } from '../App';
import { Incident } from '../types';
import { AlertTriangleIcon, InfoIcon, CheckCircleIcon } from './Icons';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: number) => void;
}

const severityStyles: { [key: string]: { icon: React.ReactNode; border: string; title: string;} } = {
  CRITICAL: { icon: <AlertTriangleIcon className="w-6 h-6 text-red-500" />, border: 'border-red-500', title: 'New Critical Alert' },
  HIGH: { icon: <AlertTriangleIcon className="w-6 h-6 text-orange-500" />, border: 'border-orange-500', title: 'New High-Severity Alert' },
  MEDIUM: { icon: <InfoIcon className="w-6 h-6 text-blue-500" />, border: 'border-blue-500', title: 'System Update' },
  SUCCESS: { icon: <CheckCircleIcon className="w-6 h-6 text-green-500" />, border: 'border-green-500', title: 'Success' },
  ERROR: { icon: <AlertTriangleIcon className="w-6 h-6 text-red-500" />, border: 'border-red-500', title: 'Error' },
};

const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, 8000); // Auto-dismiss after 8 seconds

    return () => {
      clearTimeout(timer);
    };
  }, [notification.id, onDismiss]);

  const { icon, border, title } = severityStyles[notification.type] || severityStyles.HIGH;

  return (
    <div
      className={`max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden border-l-4 ${border}`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {icon}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={() => onDismiss(notification.id)}
              className="bg-white rounded-md inline-flex text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: number) => void;
}

const NotificationContainer: React.FC<NotificationContainerProps> = ({ notifications, onDismiss }) => {
  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-50"
    >
      <div className="w-full flex flex-col items-center space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};

export default NotificationContainer;