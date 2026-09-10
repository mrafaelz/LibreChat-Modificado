import { useEffect, memo } from 'react';
import TagManager from 'react-gtm-module';
import type { TStartupConfig } from 'librechat-data-provider';
import { useGetStartupConfig } from '~/data-provider';

type FooterProps = {
  className?: string;
  startupConfig?: FooterStartupConfig | null;
};

type FooterStartupConfig = Pick<Partial<TStartupConfig>, 'analyticsGtmId'>;

function Footer({ startupConfig }: FooterProps) {
  const shouldFetchConfig = startupConfig === undefined;
  const { data: fetchedConfig } = useGetStartupConfig({ enabled: shouldFetchConfig });
  const config = shouldFetchConfig ? fetchedConfig : startupConfig;

  useEffect(() => {
    if (config?.analyticsGtmId != null && typeof window.google_tag_manager === 'undefined') {
      const tagManagerArgs = {
        gtmId: config.analyticsGtmId,
      };
      TagManager.initialize(tagManagerArgs);
    }
  }, [config?.analyticsGtmId]);

  return null;
}

const MemoizedFooter = memo(Footer);
MemoizedFooter.displayName = 'Footer';

export default MemoizedFooter;
