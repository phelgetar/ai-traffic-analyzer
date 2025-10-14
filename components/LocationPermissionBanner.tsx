import React from 'react';
import { CrosshairIcon } from './Icons';

interface LocationPermissionBannerProps {
  onRequest: () => void;
}

const LocationPermissionBanner: React.FC<LocationPermissionBannerProps> = ({ onRequest }) => {
  return (
    <div className="bg-brand-light border-b-2 border-brand-secondary p-4">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <CrosshairIcon className="w-6 h-6 text-brand-primary" />
        </div>
        <div className="ml-3 flex-1 md:flex md:justify-between">
          <p className="text-sm text-brand-dark">
            Enable location services to see the distance to each incident from your position.
          </p>
          <p className="mt-3 text-sm md:mt-0 md:ml-6">
            <button
              onClick={onRequest}
              className="whitespace-nowrap font-medium text-brand-primary hover:text-brand-dark"
            >
              Enable Location &rarr;
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationPermissionBanner;