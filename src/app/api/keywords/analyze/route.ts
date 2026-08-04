import { getSources, getSourcesInDateRange, upsertKeyword, clearKeywords } from '@/lib/db';
import { analyzeTexts } from '@/lib/analysis';

export async function POST(request: Request) {
  const { scope = 'both', minFrequency = 2, clearExisting = false, startDate, endDate } = await request.json();

  // For 'subjects' scope, use 'subject' source_type; for 'bodies' use 'body'
  const storageType: 'subject' | 'body' | 'both' = scope === 'subjects' ? 'subject' : scope === 'bodies' ? 'body' : 'both';

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (clearExisting) {
          sendEvent({ type: 'progress', stage: 'clearing', message: `Clearing existing ${storageType} keywords...` });
          clearKeywords(storageType);
        }

        sendEvent({ type: 'progress', stage: 'loading', message: 'Loading sources...' });
        const sources = (startDate && endDate
          ? getSourcesInDateRange({ startDate, endDate })
          : getSources()) as { subject: string; body: string }[];

        if (sources.length === 0) {
          sendEvent({ type: 'error', error: 'No sources to analyze. Import data first.' });
          controller.close();
          return;
        }

        sendEvent({ type: 'progress', stage: 'analyzing', message: `Analyzing ${sources.length} sources...` });
        const frequencies = analyzeTexts(sources, scope);

        const validKeywords = Array.from(frequencies.entries()).filter(([, freq]) => freq >= minFrequency);
        const total = validKeywords.length;

        sendEvent({
          type: 'progress',
          stage: 'saving',
          message: `Saving ${total} keywords...`,
          total,
          processed: 0
        });

        let created = 0;
        let updated = 0;
        let processed = 0;

        for (const [word, freq] of validKeywords) {
          const result = upsertKeyword(word, freq, storageType);
          if (result.changes > 0) {
            updated++;
          } else {
            created++;
          }
          processed++;

          // Send progress every 50 keywords
          if (processed % 50 === 0 || processed === total) {
            sendEvent({
              type: 'progress',
              stage: 'saving',
              message: `Saving keywords...`,
              total,
              processed,
              created,
              updated
            });
          }
        }

        sendEvent({
          type: 'complete',
          success: true,
          created,
          updated,
          total: created + updated,
          sourceType: storageType
        });
      } catch (error) {
        sendEvent({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
