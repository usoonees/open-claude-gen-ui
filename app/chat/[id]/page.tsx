import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat-shell";
import { isShowcaseOnlyEnabled } from "@/lib/showcase-mode";
import {
  getDefaultExampleChatId,
  getExampleChatById,
} from "@/lib/example-chats";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (isShowcaseOnlyEnabled()) {
    if (!getExampleChatById(id)) {
      const defaultExampleChatId = getDefaultExampleChatId();

      if (defaultExampleChatId) {
        redirect(`/chat/${defaultExampleChatId}`);
      }

      redirect("/");
    }

    return <ChatShell initialChatId={id} readOnly />;
  }

  return <ChatShell initialChatId={id} />;
}
