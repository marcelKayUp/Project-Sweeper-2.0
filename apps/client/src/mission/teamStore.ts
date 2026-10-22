export interface FeedEvent {
  readonly id: number;
}

export interface TeamBatch {
  readonly fromId: number;
  readonly toId: number;
  readonly targetRevision: number;
  readonly events: readonly FeedEvent[];
}

export interface TeamSnapshot {
  readonly revision: number;
  readonly lastEventId: number;
  readonly ownRunnerId: string;
  readonly units: readonly { readonly id: string; readonly hp: number }[];
}

export interface TeamFeed {
  readonly revision: number;
  readonly lastEventId: number;
  readonly ownRunnerId: string;
  readonly units: readonly { readonly id: string; readonly hp: number }[];
  readonly gap: boolean;
  readonly animations: readonly FeedEvent[];
}

export function createTeamFeed(): TeamFeed {
  return { revision: 0, lastEventId: 0, ownRunnerId: "", units: [], gap: false, animations: [] };
}

export function takeSnapshot(feed: TeamFeed, snapshot: TeamSnapshot): TeamFeed {
  return {
    revision: snapshot.revision,
    lastEventId: snapshot.lastEventId,
    ownRunnerId: snapshot.ownRunnerId,
    units: snapshot.units,
    gap: false,
    animations: [],
  };
}

export function takeBatch(feed: TeamFeed, batch: TeamBatch): TeamFeed {
  if (batch.events.length === 0) return feed;
  if (batch.fromId > feed.lastEventId + 1) return { ...feed, gap: true, animations: [] };
  const fresh = batch.events.filter((event) => event.id > feed.lastEventId);
  const first = fresh[0];
  if (!first) return feed;
  if (first.id !== feed.lastEventId + 1) return { ...feed, gap: true, animations: [] };
  for (let index = 1; index < fresh.length; index += 1) {
    const current = fresh[index];
    const previous = fresh[index - 1];
    if (!current || !previous || current.id !== previous.id + 1) return { ...feed, gap: true, animations: [] };
  }
  const last = fresh[fresh.length - 1];
  if (!last) return feed;
  return {
    ...feed,
    revision: batch.targetRevision,
    lastEventId: last.id,
    gap: false,
    animations: [...feed.animations, ...fresh],
    units: feed.units,
  };
}
