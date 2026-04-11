'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react';
import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function PostHogPageView() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const ph          = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    const qs  = searchParams?.toString();
    const url = window.location.origin + pathname + (qs ? `?${qs}` : '');
    ph.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
    if (!key) return;

    posthog.init(key, {
      api_host:        host,
      person_profiles: 'identified_only', // No inflar eventos con anónimos
      capture_pageview: false,            // Lo hacemos manualmente arriba
      capture_pageleave: true,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      {/* Suspense requerido por useSearchParams en App Router */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
