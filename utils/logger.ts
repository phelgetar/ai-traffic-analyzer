const LOG_KEY = 'app_log';
// Set a safe limit, e.g., 2MB, well below the typical 5MB browser limit.
const MAX_LOG_SIZE = 2 * 1024 * 1024; 
// When the log exceeds the max size, trim it down to this size.
const TRIM_TO_SIZE = 1.5 * 1024 * 1024; 

const logger = {
  log: (message: string): void => {
    try {
      const timestamp = new Date().toISOString();
      const newEntry = `[${timestamp}] ${message}\n`;
      let currentLog = localStorage.getItem(LOG_KEY) || '';
      
      let updatedLog = currentLog + newEntry;

      // If the new log exceeds the max size, truncate the oldest entries.
      if (updatedLog.length > MAX_LOG_SIZE) {
          const startIndex = updatedLog.length - TRIM_TO_SIZE;
          // Find the first newline character after the start index to avoid creating a partial line.
          const trimIndex = updatedLog.indexOf('\n', startIndex);
          
          if (trimIndex !== -1) {
              updatedLog = `[--- Log Truncated ---]\n` + updatedLog.substring(trimIndex + 1);
          } else {
              // Fallback if no newline is found (e.g., a single very long log entry)
              updatedLog = updatedLog.substring(startIndex);
          }
      }

      localStorage.setItem(LOG_KEY, updatedLog);
    } catch (error) {
      console.error("Failed to write to local log:", error);
    }
  },

  getLog: (): string => {
    try {
      return localStorage.getItem(LOG_KEY) || 'Log is empty.';
    } catch (error) {
      console.error("Failed to read from local log:", error);
      return 'Error reading log.';
    }
  },

  clearLog: (): void => {
    try {
      localStorage.removeItem(LOG_KEY);
      const timestamp = new Date().toISOString();
      // Start with a fresh message after manual clear.
      localStorage.setItem(LOG_KEY, `[${timestamp}] --- Log Cleared Manually ---\n`);
    } catch (error) {
      console.error("Failed to clear local log:", error);
    }
  },
};

export default logger;