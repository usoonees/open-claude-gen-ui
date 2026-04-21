import { getRandomStarterPromptRecommendations } from "@/lib/starter-prompts";

export const dynamic = "force-dynamic";

export async function GET() {
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
