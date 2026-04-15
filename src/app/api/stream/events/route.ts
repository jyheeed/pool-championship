import { NextRequest } from 'next/server';
import { subscribeToMatch } from '@/lib/stream-event-bus';
import { getOverlayState } from '@/lib/stream-state-service';
import type { StreamSseMessage } from '@/lib/stream-types';

export const runtime = 'nodejs';

function encodeSse(data: StreamSseMessage): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId')?.trim();
  if (!matchId) {
    return new Response('matchId is required', { status: 400 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (message: StreamSseMessage) => {
        controller.enqueue(encoder.encode(encodeSse(message)));
      };

      try {
        const state = await getOverlayState(matchId);
        send({ type: 'match_state_updated', state });
      } catch {
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }

      const unsubscribe = subscribeToMatch(matchId, send);
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: new Date().toISOString() });
      }, 5000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
