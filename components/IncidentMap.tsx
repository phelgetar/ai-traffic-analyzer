import React, { useEffect, useRef } from 'react';
import { Incident } from '../types';
import { UserLocation } from '../hooks/useLocation';
import { getIconForIncident, userLocationIcon } from '../utils/mapIcons';

// Since we are not using a bundler, we must declare the 'L' variable from the Leaflet CDN.
declare const L: any;

interface IncidentMapProps {
  incidents: Incident[];
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident) => void;
  userLocation: UserLocation | null;
}

const legendItems = [
  { severity: 'CRITICAL', color: '#dc2626', label: 'Critical' },
  { severity: 'HIGH', color: '#f97316', label: 'High' },
  { severity: 'MEDIUM', color: '#facc15', label: 'Medium' },
  { severity: 'LOW', color: '#3b82f6', label: 'Low' },
  { severity: 'ROADWORK', color: '#64748b', label: 'Roadwork' },
];

const MapLegend: React.FC = () => (
  <div className="absolute bottom-20 right-4 bg-white/80 backdrop-blur-sm p-3 rounded-lg shadow-md z-[1000] border border-slate-200">
    <h4 className="font-bold text-sm mb-2 text-slate-700">Severity Legend</h4>
    <ul>
      {legendItems.map(item => (
        <li key={item.severity} className="flex items-center mb-1 last:mb-0">
          <span className="w-4 h-4 rounded-full mr-2 shadow-sm" style={{ backgroundColor: item.color }}></span>
          <span className="text-xs text-slate-600">{item.label}</span>
        </li>
      ))}
    </ul>
  </div>
);


const IncidentMap: React.FC<IncidentMapProps> = ({ incidents, selectedIncident, onSelectIncident, userLocation }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null); // To hold the Leaflet map instance
  const clustererRef = useRef<any>(null); // To hold the marker cluster group instance
  const userMarkerRef = useRef<any>(null);

  // 1. Initialize the map and marker cluster group once on component mount
  useEffect(() => {
    if (mapContainerRef.current && !mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [39.9612, -82.9988], // Default to Columbus, OH
        zoom: 7,
        zoomControl: false,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);

      mapInstanceRef.current = map;
      
      const clusterer = L.markerClusterGroup({
        maxClusterRadius: 60,
        iconCreateFunction: (cluster: any) => {
          const markers = cluster.getAllChildMarkers();
          const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
          let highestSeverityIndex = -1;
          let hasRoadwork = false;

          markers.forEach((marker: any) => {
            if (marker.options.isRoadwork) {
              hasRoadwork = true;
            } else {
              const index = severityOrder.indexOf(marker.options.severity);
              if (index > highestSeverityIndex) {
                highestSeverityIndex = index;
              }
            }
          });
          
          let severityClass = 'low'; // Default
          if(highestSeverityIndex === -1 && hasRoadwork) {
            severityClass = 'roadwork';
          } else if (highestSeverityIndex !== -1) {
            severityClass = severityOrder[highestSeverityIndex].toLowerCase();
          }

          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div><span>${count}</span></div>`,
            className: `marker-cluster marker-cluster-${severityClass}`,
            iconSize: L.point(40, 40)
          });
        }
      });
      clustererRef.current = clusterer;
      map.addLayer(clusterer);
    }
  }, []);

  // 2. Update markers whenever the filtered incidents change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const clusterer = clustererRef.current;
    if (!map || !clusterer) return;

    clusterer.clearLayers();

    const incidentsWithCoords = incidents.filter(i => i.latitude != null && i.longitude != null);
    
    const newMarkers = incidentsWithCoords.map(incident => {
      const icon = getIconForIncident(incident);
      const marker = L.marker([incident.latitude!, incident.longitude!], { 
        icon,
        severity: incident.severity_flag,
        isRoadwork: incident.category === 'ROADWORK'
      });
      
      marker.on('click', () => {
        onSelectIncident(incident);
      });
      
      return marker;
    });
    
    clusterer.addLayers(newMarkers);

    if (!selectedIncident && incidentsWithCoords.length > 0) {
      const bounds = clusterer.getBounds();
      if(bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }

  }, [incidents, onSelectIncident, selectedIncident]);


  // 3. Pan the map to the selected incident
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && selectedIncident && selectedIncident.latitude && selectedIncident.longitude) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 14, { animate: true });
    }
  }, [selectedIncident]);

  // 4. Update user's location marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    
    if (userLocation) {
        if (!userMarkerRef.current) {
            userMarkerRef.current = L.marker([userLocation.latitude, userLocation.longitude], {
                icon: userLocationIcon,
                zIndexOffset: 1000 // Ensure it's on top
            }).addTo(map);
        } else {
            userMarkerRef.current.setLatLng([userLocation.latitude, userLocation.longitude]);
        }
    } else {
        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }
    }
  }, [userLocation]);


  return (
    <div className="relative h-full w-full">
        <div ref={mapContainerRef} className="h-full w-full z-0" />
        <MapLegend />
    </div>
  );
};

export default IncidentMap;