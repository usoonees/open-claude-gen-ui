import { ChatShell } from "@/components/chat-shell";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ChatShell initialChatId={id} />;
}
