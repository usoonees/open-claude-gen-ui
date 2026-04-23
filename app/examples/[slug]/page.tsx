import { notFound } from "next/navigation";
import { ExampleChatViewer } from "@/components/example-chat-viewer";
import { getExampleChat, listExampleChats } from "@/lib/example-chats";
import { isShowcaseOnlyEnabled } from "@/lib/showcase-mode";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return listExampleChats().map((example) => ({
    slug: example.slug,
  }));
}

export default async function ExampleChatPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const example = getExampleChat(slug);
  const showcaseOnlyEnabled = isShowcaseOnlyEnabled();

  if (!example) {
    notFound();
  }

  return (
    <ExampleChatViewer
      description={example.description}
      messages={example.messages}
      showOpenChatAppLink={!showcaseOnlyEnabled}
      title={example.title}
      updatedAt={example.updatedAt}
    />
  );
}
