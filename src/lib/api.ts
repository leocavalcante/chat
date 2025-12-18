import Anthropic from "@anthropic-ai/sdk";

export const client = new Anthropic({
  apiKey: "noop",
  baseURL: "http://localhost:4141",
  dangerouslyAllowBrowser: true,
});

export const tools: Anthropic.Tool[] = [
  {
    name: "web_search",
    description: "Search the web for current information. Use this when you need to find up-to-date information, news, or facts that may not be in your training data.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_weather",
    description: "Get current weather information for a location. Use this when the user asks about weather conditions.",
    input_schema: {
      type: "object" as const,
      properties: {
        location: {
          type: "string",
          description: "The city or location to get weather for (e.g., 'London', 'New York', 'Tokyo')",
        },
      },
      required: ["location"],
    },
  },
  {
    name: "web_fetch",
    description: "Fetch the content of a web page. Use this when you need to read the content of a specific URL.",
    input_schema: {
      type: "object" as const,
      properties: {
        url: {
          type: "string",
          description: "The URL to fetch content from",
        },
      },
      required: ["url"],
    },
  },
];

export async function performWebSearch(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`
    );
    const data = await response.json();

    let results = "";

    if (data.Abstract) {
      results += `Summary: ${data.Abstract}\n\n`;
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      results += "Related results:\n";
      for (const topic of data.RelatedTopics.slice(0, 5)) {
        if (topic.Text) {
          results += `- ${topic.Text}\n`;
        }
      }
    }

    if (!results) {
      results = "No results found for this query.";
    }

    return results;
  } catch (error) {
    return `Search failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function getWeather(location: string): Promise<string> {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`
    );
    const geoData = await geoResponse.json();

    if (!geoData.results || geoData.results.length === 0) {
      return `Could not find location: ${location}`;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`
    );
    const weatherData = await weatherResponse.json();

    const current = weatherData.current;
    const weatherDescriptions: Record<number, string> = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Foggy",
      48: "Depositing rime fog",
      51: "Light drizzle",
      53: "Moderate drizzle",
      55: "Dense drizzle",
      61: "Slight rain",
      63: "Moderate rain",
      65: "Heavy rain",
      71: "Slight snow",
      73: "Moderate snow",
      75: "Heavy snow",
      77: "Snow grains",
      80: "Slight rain showers",
      81: "Moderate rain showers",
      82: "Violent rain showers",
      85: "Slight snow showers",
      86: "Heavy snow showers",
      95: "Thunderstorm",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };

    const description = weatherDescriptions[current.weather_code] || "Unknown";

    return `Weather in ${name}, ${country}:
- Condition: ${description}
- Temperature: ${current.temperature_2m}°C
- Feels like: ${current.apparent_temperature}°C
- Humidity: ${current.relative_humidity_2m}%
- Wind speed: ${current.wind_speed_10m} km/h`;
  } catch (error) {
    return `Weather lookup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export async function webFetch(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `Failed to fetch: ${response.status} ${response.statusText}`;
    }
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return JSON.stringify(data, null, 2);
    }
    const text = await response.text();
    if (contentType.includes("text/html")) {
      const stripped = text
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return stripped.slice(0, 10000) + (stripped.length > 10000 ? "..." : "");
    }
    return text.slice(0, 10000) + (text.length > 10000 ? "..." : "");
  } catch (error) {
    return `Fetch failed: ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}
