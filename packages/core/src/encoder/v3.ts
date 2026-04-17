/**
 * Asciicast v3 encoder.
 *
 * v3 format: NDJSON where the first line is the header and subsequent lines
 * are events. Timestamps in v3 are DELTA times (seconds since previous event),
 * unlike v2 which uses absolute times.
 *
 * Spec reference: https://docs.asciinema.org/manual/asciicast/v3/
 */

import type { CastEvent, CastHeader, CompiledCast } from '../compiler/types.js';

export function encodeV3(cast: CompiledCast): string {
  const lines: string[] = [];

  // Header
  lines.push(serializeHeader(cast.header, 3));

  // Events — convert absolute times to deltas
  let prevTime = 0;
  for (const event of cast.events) {
    const delta = Math.max(0, event.time - prevTime);
    prevTime = event.time;
    lines.push(serializeEvent(delta, event));
  }

  return lines.join('\n') + '\n';
}

function serializeHeader(header: CastHeader, version: 2 | 3): string {
  // v3 nests dimensions and theme inside a "term" object
  const term: Record<string, unknown> = {
    cols: header.cols,
    rows: header.rows,
  };

  if (header.theme !== undefined) term['theme'] = header.theme;

  const obj: Record<string, unknown> = {
    version,
    term,
  };

  if (header.title !== undefined) obj['title'] = header.title;
  if (header.timestamp !== undefined) obj['timestamp'] = header.timestamp;
  if (header.idleTimeLimit !== undefined) obj['idle_time_limit'] = header.idleTimeLimit;
  if (header.env !== undefined) obj['env'] = header.env;

  return JSON.stringify(obj);
}

function serializeEvent(deltaSeconds: number, event: CastEvent): string {
  const time = parseFloat(deltaSeconds.toFixed(6));
  return JSON.stringify([time, event.code, event.data]);
}
