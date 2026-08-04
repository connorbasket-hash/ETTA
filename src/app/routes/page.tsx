'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { NavTabs } from '@/components/NavTabs';
import { RoutesManager } from '@/components/RoutesManager';
import { useSharedData } from '@/lib/data-context';

export default function RoutesPage() {
  const { projects, taskTypes } = useSharedData();

  return (
    <div className="container mx-auto p-8 lg:p-12 max-w-7xl">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Timekeeper</h1>
        <Link href="/settings" prefetch={true}>
          <Button variant="secondary">Settings</Button>
        </Link>
      </div>

      <NavTabs />

      <RoutesManager projects={projects} taskTypes={taskTypes} />
    </div>
  );
}
