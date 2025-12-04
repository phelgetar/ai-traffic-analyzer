# CLAUDE.md - AI Assistant Guide for AI Traffic Incident Analyst

## Table of Contents
1. [Project Overview](#project-overview)
2. [Codebase Architecture](#codebase-architecture)
3. [Directory Structure](#directory-structure)
4. [Technology Stack](#technology-stack)
5. [Key Concepts & Patterns](#key-concepts--patterns)
6. [Component Guide](#component-guide)
7. [Service Layer](#service-layer)
8. [State Management](#state-management)
9. [Type System](#type-system)
10. [Development Workflows](#development-workflows)
11. [Common Tasks](#common-tasks)
12. [Conventions & Best Practices](#conventions--best-practices)
13. [Troubleshooting](#troubleshooting)
14. [Important Constraints](#important-constraints)

---

## Project Overview

The AI Traffic Incident Analyst is a real-time traffic monitoring dashboard that aggregates data from multiple sources (TomTom, OHGO, DriveTexas), enriches it with AI-powered summaries via Google Gemini, and presents it through an interactive map and list interface.

**Key Characteristics:**
- **Frontend-Heavy Architecture**: React/TypeScript SPA with PHP backend for API proxying
- **Real-Time Data**: Auto-refresh every 5 minutes, manual sync available
- **AI Integration**: Google Gemini generates contextual incident summaries
- **Multi-Source Data**: Nationwide TomTom + Ohio-specific OHGO + Texas DriveTexas
- **Client-Side Rich**: All filtering, sorting, and UI state managed in the browser
- **LocalStorage Persistence**: Filters, logs, and settings persist across sessions

---

## Codebase Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                       │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │   App.tsx   │──│  Components  │──│  Custom Hooks  │ │
│  │  (440 LOC)  │  │   (17 files) │  │   (2 files)    │ │
│  └──────┬──────┘  └──────────────┘  └────────────────┘ │
│         │                                                │
│  ┌──────┴──────────────────────────────────────────┐   │
│  │              Services Layer                      │   │
│  │  ┌─────────┐  ┌──────────────┐  ┌────────────┐ │   │
│  │  │ api.ts  │  │geminiService │  │importer.ts │ │   │
│  │  │         │  │              │  │  (sync)    │ │   │
│  │  └─────────┘  └──────────────┘  └────────────┘ │   │
│  └───────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    PHP Backend Layer                     │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────────┐ │
│  │get_incidents │  │ importer   │  │  API Proxies    │ │
│  │    .php      │  │   .php     │  │ (TomTom, OHGO,  │ │
│  │              │  │            │  │   DriveTexas)   │ │
│  └──────┬───────┘  └─────┬──────┘  └────────┬────────┘ │
└─────────┼────────────────┼──────────────────┼──────────┘
          │                │                  │
          ▼                ▼                  ▼
    ┌──────────┐    ┌──────────┐      ┌──────────────┐
    │  MySQL   │    │  MySQL   │      │External APIs │
    │ Database │    │ Database │      │(TomTom, etc.)│
    └──────────┘    └──────────┘      └──────────────┘
```

### Data Flow

```
1. Initial Load:
   User opens app → App.tsx → api.fetchLatestIncidents() → get_incidents.php → MySQL → Display

2. Manual Sync:
   User clicks sync → App.tsx → importer.syncWithExternalApis() →
   → Parallel fetch from 3 sources → Transform data → importer.php → MySQL →
   → Refresh from database → Display

3. AI Summary:
   User selects incident → App.tsx → geminiService.summarizeIncident() →
   → Google Gemini API → Display summary

4. Filtering:
   User changes filter → App.tsx state update → useMemo recomputes →
   → Filtered list re-renders → LocalStorage saves filters
```

---

## Directory Structure

```
/ai-traffic-analyzer/
├── index.html                 # Entry point with CDN imports (Tailwind, Leaflet)
├── index.tsx                  # React root renderer (StrictMode, React 19)
├── App.tsx                    # Main application container (440 lines)
├── types.ts                   # Core TypeScript type definitions
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite build configuration
├── .env.local                 # Environment variables (GEMINI_API_KEY)
├── .gitignore                 # Git ignore rules
│
├── /components/               # 17 React components
│   ├── Header.tsx             # Top navigation bar (refresh, sync, location, etc.)
│   ├── FilterControls.tsx     # Advanced filtering UI (240 LOC)
│   ├── IncidentList.tsx       # Scrollable incident list container
│   ├── IncidentCard.tsx       # Individual incident card (153 LOC)
│   ├── IncidentDetail.tsx     # Detailed incident panel (142 LOC)
│   ├── IncidentMap.tsx        # Leaflet map integration (174 LOC)
│   ├── Icons.tsx              # 19 SVG icon components (131 LOC)
│   ├── NotificationToast.tsx  # Toast notification system
│   ├── CustomDropdown.tsx     # Reusable dropdown component
│   ├── HistoryList.tsx        # Recently viewed incidents
│   ├── FeedbackModal.tsx      # User feedback modal
│   ├── LogViewerModal.tsx     # Client-side log viewer
│   ├── LocationPermissionBanner.tsx  # Geolocation permission prompt
│   ├── ErrorMessage.tsx       # Error display component
│   ├── Spinner.tsx            # Loading spinner (small/medium/large)
│   └── DebugPane.tsx          # Development debugging component
│
├── /hooks/                    # Custom React hooks
│   ├── useLocation.ts         # Geolocation management (90 LOC)
│   └── usePrevious.ts         # Previous value tracking (12 LOC)
│
├── /services/                 # Business logic and external integrations
│   ├── api.ts                 # Backend API communication (134 LOC)
│   ├── geminiService.ts       # Google Gemini AI integration (124 LOC)
│   ├── importer.ts            # Multi-source data sync (475 LOC)
│   └── mockData.ts            # Empty placeholder for future mocks
│
├── /utils/                    # Utility functions
│   ├── location.ts            # Distance calculation (Haversine formula)
│   ├── logger.ts              # LocalStorage-based logging (57 LOC)
│   ├── mapIcons.ts            # Leaflet marker icon generation (50 LOC)
│   └── time.ts                # Date/time formatting utilities (100 LOC)
│
└── /[Backend PHP files]/      # Backend proxy scripts (not part of React app)
    ├── get_incidents.php      # Fetch incidents from MySQL
    ├── importer.php           # Save incidents to MySQL
    ├── fetch_tomtom.php       # TomTom API proxy with key rotation
    ├── fetch_ohgo.php         # OHGO API proxy
    └── fetch_texas.php        # DriveTexas API proxy
```

**Note**: No `src/` directory - all TypeScript files are in the root or direct subdirectories.

---

## Technology Stack

### Core Dependencies

```json
{
  "react": "^19.2.0",           // Latest React with concurrent features
  "react-dom": "^19.2.0",       // DOM renderer
  "@google/genai": "^1.22.0",   // Google Gemini AI SDK
  "uuid": "^13.0.0"             // UUID v5 for deterministic IDs
}
```

### Development Tools

```json
{
  "@types/node": "^22.14.0",           // Node.js types
  "@vitejs/plugin-react": "^5.0.0",   // Vite React plugin
  "typescript": "~5.8.2",              // TypeScript compiler
  "vite": "^6.2.0"                     // Build tool
}
```

### CDN Dependencies (in index.html)

- **Tailwind CSS 3.x**: Utility-first CSS framework
- **Leaflet 1.9.4**: Interactive mapping library
- **Leaflet.markercluster 1.4.1**: Map marker clustering

### Build Tool: Vite

- **Why Vite**: Fast HMR, native ESM, optimized builds
- **Dev Server**: `localhost:3000` (configurable in vite.config.ts)
- **Build Output**: `dist/` directory (not committed)

---

## Key Concepts & Patterns

### 1. Component Architecture

**Pattern**: Single-file components with explicit prop interfaces

```typescript
// Standard component structure
import React from 'react';

interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export const Component: React.FC<ComponentProps> = ({ data, onAction }) => {
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
};
```

### 2. State Management

**Pattern**: Centralized state in App.tsx, unidirectional data flow

- **No Redux/MobX**: All state lives in `App.tsx` using React hooks
- **Props Drilling**: Data and callbacks passed down through props
- **Derived State**: `useMemo` for computed values (filtered lists, stats)
- **Persistent State**: LocalStorage for filters, logs

### 3. Data Fetching & Synchronization

**Pattern**: Service layer abstraction with error handling

```typescript
// services/api.ts - Backend communication
export async function fetchLatestIncidents(): Promise<Incident[]>

// services/importer.ts - Multi-source sync
export async function syncWithExternalApis(callback: (log: string) => void): Promise<SyncResult>

// services/geminiService.ts - AI integration
export async function summarizeIncident(incident: Incident, allIncidents: Incident[]): Promise<AISummary>
```

### 4. Custom Hooks

**Pattern**: Reusable stateful logic

```typescript
// hooks/useLocation.ts
export const useLocation = () => {
  // Returns: location, error, permissionStatus, isTracking, requestLocation(), stopTracking()
};

// hooks/usePrevious.ts
export const usePrevious = <T>(value: T): T | undefined => {
  // Stores previous render's value
};
```

### 5. Error Handling

**Pattern**: Try-catch with user-friendly messages and logging

```typescript
try {
  const data = await fetchData();
  // Process data
} catch (error) {
  console.error('Operation failed:', error);
  logMessage(`ERROR: ${error instanceof Error ? error.message : String(error)}`);
  setError('User-friendly error message');
}
```

### 6. Type Safety

**Pattern**: Strict TypeScript with explicit interfaces

- No `any` types (avoid unless absolutely necessary)
- Explicit prop interfaces for all components
- Type guards for runtime validation
- Union types for enums (`'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`)

---

## Component Guide

### Container Components

#### `App.tsx` (440 LOC)
**Role**: Main application orchestrator

**Responsibilities**:
- State management (all app state)
- Data fetching and synchronization
- Auto-refresh logic (5-minute interval)
- Filter application and persistence
- Notification management
- Modal state management

**Key State**:
```typescript
- allIncidents: Incident[]          // Master incident data
- filteredIncidents: Incident[]     // Computed (useMemo)
- selectedIncident: Incident | null // Currently viewed
- filters: Filters                  // Persistent to LocalStorage
- isLoading, isSyncing, isSummaryLoading // Loading states
- error: string | null              // Error messages
- notifications: Notification[]     // Toast queue
```

**Important Functions**:
- `loadIncidents()`: Fetch from database
- `handleSync()`: Sync from external APIs
- `handleIncidentSelect()`: Select incident + fetch AI summary
- `applyFilters()`: Filter logic (useMemo)

#### `IncidentMap.tsx` (174 LOC)
**Role**: Leaflet map integration with clustering

**Key Features**:
- Marker clustering for performance
- Severity-based marker colors
- Click to select incident
- User location marker (optional)
- Auto-fit bounds when incidents change

**Critical**: Uses `useRef` to persist map instance across renders

```typescript
const mapInstanceRef = useRef<any>(null);
const clustererRef = useRef<any>(null);
```

**Leaflet Globals**: Uses `window.L` (CDN import)

### Presentational Components

#### `IncidentCard.tsx` (153 LOC)
**Role**: Display individual incident in list

**Features**:
- Severity badge with color coding
- Category icon (crash vs. roadwork)
- Distance calculation (if user location available)
- Time ago display
- Active/cleared status indicator

#### `IncidentDetail.tsx` (142 LOC)
**Role**: Detailed incident view with AI summary

**Features**:
- Full incident metadata
- AI-generated summary (with loading state)
- Confidence indicator
- Location coordinates
- Close button

**AI Summary Structure**:
```typescript
interface AISummary {
  summary: string;         // Main summary text
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;       // AI's reasoning
}
```

#### `FilterControls.tsx` (240 LOC)
**Role**: Advanced filtering UI

**Filters Available**:
- Text search (route, county, event type)
- State dropdown (multi-state support)
- Severity buttons (LOW, MEDIUM, HIGH, CRITICAL)
- Route dropdown
- Category buttons (INCIDENT, ROADWORK)
- Status buttons (ACTIVE, CLEARED, ALL)
- Date range (start and end dates)

**Important**: Uses `CustomDropdown` for state/route selection

#### `Header.tsx` (83 LOC)
**Role**: Top navigation bar

**Actions**:
- Refresh (reload from database)
- Sync (fetch from external APIs)
- Location tracking toggle
- Feedback modal
- Log viewer modal

**Note**: Each button has icon + tooltip

### Utility Components

#### `Icons.tsx` (131 LOC)
**Role**: SVG icon library

**Icons Available** (19 total):
- MapIcon, ListIcon, RefreshIcon, SyncIcon, SearchIcon
- LocationIcon, AlertIcon, WarningIcon, InfoIcon, CloseIcon
- CheckIcon, ChevronDownIcon, FilterIcon, ClockIcon, CarIcon
- RoadworkIcon, DownloadIcon, TrashIcon, FeedbackIcon

**Usage**: Import directly, all are React functional components

#### `Spinner.tsx`
**Role**: Loading indicator

**Sizes**: `small` (16px), `medium` (32px), `large` (48px)

**Usage**:
```typescript
<Spinner size="medium" />
```

### Modal Components

#### `FeedbackModal.tsx`
**Role**: User feedback collection

**Fields**: Name, Email, Feedback (textarea)

#### `LogViewerModal.tsx`
**Role**: Display client-side logs

**Features**:
- Scrollable log list
- Download logs as text file
- Clear logs button
- Auto-scrolls to bottom

**Log Storage**: LocalStorage via `utils/logger.ts`

---

## Service Layer

### `services/api.ts` (134 LOC)

**Purpose**: Backend communication and data transformation

**Key Functions**:

```typescript
// Fetch all incidents from MySQL via PHP backend
export async function fetchLatestIncidents(): Promise<Incident[]>

// Transform raw DB data to typed Incident objects
function sanitizeIncident(raw: any): Incident

// Validate and clean coordinates
function cleanCoordinates(lat: any, lon: any): { latitude: number | null; longitude: number | null }
```

**Backend URL**: Configure `BACKEND_API_URL` constant (default: empty string = same origin)

**Error Handling**: Comprehensive try-catch with user-friendly messages

**Type Safety**: All responses validated and typed

### `services/geminiService.ts` (124 LOC)

**Purpose**: Google Gemini AI integration for incident summaries

**Key Function**:

```typescript
export async function summarizeIncident(
  incident: Incident,
  allIncidents: Incident[]
): Promise<AISummary>
```

**Features**:
- Structured JSON output with schema
- Considers nearby incidents (within 5 miles)
- Contextual analysis (severity, closure, impact)
- Confidence scoring (HIGH/MEDIUM/LOW)
- Reasoning field (AI's thought process)

**Model Configuration**:
- Model: `gemini-2.0-flash-exp`
- Temperature: `0.2` (more deterministic)
- Response format: JSON with schema enforcement

**API Key**: From `process.env.GEMINI_API_KEY` (set in vite.config.ts or index.html)

**JSON Schema**:
```json
{
  "type": "object",
  "properties": {
    "summary": { "type": "string" },
    "confidence": { "type": "string", "enum": ["HIGH", "MEDIUM", "LOW"] },
    "reasoning": { "type": "string" }
  },
  "required": ["summary", "confidence", "reasoning"]
}
```

### `services/importer.ts` (475 LOC)

**Purpose**: Multi-source data synchronization pipeline

**Main Function**:

```typescript
export async function syncWithExternalApis(
  onLogMessage: (message: string) => void
): Promise<SyncResult>
```

**Data Sources**:
1. **TomTom Traffic API** (Nationwide)
   - Bounding box queries for different regions
   - GeoJSON format
   - 5 API keys with rotation

2. **OHGO API** (Ohio only)
   - Incidents endpoint
   - JSON format
   - Single API key

3. **DriveTexas API** (Texas only)
   - Conditions GeoJSON
   - JSON format
   - Single API key

**Workflow**:
1. Fetch data from all sources in parallel (`Promise.allSettled`)
2. Transform each source's data to standardized `IncidentPayload` format
3. Generate deterministic UUIDs (v5 namespace-based)
4. Calculate severity scores
5. Batch incidents (150 per batch)
6. Send to `importer.php` for MySQL persistence

**Transformation Functions**:
- `transformTomTomIncident(feature: any): IncidentPayload`
- `transformOHGOIncident(incident: any): IncidentPayload`
- `transformTexasIncident(feature: any): IncidentPayload`

**UUID Generation**:
```typescript
// Deterministic UUID based on source + event ID
const incidentId = uuidv5(`${sourceSystem}-${sourceEventId}`, UUID_NAMESPACE);
```

**Severity Calculation**:
```typescript
function calculateSeverityScore(incident: Partial<IncidentPayload>): number {
  let score = 50; // Base score
  // +50 for closures, +30 for high delays, +20 for multi-vehicle, etc.
  return Math.min(score, 100);
}
```

**Backend Endpoints** (configure constants):
- `IMPORTER_API_URL`: Target for batch imports
- `OHGO_PROXY_URL`: PHP proxy for OHGO API
- `TEXAS_PROXY_URL`: PHP proxy for DriveTexas API
- `TOMTOM_PROXY_URL`: PHP proxy for TomTom API

---

## State Management

### Primary State (in App.tsx)

```typescript
// Master data
const [allIncidents, setAllIncidents] = useState<Incident[]>([]);

// UI state
const [isLoading, setIsLoading] = useState(true);
const [isSyncing, setIsSyncing] = useState(false);
const [isSummaryLoading, setIsSummaryLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

// Selection
const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
const [viewHistory, setViewHistory] = useState<Incident[]>([]);

// AI
const [summary, setSummary] = useState<AISummary | null>(null);

// Notifications
const [notifications, setNotifications] = useState<Notification[]>([]);

// Modals
const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);

// Filters (persistent)
const [filters, setFilters] = useState<Filters>(() => {
  const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
});

// Timestamps
const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
```

### Derived State (useMemo)

```typescript
// Filtered incidents based on current filters
const filteredIncidents = useMemo(() => {
  return allIncidents.filter(incident => {
    // Query filter
    if (filters.query && !matchesQuery(incident, filters.query)) return false;
    // State filter
    if (filters.state !== 'ALL' && incident.state !== filters.state) return false;
    // Severity filter
    if (filters.severity !== 'ALL' && incident.severity_flag !== filters.severity) return false;
    // Route filter
    if (filters.route !== 'ALL' && incident.route !== filters.route) return false;
    // Category filter
    if (filters.category !== 'ALL' && incident.category !== filters.category) return false;
    // Status filter
    if (filters.status === 'ACTIVE' && !incident.is_active) return false;
    if (filters.status === 'CLEARED' && incident.is_active) return false;
    // Date range filters
    // ... (date comparisons)
    return true;
  });
}, [allIncidents, filters]);

// Aggregate statistics for filter UI
const incidentStats = useMemo(() => ({
  total: allIncidents.length,
  active: allIncidents.filter(i => i.is_active).length,
  cleared: allIncidents.filter(i => !i.is_active).length,
  // ... more stats
}), [allIncidents]);
```

### Persistent State (LocalStorage)

```typescript
// Filters
const FILTERS_STORAGE_KEY = 'traffic-incident-filters';

// Save filters on change
useEffect(() => {
  localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
}, [filters]);

// Load filters on mount
const [filters, setFilters] = useState<Filters>(() => {
  const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
  return saved ? JSON.parse(saved) : DEFAULT_FILTERS;
});

// Logs (via utils/logger.ts)
const LOGS_STORAGE_KEY = 'traffic-incident-logs';
```

### Custom Hook State

```typescript
// hooks/useLocation.ts
const {
  location,              // { latitude: number; longitude: number } | null
  error,                 // string | null
  permissionStatus,      // 'prompt' | 'granted' | 'denied'
  isTracking,            // boolean
  requestLocation,       // () => void
  stopTracking,          // () => void
} = useLocation();
```

---

## Type System

### Core Types (types.ts)

```typescript
export interface Incident {
  // Identity
  uuid: string;
  source_system: string;          // 'tomtom', 'ohgo', 'texas'
  source_event_id: string | null;

  // Location
  state: string | null;           // 'OH', 'TX', etc.
  county: string | null;
  route: string | null;           // 'I-71', 'US-23', etc.
  direction: string | null;       // 'N', 'S', 'E', 'W', 'NB', 'SB'
  milepost: number | null;
  latitude: number | null;
  longitude: number | null;

  // Temporal
  reported_time: string | null;   // ISO 8601
  updated_time: string;           // ISO 8601 (required)
  cleared_time: string | null;    // ISO 8601

  // Status
  is_active: boolean;
  category: 'INCIDENT' | 'ROADWORK';
  event_type: string | null;      // 'CRASH', 'CONSTRUCTION', etc.
  closure_status: 'OPEN' | 'CLOSED' | 'PARTIAL' | 'UNKNOWN';

  // Severity
  severity_flag: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity_score: number | null;  // 0-100

  // Details
  description: string;
  lanes_affected: string | null;
  units_involved: number | null;
}

export interface IncidentPayload {
  // Same as Incident but with specific database types
  is_active: 0 | 1;  // MySQL boolean
  // ... rest of fields
}

export interface AISummary {
  summary: string;                // Main summary text
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;              // AI's reasoning
}

export interface Filters {
  query: string;                  // Search text
  state: string;                  // 'ALL' or state code
  severity: string;               // 'ALL' or severity level
  route: string;                  // 'ALL' or route name
  category: string;               // 'ALL', 'INCIDENT', 'ROADWORK'
  status: string;                 // 'ALL', 'ACTIVE', 'CLEARED'
  startDate: string;              // ISO date string
  endDate: string;                // ISO date string
}

export interface Notification {
  id: string;                     // UUID
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;              // milliseconds (default 5000)
}

export interface Location {
  latitude: number;
  longitude: number;
}

export interface SyncResult {
  success: boolean;
  message: string;
  details?: {
    tomtom?: { count: number };
    ohgo?: { count: number };
    texas?: { count: number };
  };
}
```

### Type Guards

```typescript
// Example type guard for runtime validation
function isIncident(obj: any): obj is Incident {
  return (
    typeof obj === 'object' &&
    typeof obj.uuid === 'string' &&
    typeof obj.updated_time === 'string' &&
    (obj.category === 'INCIDENT' || obj.category === 'ROADWORK')
  );
}
```

---

## Development Workflows

### Setup & Installation

```bash
# 1. Clone repository
git clone <repo-url>
cd ai-traffic-analyzer

# 2. Install dependencies
npm install

# 3. Configure environment
# Create .env.local file
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# 4. Start development server
npm run dev
# Server runs on http://localhost:3000
```

### Development Commands

```bash
# Start dev server (hot reload enabled)
npm run dev

# Build for production
npm run build
# Output: dist/ directory

# Preview production build
npm run preview
```

### Code Organization Rules

1. **One component per file**: No barrel exports
2. **Absolute imports**: Use `@/` alias for root imports
   ```typescript
   import { Incident } from '@/types';
   import { fetchLatestIncidents } from '@/services/api';
   ```
3. **Co-locate related code**: Utilities with their users when possible
4. **Explicit exports**: Named exports preferred over default exports

### Adding a New Component

```typescript
// 1. Create file: components/NewComponent.tsx

import React from 'react';

interface NewComponentProps {
  data: DataType;
  onAction: (id: string) => void;
}

export const NewComponent: React.FC<NewComponentProps> = ({ data, onAction }) => {
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
};

// 2. Import in App.tsx or parent component
import { NewComponent } from '@/components/NewComponent';

// 3. Use in JSX
<NewComponent data={data} onAction={handleAction} />
```

### Adding a New Service

```typescript
// 1. Create file: services/newService.ts

export async function performAction(param: string): Promise<Result> {
  try {
    // Service logic
    return result;
  } catch (error) {
    console.error('performAction failed:', error);
    throw new Error('User-friendly error message');
  }
}

// 2. Import in App.tsx or component
import { performAction } from '@/services/newService';

// 3. Use with error handling
try {
  const result = await performAction(param);
  // Handle success
} catch (error) {
  setError(error.message);
}
```

### Git Workflow

**Branch Naming**:
- Feature branches: `claude/claude-md-<session-id>-<identifier>`
- Bug fixes: `fix/<description>`
- Enhancements: `feat/<description>`

**Commit Messages**:
Follow conventional commits format:
```
feat(scope): Brief description

Longer description if needed

Files Changed: file1.tsx, file2.ts
```

Examples from recent history:
```
feat(filters): Implement persistent filter settings
feat(ui): Add distinct category icons to detail panel
docs(readme): Update documentation with latest features
```

**Commit Workflow**:
1. Make changes
2. Test changes (manual testing)
3. Stage files: `git add <files>`
4. Commit: `git commit -m "message"`
5. Push: `git push -u origin <branch-name>`

**Important**: Always push to the designated branch (starts with `claude/` and ends with session ID)

---

## Common Tasks

### Task 1: Add a New Filter

**Steps**:
1. Update `Filters` interface in `types.ts`
   ```typescript
   export interface Filters {
     // ... existing filters
     newFilter: string;
   }
   ```

2. Update `DEFAULT_FILTERS` in `App.tsx`
   ```typescript
   const DEFAULT_FILTERS: Filters = {
     // ... existing defaults
     newFilter: 'ALL',
   };
   ```

3. Add UI control in `FilterControls.tsx`
   ```typescript
   <select
     value={filters.newFilter}
     onChange={(e) => onFilterChange({ ...filters, newFilter: e.target.value })}
   >
     <option value="ALL">All</option>
     <option value="VALUE1">Value 1</option>
   </select>
   ```

4. Add filter logic in `App.tsx` `filteredIncidents` useMemo
   ```typescript
   if (filters.newFilter !== 'ALL' && incident.newField !== filters.newFilter) {
     return false;
   }
   ```

5. Test: Change filter, verify results, check LocalStorage persistence

### Task 2: Add a New Data Source

**Steps**:
1. Create PHP proxy file (`fetch_newsource.php`)
   - Follow pattern from `fetch_ohgo.php`
   - Handle API key, error responses
   - Return JSON

2. Add transformation function in `services/importer.ts`
   ```typescript
   function transformNewSourceIncident(raw: any): IncidentPayload {
     return {
       uuid: uuidv5(`newsource-${raw.id}`, UUID_NAMESPACE),
       source_system: 'newsource',
       // ... map fields
     };
   }
   ```

3. Add fetch logic in `syncWithExternalApis()`
   ```typescript
   const newsourcePromise = fetch(NEWSOURCE_PROXY_URL)
     .then(res => res.json())
     .then(data => data.map(transformNewSourceIncident));

   const results = await Promise.allSettled([
     tomtomPromise,
     ohgoPromise,
     texasPromise,
     newsourcePromise, // Add here
   ]);
   ```

4. Handle results and log
   ```typescript
   const newsourceResult = results[3];
   if (newsourceResult.status === 'fulfilled') {
     onLogMessage(`Fetched ${newsourceResult.value.length} from New Source`);
   }
   ```

5. Test sync, verify data in database

### Task 3: Modify AI Summary Prompt

**Steps**:
1. Open `services/geminiService.ts`
2. Locate `summarizeIncident()` function
3. Modify the prompt string
   ```typescript
   const prompt = `You are an AI traffic analyst. Analyze this incident...

   [Add your new instructions here]

   Incident Details:
   ${JSON.stringify(incidentContext, null, 2)}
   `;
   ```
4. Optionally update JSON schema if changing response structure
5. Test with various incidents, check AI responses

### Task 4: Add a New Component

**Example**: Add a statistics dashboard

1. Create `components/StatsDashboard.tsx`
   ```typescript
   import React from 'react';
   import { Incident } from '@/types';

   interface StatsDashboardProps {
     incidents: Incident[];
   }

   export const StatsDashboard: React.FC<StatsDashboardProps> = ({ incidents }) => {
     const stats = {
       total: incidents.length,
       active: incidents.filter(i => i.is_active).length,
       // ... more stats
     };

     return (
       <div className="bg-white p-4 rounded shadow">
         <h3 className="text-lg font-bold mb-2">Statistics</h3>
         <div className="grid grid-cols-3 gap-4">
           <div>Total: {stats.total}</div>
           <div>Active: {stats.active}</div>
         </div>
       </div>
     );
   };
   ```

2. Import in `App.tsx`
   ```typescript
   import { StatsDashboard } from '@/components/StatsDashboard';
   ```

3. Add to JSX
   ```typescript
   <StatsDashboard incidents={filteredIncidents} />
   ```

4. Style with Tailwind CSS classes

### Task 5: Debug an Issue

**Approach**:
1. Check client-side logs
   - Click "View Logs" button in header
   - Look for ERROR or WARNING messages
   - Download logs if needed

2. Check browser console
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check network tab for failed requests

3. Add debug logging
   ```typescript
   import { logMessage } from '@/utils/logger';

   logMessage(`DEBUG: Variable value = ${JSON.stringify(variable)}`);
   ```

4. Use React DevTools
   - Install React DevTools browser extension
   - Inspect component props and state

5. Check backend logs
   - PHP error logs on server
   - MySQL query logs

---

## Conventions & Best Practices

### Naming Conventions

- **Components**: PascalCase (`IncidentCard`, `FilterControls`)
- **Files**: Match component name (`IncidentCard.tsx`)
- **Functions**: camelCase (`fetchLatestIncidents`, `calculateDistance`)
- **Variables**: camelCase (`allIncidents`, `isLoading`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_FILTERS`, `API_BASE_URL`)
- **Types/Interfaces**: PascalCase (`Incident`, `AISummary`)

### File Organization

- **Imports Order**:
  1. React imports
  2. External libraries
  3. Internal modules (types, utils, services)
  4. Components
  5. Styles (if any)

Example:
```typescript
import React, { useState, useEffect } from 'react';
import { v5 as uuidv5 } from 'uuid';
import { Incident, Filters } from '@/types';
import { logMessage } from '@/utils/logger';
import { fetchLatestIncidents } from '@/services/api';
import { IncidentCard } from '@/components/IncidentCard';
```

### Component Patterns

**Props Interface**:
```typescript
// Always define explicit interface for props
interface ComponentProps {
  data: DataType;
  onAction: (id: string) => void;
  isLoading?: boolean;  // Optional props with ?
}

export const Component: React.FC<ComponentProps> = ({ data, onAction, isLoading = false }) => {
  // Component logic
};
```

**Event Handlers**:
```typescript
// Prefix with 'handle'
const handleClick = () => { /* ... */ };
const handleSubmit = (e: React.FormEvent) => { /* ... */ };
const handleChange = (value: string) => { /* ... */ };
```

**Conditional Rendering**:
```typescript
// Use ternary for binary conditions
{isLoading ? <Spinner /> : <Content />}

// Use && for single condition
{error && <ErrorMessage message={error} />}

// Use early returns for complex conditions
if (!data) return null;
return <Content data={data} />;
```

### Styling with Tailwind

**Common Patterns**:
```typescript
// Container
<div className="max-w-7xl mx-auto px-4 py-8">

// Card
<div className="bg-white rounded-lg shadow p-4">

// Button
<button className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">

// Flexbox
<div className="flex items-center justify-between gap-4">

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Responsive
<div className="text-sm md:text-base lg:text-lg">
```

**Severity Colors** (consistent across app):
- CRITICAL: `bg-red-500`, `text-red-700`, `border-red-300`
- HIGH: `bg-orange-500`, `text-orange-700`, `border-orange-300`
- MEDIUM: `bg-yellow-500`, `text-yellow-700`, `border-yellow-300`
- LOW: `bg-blue-500`, `text-blue-700`, `border-blue-300`
- ROADWORK: `bg-slate-500`, `text-slate-700`, `border-slate-300`

### Error Handling

**Pattern**:
```typescript
try {
  const result = await riskyOperation();
  // Success path
} catch (error) {
  // 1. Log to console (for developers)
  console.error('Operation failed:', error);

  // 2. Log to client-side logger (for debugging)
  logMessage(`ERROR: ${error instanceof Error ? error.message : String(error)}`);

  // 3. Show user-friendly message
  setError('Unable to complete operation. Please try again.');

  // 4. Optionally show notification
  addNotification({
    id: uuidv4(),
    type: 'error',
    message: 'Operation failed',
  });
}
```

### Performance Optimization

**useMemo for Expensive Computations**:
```typescript
const filteredData = useMemo(() => {
  return data.filter(/* complex filtering */);
}, [data, filterCriteria]);
```

**useCallback for Stable Function References**:
```typescript
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

**Refs for Non-Reactive Values**:
```typescript
const mapInstanceRef = useRef<any>(null);
// Does not trigger re-renders when changed
```

**Avoid Inline Functions in Render** (for list items):
```typescript
// ❌ Bad: Creates new function on every render
{items.map(item => <Item onClick={() => handleClick(item.id)} />)}

// ✅ Good: Stable function reference
const handleItemClick = useCallback((id: string) => { /* ... */ }, []);
{items.map(item => <Item onClick={() => handleItemClick(item.id)} />)}
```

### Accessibility

- Use semantic HTML (`<button>`, `<nav>`, `<main>`, `<section>`)
- Add ARIA labels for icon buttons
  ```typescript
  <button aria-label="Refresh incidents">
    <RefreshIcon />
  </button>
  ```
- Ensure keyboard navigation works
- Provide alt text for images/icons
- Use sufficient color contrast

---

## Troubleshooting

### Common Issues

#### 1. "Incidents not loading"

**Symptoms**: Empty list, loading spinner forever

**Diagnosis**:
- Check browser console for errors
- Check Network tab: Is `get_incidents.php` returning 200?
- Check response: Is it valid JSON?

**Solutions**:
- Verify `BACKEND_API_URL` in `services/api.ts`
- Check PHP backend configuration (database credentials)
- Ensure MySQL database has `incidents` table
- Check CORS headers in PHP

#### 2. "AI summaries not generating"

**Symptoms**: Loading spinner in IncidentDetail, no summary appears

**Diagnosis**:
- Check console for Gemini API errors
- Check if `GEMINI_API_KEY` is set
- Check browser console for quota/rate limit errors

**Solutions**:
- Verify `GEMINI_API_KEY` in `.env.local` or `index.html`
- Check Gemini API quota in Google AI Studio
- Verify network requests to `generativelanguage.googleapis.com`
- Check if API key has necessary permissions

#### 3. "Sync failing"

**Symptoms**: "Sync failed" notification, no new data

**Diagnosis**:
- Open log viewer, look for error messages
- Check which source failed (TomTom, OHGO, Texas)
- Check browser console for network errors

**Solutions**:
- Verify PHP proxy URLs in `services/importer.ts`
- Check PHP proxy files for correct API keys
- Verify external API quotas (TomTom, OHGO, DriveTexas)
- Check CORS headers in PHP proxies
- Check `importer.php` database credentials

#### 4. "Map not displaying"

**Symptoms**: Blank area where map should be

**Diagnosis**:
- Check browser console for Leaflet errors
- Verify Leaflet CDN loaded: `window.L` should exist
- Check if `IncidentMap` component rendered

**Solutions**:
- Verify CDN links in `index.html` (Leaflet CSS and JS)
- Check map container has explicit height: `h-full` or `height: 500px`
- Verify incidents have valid coordinates
- Check browser console for tile loading errors

#### 5. "Filters not persisting"

**Symptoms**: Filters reset after page reload

**Diagnosis**:
- Check LocalStorage in DevTools (Application tab)
- Look for `traffic-incident-filters` key

**Solutions**:
- Verify LocalStorage is enabled in browser
- Check for private browsing mode (may restrict storage)
- Verify `useEffect` saving filters runs
- Check for LocalStorage quota exceeded

#### 6. "Build failing"

**Symptoms**: `npm run build` errors

**Diagnosis**:
- Check error message for TypeScript errors
- Check for missing dependencies

**Solutions**:
- Run `npm install` to ensure all deps installed
- Fix TypeScript errors shown in build output
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check for syntax errors in recently modified files

### Debug Workflow

1. **Reproduce Issue**: Understand exact steps to trigger
2. **Check Logs**: Client-side logs, browser console, network tab
3. **Add Debug Logging**: Insert `logMessage()` calls
4. **Isolate Component**: Test component in isolation
5. **Check Dependencies**: Verify all services/APIs working
6. **Binary Search**: Comment out code sections to narrow down
7. **Fix & Verify**: Implement fix, test thoroughly

### Development Tools

- **React DevTools**: Inspect component hierarchy, props, state
- **Browser DevTools**: Console, Network, Application (LocalStorage)
- **Vite DevTools**: HMR logs, build info
- **Client-side Logger**: Built-in log viewer in app

---

## Important Constraints

### Backend Configuration Required

**Critical**: This app requires a PHP backend and MySQL database. The React frontend alone is not fully functional without:

1. **MySQL Database**: `incidents` table (schema in README.md)
2. **PHP Scripts**:
   - `get_incidents.php`: Fetch incidents from MySQL
   - `importer.php`: Save incidents to MySQL
   - `fetch_tomtom.php`: TomTom API proxy
   - `fetch_ohgo.php`: OHGO API proxy
   - `fetch_texas.php`: DriveTexas API proxy

3. **Configuration**:
   - Database credentials in all PHP files
   - API keys in PHP proxy files
   - `GEMINI_API_KEY` in `.env.local` or `index.html`
   - Backend URLs in `services/api.ts` and `services/importer.ts`

### No Server-Side Rendering

- This is a client-side only React app
- All rendering happens in the browser
- SEO is not optimized (SPA limitations)

### Browser Requirements

- **Modern Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **JavaScript Enabled**: Required
- **LocalStorage Enabled**: For filters and logs
- **Geolocation API**: Optional, for distance features

### API Rate Limits

- **TomTom**: 2,500 requests/day per key (5 keys = 12,500 total)
- **OHGO**: Check API documentation
- **DriveTexas**: Check API documentation
- **Google Gemini**: Check quota in AI Studio (varies by tier)

### Performance Considerations

- **Large Datasets**: 1000+ incidents may cause map clustering lag
- **AI Summaries**: Each takes ~2-5 seconds to generate
- **Sync Operation**: Full sync takes ~30-60 seconds (all sources)

### Security Notes

- **API Keys in Frontend**: Gemini API key exposed in browser (acceptable for demo/internal use)
- **No Authentication**: No user login required (public access)
- **CORS**: Backend must allow frontend origin
- **Input Validation**: Minimal (assumes trusted data sources)

---

## Summary for AI Assistants

### Quick Reference

**Project Type**: React 19 + TypeScript + Vite SPA with PHP/MySQL backend

**Main Files**:
- `App.tsx`: All state and business logic
- `services/api.ts`: Backend communication
- `services/importer.ts`: Multi-source sync
- `services/geminiService.ts`: AI integration
- `types.ts`: Type definitions

**Key Patterns**:
- Unidirectional data flow (top-down)
- Props drilling (no Context API)
- useMemo for derived state
- LocalStorage for persistence
- Service layer for external communication

**Common Tasks**:
- Add filter: Update types → App.tsx → FilterControls.tsx
- Add data source: Create PHP proxy → Transform function → Sync logic
- Add component: Create file → Import → Use in App.tsx
- Modify AI: Edit `geminiService.ts` prompt

**Debugging**:
1. Check client-side logs (View Logs button)
2. Check browser console
3. Check Network tab
4. Add debug logging with `logMessage()`

**Git Workflow**:
- Branch: `claude/claude-md-<session-id>-<identifier>`
- Commits: Conventional commits format
- Push: Always to designated branch

**Important**:
- Backend required (PHP + MySQL)
- Configure API keys before use
- Test sync operation after changes
- Verify filters persist after page reload

---

## Change Log

- **2025-12-04**: Initial CLAUDE.md creation
  - Comprehensive codebase analysis
  - Documented all components, services, utilities
  - Established conventions and best practices
  - Added common tasks and troubleshooting guides

---

## Questions or Issues?

If you encounter issues or have questions while working on this codebase:

1. Check this CLAUDE.md file first
2. Review the README.md for setup instructions
3. Check client-side logs for runtime errors
4. Inspect browser console for JavaScript errors
5. Verify backend configuration (PHP, MySQL, API keys)

For backend-related issues, refer to the detailed PHP configuration sections in README.md.

For architecture questions, refer to the "Codebase Architecture" section above.

For specific implementation questions, refer to the relevant component/service section.

---

**End of CLAUDE.md**
