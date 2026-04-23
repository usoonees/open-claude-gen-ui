export function isShowcaseOnlyEnabled() {
  return process.env.SHOWCASE_ONLY === "true";
}

export function showcaseOnlyNotFoundResponse() {
  return new Response("Not found.", { status: 404 });
}

export function showcaseReadOnlyResponse() {
  return new Response("Showcase deployment is read-only.", { status: 405 });
}
