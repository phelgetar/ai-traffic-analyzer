import { useState, useEffect, useCallback, useRef } from 'react';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

type PermissionStatus = 'prompt' | 'granted' | 'denied';

const TRACKING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const useLocation = () => {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>('prompt');
  const [isTracking, setIsTracking] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    setLocation(null); // Reset location to stop showing distances
  }, []);

  const fetchCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      setPermissionStatus('denied');
      setIsTracking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => { // Success
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setPermissionStatus('granted');
        setError(null);
      },
      (error) => { // Error
        setError(`Error getting location: ${error.message}`);
        if (error.code === error.PERMISSION_DENIED) {
          setPermissionStatus('denied');
          stopTracking(); // Ensure we stop trying if permission is revoked/denied
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [stopTracking]);

  const requestLocation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsTracking(true);
    fetchCurrentLocation();
    intervalRef.current = window.setInterval(fetchCurrentLocation, TRACKING_INTERVAL_MS);
  }, [fetchCurrentLocation]);
  
  // Check initial permission status without prompting or auto-starting
  useEffect(() => {
    if (navigator.permissions) {
        navigator.permissions.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'granted') {
                setPermissionStatus('granted');
            } else if (result.state === 'denied') {
                setPermissionStatus('denied');
            } else {
                setPermissionStatus('prompt');
            }
        });
    }
  }, []);

  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return { location, error, permissionStatus, isTracking, requestLocation, stopTracking };
};