import { useEffect, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { Bot, ChevronDown } from 'lucide-react';
import { EModelEndpoint, PermissionBits } from 'librechat-data-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@librechat/client';
import { useLocalize, useSelectAgent } from '~/hooks';
import { useListAgentsQuery } from '~/data-provider';
import store from '~/store';

export default function AgentSelector() {
  const localize = useLocalize();
  const conversation = useRecoilValue(store.conversationByIndex(0));
  const { onSelect: onSelectAgent } = useSelectAgent();
  const { data: agentResponse } = useListAgentsQuery({
    requiredPermission: PermissionBits.VIEW,
  });
  const agents = agentResponse?.data;
  const selectedAgentId =
    conversation?.endpoint === EModelEndpoint.agents ? (conversation.agent_id ?? '') : '';
  const defaultAgent = useMemo(
    () => agents?.find((agent) => agent.id === 'agent_01') ?? agents?.[0],
    [agents],
  );
  const activeAgent = agents?.find((agent) => agent.id === selectedAgentId) ?? defaultAgent;

  useEffect(() => {
    if (selectedAgentId || defaultAgent == null) {
      return;
    }
    void onSelectAgent(defaultAgent.id);
  }, [defaultAgent, onSelectAgent, selectedAgentId]);

  if (activeAgent == null) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={localize('com_agents_all')}
          className="flex h-9 max-w-full items-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary hover:bg-surface-active-alt"
        >
          <Bot className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
          <span className="max-w-32 truncate text-left">{activeAgent.name || activeAgent.id}</span>
          <ChevronDown className="size-4 shrink-0 text-text-secondary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuRadioGroup
          value={activeAgent.id}
          onValueChange={(agentId) => void onSelectAgent(agentId)}
        >
          {agents?.map((agent) => (
            <DropdownMenuRadioItem key={agent.id} value={agent.id}>
              {agent.name || agent.id}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
