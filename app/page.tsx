import { redirect } from "next/navigation";
import { ChatShell } from "@/components/chat-shell";
import { isShowcaseOnlyEnabled } from "@/lib/showcase-mode";
import { getDefaultExampleChatId } from "@/lib/example-chats";

export default function Page() {
  if (isShowcaseOnlyEnabled()) {
    const defaultExampleChatId = getDefaultExampleChatId();

    if (defaultExampleChatId) {
      redirect(`/chat/${defaultExampleChatId}`);
    }
  }

  return <ChatShell />;
}
