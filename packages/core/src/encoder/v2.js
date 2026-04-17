/**
 * Asciicast v2 encoder.
 *
 * v2 format: NDJSON where the first line is the header and subsequent lines
 * are events. Timestamps in v2 are ABSOLUTE seconds from recording start
 * (unlike v3 which uses deltas).
 *
 * Spec reference: https://docs.asciinema.org/manual/asciicast/v2/
 */
export function encodeV2(cast) {
    const lines = [];
    // Header
    lines.push(serializeHeader(cast.header));
    // Events — absolute times (already absolute in our internal model)
    for (const event of cast.events) {
        lines.push(serializeEvent(event));
    }
    return lines.join('\n') + '\n';
}
function serializeHeader(header) {
    const obj = {
        version: 2,
        width: header.cols,
        height: header.rows,
    };
    if (header.title !== undefined)
        obj['title'] = header.title;
    if (header.timestamp !== undefined)
        obj['timestamp'] = header.timestamp;
    if (header.idleTimeLimit !== undefined)
        obj['idle_time_limit'] = header.idleTimeLimit;
    if (header.env !== undefined)
        obj['env'] = header.env;
    if (header.theme !== undefined)
        obj['theme'] = header.theme;
    return JSON.stringify(obj);
}
function serializeEvent(event) {
    const time = parseFloat(event.time.toFixed(6));
    return JSON.stringify([time, event.code, event.data]);
}
//# sourceMappingURL=v2.js.map