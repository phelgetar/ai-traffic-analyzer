import { GoogleGenAI, Type } from "@google/genai";
import { Incident, WeatherData, AISummary } from '../types';

// FIX: Aligned with coding guidelines. The API key is sourced directly from
// process.env.API_KEY, assuming it is pre-configured and valid.
// Redundant checks and insecure fallbacks have been removed.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const summarySchema = {
    type: Type.OBJECT,
    properties: {
        summary: {
            type: Type.STRING,
            description: "The actionable summary for the driver, as previously defined."
        },
        confidence: {
            type: Type.STRING,
            description: "An assessment of the data quality, must be one of: 'HIGH', 'MEDIUM', 'LOW'."
        },
        reasoning: {
            type: Type.STRING,
            description: "A brief, one-sentence explanation for the confidence score."
        }
    },
    required: ['summary', 'confidence', 'reasoning']
};

export const summarizeIncident = async (
  incident: Incident,
  weather: WeatherData | null,
  nearbyIncidents: Incident[],
  historicalIncidents: Incident[]
): Promise<AISummary> => {
  const weatherDataString = weather 
    ? `- Weather: ${weather.temperature}, ${weather.conditions}, Wind: ${weather.wind}`
    : '- Weather: Not available.';

  const nearbyIncidentsString = nearbyIncidents.length > 0
    ? `Nearby Active Traffic (within 5 miles):\n${nearbyIncidents.map(i => `- ${i.event_type} on ${i.route} ${i.direction || ''}`).join('\n')}`
    : 'Nearby Active Traffic: No other major active incidents reported nearby.';

  const historicalIncidentsString = historicalIncidents.length > 0
    ? `Historical Data for this Location (past events on the same route within 2 miles):\n- This location has had ${historicalIncidents.length} cleared incident${historicalIncidents.length > 1 ? 's' : ''} in the recent dataset.`
    : 'Historical Data for this Location: No recent cleared incidents found at this specific location in the dataset.';


  const prompt = `
    You are an expert traffic analyst. Your task is to analyze the provided incident data and generate a JSON object containing a concise, actionable summary for drivers, along with a confidence assessment of the data's quality.

    The JSON output MUST conform to this schema: {summary: string, confidence: 'HIGH'|'MEDIUM'|'LOW', reasoning: string}.

    Instructions for the 'summary' field:
    1.  Immediately state the location (route, direction) and the type of incident.
    2.  Clearly describe the impact on traffic, including an estimated travel time impact in minutes.
    3.  Use the 'Nearby Active Traffic' data to assess regional congestion and refine alternative route suggestions. Avoid suggesting routes that are also congested.
    4.  Use the 'Historical Data' to comment on whether this is a recurring issue or a rare event for this location.
    5.  If severity is 'HIGH' or 'CRITICAL', suggest at least one specific, named alternative route.
    6.  If 'is_active: false', state the incident is cleared.
    7.  Incorporate weather data if available.
    8.  Conclude with: "Check local traffic advisories for the latest updates."

    Instructions for the 'confidence' and 'reasoning' fields:
    -   Assign 'HIGH' confidence if the data is detailed and specific (e.g., specific lanes affected, severity is known).
    -   Assign 'MEDIUM' confidence if some key details are present but others are generic or missing (e.g., severity is LOW or UNKNOWN, lanes affected is 'Not specified').
    -   Assign 'LOW' confidence if the data is very sparse, contradictory, or multiple key fields are 'N/A' or null.
    -   The 'reasoning' must be a brief justification for your confidence score (e.g., "Confidence is medium due to a vague event type.").

    --- DATA FOR ANALYSIS ---
    
    Current Incident:
    - Route: ${incident.route || 'N/A'} ${incident.direction || ''}
    - Location: In ${incident.county || 'an unspecified'} County, ${incident.state || 'N/A'}.
    - Event Type: ${incident.event_type || 'Unknown'}
    - Lanes Affected: ${incident.lanes_affected || 'Not specified'}
    - Severity: ${incident.severity_flag || 'Unknown'}
    - Status: ${incident.is_active ? 'Active' : 'Cleared'}
    - Description: ${incident.description} (Note: This is a programmatically generated summary; prioritize the structured fields above for detailed analysis.)
    ${weatherDataString}

    Contextual Data:
    - ${nearbyIncidentsString}
    - ${historicalIncidentsString}
    
    --- END OF DATA ---

    Generate the JSON response now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
          temperature: 0.2,
          topP: 0.9,
          responseMimeType: "application/json",
          responseSchema: summarySchema,
      }
    });
    
    const jsonText = response.text.trim();
    // Basic validation to ensure we have a JSON object
    if (jsonText.startsWith('{') && jsonText.endsWith('}')) {
        return JSON.parse(jsonText) as AISummary;
    }
    throw new Error("AI response was not in the expected JSON format.");

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    let errorMessage = error instanceof Error ? error.message : "An unknown AI service error occurred.";
    
    // Check for the specific API key invalid error from the Gemini API.
    if (errorMessage.includes('API_KEY_INVALID')) {
        errorMessage = "The provided Gemini API key is invalid or not configured. Please update the key in the index.html file.";
    }

    // Return a structured error response
    return {
        summary: `Failed to generate AI summary. Please check the incident details. Error: ${errorMessage}`,
        confidence: 'LOW',
        reasoning: 'An error occurred while communicating with the AI service.'
    };
  }
};