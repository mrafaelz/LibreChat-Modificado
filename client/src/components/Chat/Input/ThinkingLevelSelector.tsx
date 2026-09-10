import { useCallback } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { EModelEndpoint, ThinkingLevel, tConvoUpdateSchema } from 'librechat-data-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@librechat/client';
import type { TConversation } from 'librechat-data-provider';
import { useChatContext } from '~/Providers';
import { useLocalize } from '~/hooks';

const thinkingLevels = [ThinkingLevel.low, ThinkingLevel.medium, ThinkingLevel.high] as const;

const thinkingLevelLabels = {
  [ThinkingLevel.low]: 'com_ui_low',
  [ThinkingLevel.medium]: 'com_ui_medium',
  [ThinkingLevel.high]: 'com_ui_high',
} as const;

export default function ThinkingLevelSelector() {
  const localize = useLocalize();
  const { conversation, setConversation } = useChatContext();
  const thinkingLevel =
    thinkingLevels.find((level) => level === conversation?.thinkingLevel) ?? ThinkingLevel.medium;

  const setThinkingLevel = useCallback(
    (nextThinkingLevel: (typeof thinkingLevels)[number]) => {
      setConversation(
        (currentConversation) =>
          tConvoUpdateSchema.parse({
            ...currentConversation,
            thinkingLevel: nextThinkingLevel,
          }) as TConversation,
      );
    },
    [setConversation],
  );

  if (conversation?.endpoint !== EModelEndpoint.agents) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={localize('com_endpoint_thinking_level')}
          className="flex h-9 max-w-full items-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary hover:bg-surface-active-alt"
        >
          <Brain className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className="max-w-32 truncate text-left">
            {localize(thinkingLevelLabels[thinkingLevel])}
          </span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup
          value={thinkingLevel}
          onValueChange={(value) => {
            const selectedLevel = thinkingLevels.find((level) => level === value);
            if (selectedLevel != null) {
              setThinkingLevel(selectedLevel);
            }
          }}
        >
          {thinkingLevels.map((level) => (
            <DropdownMenuRadioItem key={level} value={level}>
              {localize(thinkingLevelLabels[level])}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
