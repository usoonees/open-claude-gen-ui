import type { ChatUIMessage } from "@/lib/chat-message";

const generativeUIUserTurnReminder =
  "<system-reminder>Generative UI mode is enabled. Unless the user is only saying hello, strongly prefer using visualizeReadMe and showWidget whenever they would improve the answer.</system-reminder>";

const escapedGenerativeUIUserTurnReminder = generativeUIUserTurnReminder.replace(
  /[.*+?^${}()|[\]\\]/g,
  "\\$&"
);
const appendedGenerativeUIUserTurnReminderPattern = new RegExp(
  `(?:\\n\\s*)*${escapedGenerativeUIUserTurnReminder}\\s*$`
);

function withAppendedReminder(message: ChatUIMessage) {
  const textPartIndex = [...message.parts]
    .reverse()
    .findIndex((part) => part.type === "text");

  if (textPartIndex < 0) {
    return {
      ...message,
      parts: [
        ...message.parts,
        {
          type: "text" as const,
          text: generativeUIUserTurnReminder,
        },
      ],
    };
  }

  const actualIndex = message.parts.length - 1 - textPartIndex;
  const targetPart = message.parts[actualIndex];

  if (targetPart.type !== "text") {
    return message;
  }

  const nextParts = message.parts.slice();
  nextParts[actualIndex] = {
    ...targetPart,
    text: `${targetPart.text}\n\n${generativeUIUserTurnReminder}`,
  };

  return {
    ...message,
    parts: nextParts,
  };
}

export function applyHiddenGenerativeUIReminder(
  messages: ChatUIMessage[],
  enabled: boolean
) {
  if (!enabled || messages.length === 0) {
    return messages;
  }

  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.role !== "user") {
    return messages;
  }

  return [...messages.slice(0, -1), withAppendedReminder(lastMessage)];
}

export function stripHiddenGenerativeUIReminderFromText(text: string) {
  let sanitized = text;

  while (appendedGenerativeUIUserTurnReminderPattern.test(sanitized)) {
    sanitized = sanitized.replace(appendedGenerativeUIUserTurnReminderPattern, "");
  }

  return sanitized;
}

export function stripHiddenGenerativeUIReminders(messages: ChatUIMessage[]) {
  return messages.map((message) => {
    let changed = false;
    const nextParts = message.parts.map((part) => {
      if (part.type !== "text") {
        return part;
      }

      const text = stripHiddenGenerativeUIReminderFromText(part.text);

      if (text === part.text) {
        return part;
      }

      changed = true;

      return {
        ...part,
        text,
      };
    });

    if (!changed) {
      return message;
    }

    return {
      ...message,
      parts: nextParts,
    };
  });
}
