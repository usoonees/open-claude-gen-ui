import { getRandomStarterPromptRecommendations } from "@/lib/starter-prompts";
import { isShowcaseOnlyEnabled } from "@/lib/showcase-mode";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isShowcaseOnlyEnabled()) {
    return Response.json(
      {
        prompts: [],
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  }

  return Response.json(
    {
      prompts: getRandomStarterPromptRecommendations(),
    },
    {
      headers: {
        "cache-control": "no-store",
      },
    }
  );
}
