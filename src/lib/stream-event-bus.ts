import type { StreamSseMessage } from '@/lib/stream-types';

type Subscriber = (message: StreamSseMessage) => void;

type MatchSubscribers = Map<string, Subscriber>;

type BusState = {
  byMatch: Map<string, MatchSubscribers>;
};

const g = globalThis as typeof globalThis & {
  __poolStreamBus?: BusState;
};

const bus: BusState = g.__poolStreamBus ?? { byMatch: new Map() };
g.__poolStreamBus = bus;

function randomId() {
  return Math.random().toString(36).slice(2);
}

export function subscribeToMatch(matchId: string, subscriber: Subscriber): () => void {
  const subs = bus.byMatch.get(matchId) ?? new Map<string, Subscriber>();
  bus.byMatch.set(matchId, subs);
  const id = randomId();
  subs.set(id, subscriber);

  return () => {
    const target = bus.byMatch.get(matchId);
    if (!target) return;
    target.delete(id);
    if (target.size === 0) {
      bus.byMatch.delete(matchId);
    }
  };
}

export function publishToMatch(matchId: string, message: StreamSseMessage): void {
  const subs = bus.byMatch.get(matchId);
  if (!subs) return;

  subs.forEach((notify) => {
    notify(message);
  });
}
