import { inspect } from "node:util";
import { getTavilyRuntimeConfig } from "@/lib/tavily-settings";

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

const tavilyRetryDelaysMs = [300, 1200] as const;
const tavilyRetryableStatusCodes = new Set([408, 429, 500, 502, 503, 504]);

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

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isRetryableTransportError(error: unknown) {
  const detail = summarizeUnknownErrorDetail(error).toLowerCase();

  return [
    "connecttimeouterror",
    "headers time out",
    "body timeout",
    "fetch failed",
    "socketerror",
    "etimedout",
    "econnreset",
    "econnrefused",
    "ehostunreach",
    "enetunreach",
    "eai_again",
    "und_err_connect_timeout",
    "und_err_headers_timeout",
    "und_err_body_timeout",
  ].some((token) => detail.includes(token));
}

function formatTransportFailureMessage(
  endpoint: string,
  error: unknown,
  attemptCount: number
) {
  const detail = summarizeUnknownErrorDetail(error);
  const attemptsSuffix = attemptCount > 1 ? ` after ${attemptCount} attempts` : "";

  return `Tavily request to ${endpoint} failed${attemptsSuffix}${
    detail ? `: ${detail.slice(0, 400)}` : "."
  }`;
}

export async function searchTavily({
  query,
  topic = "general",
  country = "china",
  maxResults = 8,
}: TavilySearchArgs) {
  const tavilyConfig = getTavilyRuntimeConfig();

  if (!tavilyConfig.apiKey) {
    throw new Error(
      "No Tavily API key is configured. Save one in Settings or set TAVILY_API_KEY in .env.local before using web search."
    );
  }

  const endpoint = `${tavilyConfig.baseURL}/search`;
  let lastError: unknown = null;
  let lastStatus: number | null = null;
  let lastStatusDetail = "";

  for (let attempt = 0; attempt <= tavilyRetryDelaysMs.length; attempt += 1) {
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
      lastError = error;

      if (
        attempt < tavilyRetryDelaysMs.length &&
        isRetryableTransportError(error)
      ) {
        await sleep(tavilyRetryDelaysMs[attempt]);
        continue;
      }

      throw new Error(formatTransportFailureMessage(endpoint, error, attempt + 1), {
        cause: error instanceof Error ? error : undefined,
      });
    }

    if (!response.ok) {
      const detail = await response.text();
      lastStatus = response.status;
      lastStatusDetail = detail;

      if (
        attempt < tavilyRetryDelaysMs.length &&
        tavilyRetryableStatusCodes.has(response.status)
      ) {
        await sleep(tavilyRetryDelaysMs[attempt]);
        continue;
      }

      const attemptsSuffix = attempt > 0 ? ` after ${attempt + 1} attempts` : "";
      throw new Error(
        `Tavily search failed with status ${response.status}${attemptsSuffix}: ${detail.slice(0, 300)}`
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

  if (lastError) {
    throw new Error(
      formatTransportFailureMessage(endpoint, lastError, tavilyRetryDelaysMs.length + 1),
      {
        cause: lastError instanceof Error ? lastError : undefined,
      }
    );
  }

  throw new Error(
    `Tavily search failed with status ${lastStatus ?? 500} after ${
      tavilyRetryDelaysMs.length + 1
    } attempts: ${lastStatusDetail.slice(0, 300)}`
  );
}
