import { Incident } from '../types';

// Since we are not using a bundler, we must declare the 'L' variable from the Leaflet CDN.
declare const L: any;

const createMarkerSvg = (color: string) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-6 h-6">
    <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 005.16-4.242 12.082 12.082 0 00-11.482 0 16.975 16.975 0 005.16 4.242zM12 10.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clip-rule="evenodd" />
  </svg>
`;

const createDivIcon = (svg: string) => L.divIcon({
  html: svg,
  className: 'dummy', // Leaflet requires a className
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

const criticalIcon = createDivIcon(createMarkerSvg('#dc2626')); // status-red
const highIcon = createDivIcon(createMarkerSvg('#f97316')); // orange-500
const mediumIcon = createDivIcon(createMarkerSvg('#facc15')); // status-yellow
const lowIcon = createDivIcon(createMarkerSvg('#3b82f6')); // brand-secondary
const roadworkIcon = createDivIcon(createMarkerSvg('#64748b')); // slate-500

export const userLocationIcon = L.divIcon({
    html: `
        <div class="relative flex h-6 w-6">
            <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></div>
            <div class="relative inline-flex rounded-full h-6 w-6 bg-sky-500 border-2 border-white"></div>
        </div>
    `,
    className: 'dummy',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
});


export const getIconForIncident = (incident: Incident) => {
    if (incident.category === 'ROADWORK') {
        return roadworkIcon;
    }
    switch (incident.severity_flag) {
        case 'CRITICAL': return criticalIcon;
        case 'HIGH': return highIcon;
        case 'MEDIUM': return mediumIcon;
        case 'LOW': return lowIcon;
        default: return lowIcon;
    }
};