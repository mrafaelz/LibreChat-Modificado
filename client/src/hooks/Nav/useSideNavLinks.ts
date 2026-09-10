import { useMemo } from 'react';
import { OpenAIMinimalIcon } from '@librechat/client';
import {
  Bot,
  Bookmark,
  NotebookPen,
  CalendarClock,
  ArrowRightToLine,
  SlidersHorizontal,
} from 'lucide-react';
import {
  Permissions,
  EModelEndpoint,
  PermissionTypes,
  isParamEndpoint,
  isAgentsEndpoint,
  isAssistantsEndpoint,
} from 'librechat-data-provider';
import type { TInterfaceConfig, TEndpointsConfig } from 'librechat-data-provider';
import type { NavLink } from '~/common';
import AgentPanelSwitch from '~/components/SidePanel/Agents/AgentPanelSwitch';
import BookmarkPanel from '~/components/SidePanel/Bookmarks/BookmarkPanel';
import PanelSwitch from '~/components/SidePanel/Builder/PanelSwitch';
import { SchedulePanel } from '~/components/SidePanel/Schedules';
import Parameters from '~/components/SidePanel/Parameters/Panel';
import { PromptsAccordion } from '~/components/Prompts';
import { useHasAccess } from '~/hooks';

export default function useSideNavLinks({
  hidePanel,
  keyProvided,
  endpoint,
  endpointType,
  interfaceConfig,
  endpointsConfig,
  includeHidePanel = true,
}: {
  hidePanel?: () => void;
  keyProvided: boolean;
  endpoint?: EModelEndpoint | null;
  endpointType?: EModelEndpoint | null;
  interfaceConfig: Partial<TInterfaceConfig>;
  endpointsConfig: TEndpointsConfig;
  includeHidePanel?: boolean;
}) {
  const hasAccessToPrompts = useHasAccess({
    permissionType: PermissionTypes.PROMPTS,
    permission: Permissions.USE,
  });
  const hasAccessToBookmarks = useHasAccess({
    permissionType: PermissionTypes.BOOKMARKS,
    permission: Permissions.USE,
  });
  const hasAccessToAgents = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.USE,
  });
  const hasAccessToCreateAgents = useHasAccess({
    permissionType: PermissionTypes.AGENTS,
    permission: Permissions.CREATE,
  });
  const hasAccessToSchedules = useHasAccess({
    permissionType: PermissionTypes.SCHEDULES,
    permission: Permissions.USE,
  });
  const Links = useMemo(() => {
    const links: NavLink[] = [];

    if (
      endpointsConfig?.[EModelEndpoint.agents] &&
      hasAccessToAgents &&
      hasAccessToCreateAgents &&
      endpointsConfig[EModelEndpoint.agents].disableBuilder !== true
    ) {
      links.push({
        title: 'com_sidepanel_agent_builder',
        label: '',
        icon: Bot,
        id: EModelEndpoint.agents,
        Component: AgentPanelSwitch,
      });
    }

    if (
      isAssistantsEndpoint(endpoint) &&
      ((endpoint === EModelEndpoint.assistants &&
        endpointsConfig?.[EModelEndpoint.assistants] &&
        endpointsConfig[EModelEndpoint.assistants].disableBuilder !== true) ||
        (endpoint === EModelEndpoint.azureAssistants &&
          endpointsConfig?.[EModelEndpoint.azureAssistants] &&
          endpointsConfig[EModelEndpoint.azureAssistants].disableBuilder !== true)) &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_assistant_builder',
        label: '',
        icon: OpenAIMinimalIcon,
        id: EModelEndpoint.assistants,
        Component: PanelSwitch,
      });
    }

    // Scheduled chats are EXPERIMENTAL and default-OFF: the server enables them only
    // when an admin opts in explicitly, so ABSENT config means disabled here too.
    // Mirrors getLimits exactly — absent/null/`false` are all off, `true` is on, and the
    // object form is on unless it sets `use: false`. Any mismatch would show an entry
    // whose create/run operations the backend rejects.
    const schedulesConfig = interfaceConfig.schedules;
    const schedulesEnabled =
      schedulesConfig != null &&
      schedulesConfig !== false &&
      !(typeof schedulesConfig === 'object' && schedulesConfig.use === false);
    if (hasAccessToSchedules && schedulesEnabled) {
      links.push({
        title: 'com_ui_schedules',
        label: '',
        icon: CalendarClock,
        id: 'schedules',
        Component: SchedulePanel,
      });
    }

    if (hasAccessToPrompts) {
      links.push({
        title: 'com_ui_prompts',
        label: '',
        icon: NotebookPen,
        id: 'prompts',
        Component: PromptsAccordion,
      });
    }

    if (hasAccessToBookmarks) {
      links.push({
        title: 'com_sidepanel_conversation_tags',
        label: '',
        icon: Bookmark,
        id: 'bookmarks',
        Component: BookmarkPanel,
      });
    }

    if (
      interfaceConfig.parameters === true &&
      isParamEndpoint(endpoint ?? '', endpointType ?? '') === true &&
      !isAgentsEndpoint(endpoint) &&
      keyProvided
    ) {
      links.push({
        title: 'com_sidepanel_parameters',
        label: '',
        icon: SlidersHorizontal,
        id: 'parameters',
        Component: Parameters,
      });
    }

    if (includeHidePanel && hidePanel) {
      links.push({
        title: 'com_sidepanel_hide_panel',
        label: '',
        icon: ArrowRightToLine,
        onClick: hidePanel,
        id: 'hide-panel',
      });
    }

    return links;
  }, [
    endpoint,
    endpointsConfig,
    keyProvided,
    hasAccessToAgents,
    hasAccessToCreateAgents,
    hasAccessToPrompts,
    hasAccessToSchedules,
    interfaceConfig.schedules,
    interfaceConfig.parameters,
    endpointType,
    hasAccessToBookmarks,
    includeHidePanel,
    hidePanel,
  ]);

  return Links;
}
