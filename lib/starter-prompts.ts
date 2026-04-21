export const starterPromptRecommendations = [
  "Build an interactive explainer for how attention scores move through a transformer",
  "Show a draggable system diagram for an AI coding agent loop with tools and memory",
  "Compare Next.js, Remix, and SvelteKit in a visual decision matrix",
  "Create a compact timeline of recent AI model launches with filters by lab",
  "Design a mortgage payoff calculator with sliders, payoff dates, and interest saved",
  "Map the tradeoffs between RAG, fine-tuning, and prompt engineering as a visual guide",
  "Make an interactive incident response flowchart for debugging a production outage",
  "Visualize a startup runway planner with burn-rate sliders and hiring scenarios",
  "Create a side-by-side pricing calculator for cloud GPU inference options",
  "Show how a database query travels through cache, API, queue, and workers",
  "Build a visual lesson on CPU scheduling with draggable process blocks",
  "Compare three product launch plans as a weighted scoring dashboard",
  "Create an interactive roadmap for learning full-stack TypeScript",
  "Visualize a Kubernetes deployment rollout with pods, health checks, and rollback states",
];

const DEFAULT_RECOMMENDATION_COUNT = 4;

function shufflePrompts(prompts: string[]) {
  const shuffled = [...prompts];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function getRandomStarterPromptRecommendations(
  count = DEFAULT_RECOMMENDATION_COUNT
) {
  return shufflePrompts(starterPromptRecommendations).slice(0, count);
}
