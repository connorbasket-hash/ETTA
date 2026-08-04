'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

interface ExportData {
  projects: { name: string; keywords: string[] }[];
  taskTypes: { name: string; keywords: string[] }[];
}

export default function ExportPage() {
  const [data, setData] = useState<ExportData | null>(null);

  useEffect(() => {
    fetch('/api/export')
      .then((res) => res.json())
      .then(setData);
  }, []);

  function handleDownload() {
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'keyword-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Export Rules</h1>
        <Link href="/">
          <Button variant="outline">Back</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>JSON Preview</CardTitle>
            <Button onClick={handleDownload} disabled={!data}>
              Download JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded overflow-auto max-h-[600px] text-sm">
            {data ? JSON.stringify(data, null, 2) : 'Loading...'}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
