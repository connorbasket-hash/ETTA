'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavTabs } from '@/components/NavTabs';
import { IconLoader2 } from '@tabler/icons-react';

// Dynamic import for MetricsView to reduce initial bundle size
// Recharts is a heavy dependency that's only needed on this page
const MetricsView = dynamic(
  () => import('@/components/MetricsView').then(mod => ({ default: mod.MetricsView })),
  {
    loading: () => (
      <div className="flex items-center justify-center py-16">
        <IconLoader2 className="w-8 h-8 text-slate-400 animate-spin" />
      </div>
    ),
    ssr: false,
  }
);

export default function MetricsPage() {
  return (
    <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Timekeeper</h1>
        <Link href="/settings" prefetch={true}>
          <Button variant="secondary">Settings</Button>
        </Link>
      </div>

      <NavTabs />

      <MetricsView />
    </div>
  );
}
