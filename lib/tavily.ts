const DEFAULT_TAVILY_BASE_URL = "https://api.tavily.com";

export const tavilyConfig = {
  apiKey: process.env.TAVILY_API_KEY ?? "",
  baseURL: process.env.TAVILY_BASE_URL ?? DEFAULT_TAVILY_BASE_URL,
};

type TavilySearchTopic = "general" | "news";

type TavilySearchArgs = {
  query: string;
  topic?: TavilySearchTopic;
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

export async function searchTavily({
  query,
  topic = "general",
  maxResults = 8,
}: TavilySearchArgs) {
  if (!tavilyConfig.apiKey) {
    throw new Error(
      "TAVILY_API_KEY is empty. Add it to your local environment before using web search."
    );
  }

  const response = await fetch(`${tavilyConfig.baseURL}/search`, {
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
    }),
  });

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
