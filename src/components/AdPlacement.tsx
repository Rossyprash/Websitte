import { useEffect } from 'react';
import { useApp } from '../contexts/AppContext.tsx';

interface AdPlacementProps {
  placement: 'home' | 'category' | 'listing' | 'storyDetail';
  isEligible?: boolean;
  hasContentWarning?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

export function AdPlacement({
  placement,
  isEligible = true,
  hasContentWarning = false,
}: AdPlacementProps) {
  const { adConfig } = useApp();

  const slotId =
    placement === 'home'
      ? adConfig.homeSlotId
      : placement === 'category'
        ? adConfig.categorySlotId
        : placement === 'listing'
          ? adConfig.listingSlotId
          : adConfig.storyDetailSlotId;

  const blockedByPolicy =
    !isEligible || (adConfig.excludeContentWarned && hasContentWarning);

  const shouldRender =
    adConfig.adsenseEnabled && Boolean(adConfig.publisherId) && !blockedByPolicy;

  useEffect(() => {
    if (!shouldRender || !adConfig.publisherId) return;

    const existingScript = document.querySelector(
      `script[data-adsense-client="${adConfig.publisherId}"]`
    );
    if (!existingScript) {
      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
        adConfig.publisherId
      )}`;
      script.crossOrigin = 'anonymous';
      script.setAttribute('data-adsense-client', adConfig.publisherId);
      document.head.appendChild(script);
    }

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ignore until AdSense script finishes loading
    }
  }, [shouldRender, adConfig.publisherId, slotId]);

  if (!shouldRender) {
    return null;
  }

  return (
    <aside
      aria-label="Sponsored message"
      className="my-10 border-y border-[#D7E3EC] py-6 dark:border-[#24303D]"
    >
      <p className="mb-3 text-center text-xs tracking-wider text-[#54657A] uppercase dark:text-[#A9BACB]">
        Advertisement
      </p>
      <div className="ios-liquid-glass mx-auto max-w-3xl overflow-hidden rounded-3xl p-2 text-center">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client={adConfig.publisherId}
          data-ad-slot={slotId || undefined}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </aside>
  );
}
