import { inspect } from "node:util";

const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";

export const tavilyConfig = {
  apiKey: process.env.TAVILY_API_KEY ?? "",
  baseURL: process.env.TAVILY_BASE_URL ?? DEFAULT_TAVILY_BASE_URL,
};

type TavilySearchTopic = "general" | "news";
type TavilySearchCountry = "china" | "united states";

type TavilySearchArgs = {
  query: string;
  topic?: TavilySearchTopic;
  country?: TavilySearchCountry;
  maxResults?: number;
};

type TavilySearchResult = {
  title: string;
  url: string;
  content?: string;
  score?: number;
  published_date?: string;
};

type TavilySearchResponse = {
  query?: string;
  answer?: string;
  results?: TavilySearchResult[];
  response_time?: number;
};

function summarizeUnknownErrorDetail(value: unknown): string {
  if (!value) {
    return "";
  }

  if (value instanceof Error) {
    const parts = [
      value.name && value.name !== "Error" ? value.name : "",
      value.message,
    ].filter(Boolean);

    const nestedCause = summarizeUnknownErrorDetail(value.cause);

    if (nestedCause) {
      parts.push(`cause: ${nestedCause}`);
    }

    return parts.join(": ");
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    const commonKeys = [
      "code",
      "errno",
      "syscall",
      "hostname",
      "address",
      "port",
      "message",
    ];
    const details = commonKeys.flatMap((key) => {
      const detail = record[key];

      return detail === undefined ? [] : [`${key}=${String(detail)}`];
    });

    if (details.length > 0) {
      return details.join(", ");
    }

    return inspect(value, {
      breakLength: Infinity,
      depth: 1,
      maxArrayLength: 10,
    }).slice(0, 300);
  }

  return String(value);
}

export async function searchTavily({
  query,
  topic = "general",
  country = "china",
  maxResults = 8,
}: TavilySearchArgs) {
  if (!tavilyConfig.apiKey) {
    throw new Error(
      "TAVILY_API_KEY is empty. Add it to your local environment before using web search."
    );
  }

  const endpoint = `${tavilyConfig.baseURL}/search`;
  let response: Response;

  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tavilyConfig.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        query,
        topic,
        search_depth: "advanced",
        include_answer: true,
        include_raw_content: false,
        include_images: false,
        max_results: maxResults,
        ...(topic === "general" ? { country } : {}),
      }),
    });
  } catch (error) {
    const detail = summarizeUnknownErrorDetail(error);

    throw new Error(
      `Tavily request to ${endpoint} failed${
        detail ? `: ${detail.slice(0, 400)}` : "."
      }`,
      {
        cause: error instanceof Error ? error : undefined,
      }
    );
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `Tavily search failed with status ${response.status}: ${detail.slice(0, 300)}`
    );
  }

  const payload = (await response.json()) as TavilySearchResponse;

  return {
    query: payload.query ?? query,
    answer: payload.answer ?? "",
    responseTime: payload.response_time ?? null,
    results: (payload.results ?? []).map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content ?? "",
      score: result.score ?? null,
      publishedDate: result.published_date ?? null,
    })),
  };
}
