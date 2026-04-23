import Link from "next/link";
import { listExampleChats } from "@/lib/example-chats";
import { isShowcaseOnlyEnabled } from "@/lib/showcase-mode";

export const dynamic = "force-static";

export default function ExamplesPage() {
  const examples = listExampleChats();
  const showcaseOnlyEnabled = isShowcaseOnlyEnabled();

  return (
    <main className="example-index-page">
      <div className="example-index-inner">
        <div className="example-index-header">
          <span className="example-index-kicker">Static showcase</span>
          <h1>Read-only example chats</h1>
          <p>
            These pages are exported from saved chat traces and rendered without the
            live chat transport, sidebar state, or composer.
          </p>
          {!showcaseOnlyEnabled ? (
            <div className="example-index-actions">
              <Link className="example-back-link" href="/">
                Open chat app
              </Link>
            </div>
          ) : null}
        </div>

        <div className="example-card-grid">
          {examples.map((example) => (
            <Link className="example-card" href={`/examples/${example.slug}`} key={example.slug}>
              <div className="example-card-header">
                <h2>{example.title}</h2>
                <span>{example.slug}</span>
              </div>
              <p>{example.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
