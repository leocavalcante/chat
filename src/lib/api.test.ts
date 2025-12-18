import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

// Save original fetch
const originalFetch = globalThis.fetch;

// Import directly from the source to avoid mock interference
const apiModule = await import("./api");

describe("api", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("tools", () => {
    test("defines web_search tool", () => {
      const webSearch = apiModule.tools.find((t) => t.name === "web_search");
      expect(webSearch).toBeDefined();
      expect(webSearch?.description).toContain("Search the web");
      expect(webSearch?.input_schema.properties).toHaveProperty("query");
      expect(webSearch?.input_schema.required).toContain("query");
    });

    test("defines get_weather tool", () => {
      const weather = apiModule.tools.find((t) => t.name === "get_weather");
      expect(weather).toBeDefined();
      expect(weather?.description).toContain("weather");
      expect(weather?.input_schema.properties).toHaveProperty("location");
      expect(weather?.input_schema.required).toContain("location");
    });

    test("defines web_fetch tool", () => {
      const webFetchTool = apiModule.tools.find((t) => t.name === "web_fetch");
      expect(webFetchTool).toBeDefined();
      expect(webFetchTool?.description).toContain("Fetch the content");
      expect(webFetchTool?.input_schema.properties).toHaveProperty("url");
      expect(webFetchTool?.input_schema.required).toContain("url");
    });

    test("has exactly 3 tools", () => {
      expect(apiModule.tools).toHaveLength(3);
    });
  });

  describe("performWebSearch", () => {
    test("returns summary when Abstract is present", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              Abstract: "Test summary about the query",
              RelatedTopics: [],
            }),
        })
      ) as typeof fetch;

      const result = await apiModule.performWebSearch("test query");
      expect(result).toContain("Summary: Test summary about the query");
    });

    test("returns related topics", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          json: () =>
            Promise.resolve({
              Abstract: "",
              RelatedTopics: [
                { Text: "First result" },
                { Text: "Second result" },
              ],
            }),
        })
      ) as typeof fetch;

      const result = await apiModule.performWebSearch("test");
      expect(result).toContain("Related results:");
      expect(result).toContain("- First result");
      expect(result).toContain("- Second result");
    });

    test("limits related topics to 5", async () => {
      const topics = Array.from({ length: 10 }, (_, i) => ({
        Text: `Topic ${i + 1}`,
      }));
      globalThis.fetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ Abstract: "", RelatedTopics: topics }),
        })
      ) as typeof fetch;

      const result = await apiModule.performWebSearch("test");
      expect(result).toContain("Topic 5");
      expect(result).not.toContain("Topic 6");
    });

    test("returns no results message when empty", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ Abstract: "", RelatedTopics: [] }),
        })
      ) as typeof fetch;

      const result = await apiModule.performWebSearch("test");
      expect(result).toBe("No results found for this query.");
    });

    test("handles fetch errors", async () => {
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Network error"))
      ) as typeof fetch;

      const result = await apiModule.performWebSearch("test");
      expect(result).toBe("Search failed: Network error");
    });

    test("encodes query parameters", async () => {
      const mockFetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ Abstract: "Result" }),
        })
      ) as typeof fetch;
      globalThis.fetch = mockFetch;

      await apiModule.performWebSearch("hello world");
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("hello%20world")
      );
    });
  });

  describe("getWeather", () => {
    test("returns weather info for valid location", async () => {
      const mockFetch = mock((url: string) => {
        if (url.includes("geocoding-api")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                results: [
                  { latitude: 51.5, longitude: -0.1, name: "London", country: "UK" },
                ],
              }),
          });
        }
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 15,
                apparent_temperature: 14,
                relative_humidity_2m: 80,
                weather_code: 3,
                wind_speed_10m: 10,
              },
            }),
        });
      }) as typeof fetch;
      globalThis.fetch = mockFetch;

      const result = await apiModule.getWeather("London");
      expect(result).toContain("Weather in London, UK:");
      expect(result).toContain("Temperature: 15°C");
      expect(result).toContain("Feels like: 14°C");
      expect(result).toContain("Humidity: 80%");
      expect(result).toContain("Wind speed: 10 km/h");
      expect(result).toContain("Overcast");
    });

    test("returns error for unknown location", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          json: () => Promise.resolve({ results: [] }),
        })
      ) as typeof fetch;

      const result = await apiModule.getWeather("NonexistentPlace12345");
      expect(result).toBe("Could not find location: NonexistentPlace12345");
    });

    test("handles fetch errors", async () => {
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("API unavailable"))
      ) as typeof fetch;

      const result = await apiModule.getWeather("London");
      expect(result).toBe("Weather lookup failed: API unavailable");
    });

    test("handles unknown weather codes", async () => {
      const mockFetch = mock((url: string) => {
        if (url.includes("geocoding-api")) {
          return Promise.resolve({
            json: () =>
              Promise.resolve({
                results: [
                  { latitude: 0, longitude: 0, name: "Test", country: "TC" },
                ],
              }),
          });
        }
        return Promise.resolve({
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 20,
                apparent_temperature: 20,
                relative_humidity_2m: 50,
                weather_code: 999,
                wind_speed_10m: 5,
              },
            }),
        });
      }) as typeof fetch;
      globalThis.fetch = mockFetch;

      const result = await apiModule.getWeather("Test");
      expect(result).toContain("Condition: Unknown");
    });
  });

  describe("webFetch", () => {
    test("returns JSON content formatted", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "application/json" }),
          json: () => Promise.resolve({ key: "value" }),
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://api.example.com/data");
      expect(result).toContain('"key": "value"');
    });

    test("strips HTML tags from HTML content", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: () =>
            Promise.resolve(
              "<html><head><script>alert('test')</script></head><body><p>Hello World</p></body></html>"
            ),
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com");
      expect(result).not.toContain("<script>");
      expect(result).not.toContain("<p>");
      expect(result).toContain("Hello World");
    });

    test("removes style tags from HTML", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "text/html" }),
          text: () =>
            Promise.resolve(
              "<html><style>body { color: red; }</style><body>Content</body></html>"
            ),
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com");
      expect(result).not.toContain("<style>");
      expect(result).not.toContain("color: red");
      expect(result).toContain("Content");
    });

    test("truncates long content to 10000 chars", async () => {
      const longContent = "a".repeat(15000);
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "text/plain" }),
          text: () => Promise.resolve(longContent),
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com/large");
      expect(result.length).toBeLessThanOrEqual(10003); // 10000 + "..."
      expect(result).toEndWith("...");
    });

    test("returns plain text as-is", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: true,
          headers: new Headers({ "content-type": "text/plain" }),
          text: () => Promise.resolve("Plain text content"),
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com/text");
      expect(result).toBe("Plain text content");
    });

    test("returns error for non-OK response", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com/missing");
      expect(result).toBe("Failed to fetch: 404 Not Found");
    });

    test("handles fetch errors", async () => {
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("Connection refused"))
      ) as typeof fetch;

      const result = await apiModule.webFetch("https://example.com");
      expect(result).toBe("Fetch failed: Connection refused");
    });
  });
});
