import React, { useState } from 'react';

interface DebugPaneProps {
  // FIX: Updated the type of `data` to `Record<string, any>` because the value for each key is the raw API response object, not an array.
  data: Record<string, any> | null;
}

const DebugPane: React.FC<DebugPaneProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!data) {
    return null;
  }

  const togglePane = () => setIsOpen(!isOpen);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white z-50 shadow-2xl border-t-2 border-yellow-400">
      <button
        onClick={togglePane}
        className="w-full bg-gray-700 hover:bg-gray-600 text-left p-2 font-mono text-sm"
      >
        OHGO API Debug Pane {isOpen ? '▼' : '▲'} (Test Only)
      </button>
      {isOpen && (
        <div className="p-4 max-h-64 overflow-auto font-mono text-xs">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="mb-4">
              <h4 className="font-bold text-yellow-400 sticky top-0 bg-gray-800 py-1">
                {/* Fix for line 31: Cast `value` to `any` to allow property access, as it is inferred as 'unknown' in strict mode. */}
                Endpoint: {key} (Count: {Array.isArray((value as any)?.results) ? (value as any).results.length : 'N/A'})
              </h4>
              <pre className="bg-gray-900 p-2 rounded mt-1 whitespace-pre-wrap break-all">
                <code>{JSON.stringify(value, null, 2)}</code>
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugPane;