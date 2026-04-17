/**
 * Compiler — converts a ParseResult into a CompiledCast.
 * Phase 1: full implementation of all directives including file-output,
 * include/blocks, full set key support, and styled prompt rendering.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { CLEAR_SCREEN, CRLF, RESET, modifiersToAnsi } from '../util/ansi.js';
import { TimingEngine } from './timing.js';
import { parse, parseStyledText } from '../parser/parser.js';
// ── Public API ────────────────────────────────────────────────────────────────
export function compile(config, nodes, sourceDir = process.cwd()) {
    const header = buildHeader(config);
    const events = [];
    const engine = new TimingEngine(config.typingSpeed, config.typingSeed);
    // Mutable compile-time config (mid-script `set` directives mutate this copy)
    const liveConfig = { ...config, env: { ...config.env } };
    compileNodes(nodes, events, engine, liveConfig, sourceDir);
    // Emit reset at end to restore terminal state
    events.push({ time: engine.seconds, code: 'o', data: RESET });
    return { header, events };
}
// ── Internal node compiler ────────────────────────────────────────────────────
function compileNodes(nodes, events, engine, config, sourceDir, isFirstBlock = { value: true }) {
    for (const node of nodes) {
        switch (node.kind) {
            case 'comment':
            case 'block-label':
                break;
            case 'marker':
                events.push({ time: engine.seconds, code: 'm', data: node.label });
                break;
            case 'wait':
                engine.advance(node.ms);
                break;
            case 'clear':
                events.push({ time: engine.seconds, code: 'o', data: CLEAR_SCREEN });
                break;
            case 'resize':
                events.push({ time: engine.seconds, code: 'r', data: `${node.cols}x${node.rows}` });
                break;
            case 'raw':
                events.push({ time: engine.seconds, code: 'o', data: unescapeRaw(node.ansi) });
                break;
            case 'command': {
                // Insert idle gap between command blocks (skip before the very first)
                if (!isFirstBlock.value) {
                    engine.advance(config.idleTime * 1000);
                }
                isFirstBlock.value = false;
                // Render prompt (supports inline style tags)
                const promptText = parseStyledText(config.prompt);
                const promptData = renderStyledText(promptText);
                events.push({ time: engine.seconds, code: 'o', data: promptData });
                // Type each character of the command with realistic jitter
                for (const ch of node.text) {
                    engine.typeChar();
                    events.push({ time: engine.seconds, code: 'o', data: ch });
                }
                // Press Enter
                engine.typeChar();
                events.push({ time: engine.seconds, code: 'o', data: CRLF });
                break;
            }
            case 'output': {
                const rendered = renderStyledText(node.text);
                engine.emitLine(0);
                events.push({ time: engine.seconds, code: 'o', data: rendered + CRLF });
                break;
            }
            case 'print': {
                const rendered = renderStyledText(node.text);
                events.push({ time: engine.seconds, code: 'o', data: rendered + CRLF });
                break;
            }
            case 'type': {
                for (const ch of node.text) {
                    engine.typeChar();
                    events.push({ time: engine.seconds, code: 'o', data: ch });
                }
                break;
            }
            case 'hidden': {
                // Advance timing for each character (no echo — nothing displayed)
                for (const _ch of node.text) {
                    engine.typeChar();
                }
                // Emit Enter keypress — moves to new line, as a real terminal would
                engine.typeChar();
                events.push({ time: engine.seconds, code: 'o', data: CRLF });
                break;
            }
            case 'file-output': {
                // Read the file relative to the source script's directory
                const filePath = resolve(sourceDir, node.path);
                let fileContent;
                try {
                    fileContent = readFileSync(filePath, 'utf8');
                }
                catch {
                    throw new Error(`file-output: cannot read file "${filePath}"`);
                }
                const lines = fileContent.split('\n');
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    // Skip trailing empty line from final newline
                    if (i === lines.length - 1 && line === '')
                        continue;
                    engine.emitLine(i);
                    events.push({ time: engine.seconds, code: 'o', data: (line ?? '') + CRLF });
                }
                break;
            }
            case 'include': {
                // Resolve path relative to current source directory
                const includePath = resolve(sourceDir, node.path);
                let includeSource;
                try {
                    includeSource = readFileSync(includePath, 'utf8');
                }
                catch {
                    throw new Error(`include: cannot read file "${includePath}"`);
                }
                const includeDir = dirname(includePath);
                const { nodes: includeNodes } = parse(includeSource);
                let nodesToCompile;
                if (node.block) {
                    nodesToCompile = extractBlock(includeNodes, node.block);
                }
                else {
                    // Filter out block-label nodes when including the whole file
                    nodesToCompile = includeNodes.filter((n) => n.kind !== 'block-label');
                }
                compileNodes(nodesToCompile, events, engine, config, includeDir, isFirstBlock);
                break;
            }
            case 'set': {
                // Apply mid-script config key overrides
                switch (node.key) {
                    case 'typing-speed': {
                        const speed = node.value === 'instant' ||
                            node.value === 'fast' ||
                            node.value === 'normal' ||
                            node.value === 'slow'
                            ? node.value
                            : parseInt(node.value, 10) || 'normal';
                        config.typingSpeed = speed;
                        engine.setSpeed(speed);
                        break;
                    }
                    case 'prompt':
                        config.prompt = node.value;
                        break;
                    case 'idle-time':
                        config.idleTime = parseFloat(node.value);
                        break;
                    case 'title':
                        config.title = node.value;
                        break;
                    // Other keys (width, height, etc.) are not meaningful mid-script
                    default:
                        break;
                }
                break;
            }
        }
    }
}
// ── Block extraction ──────────────────────────────────────────────────────────
/**
 * Extract nodes belonging to a named [block] from a node list.
 * Returns the nodes between the named block-label and the next block-label
 * (or end of file).
 */
function extractBlock(nodes, blockName) {
    let inBlock = false;
    const result = [];
    for (const node of nodes) {
        if (node.kind === 'block-label') {
            if (node.name === blockName) {
                inBlock = true;
            }
            else if (inBlock) {
                // Hit the next block label — stop
                break;
            }
            continue;
        }
        if (inBlock) {
            result.push(node);
        }
    }
    if (!inBlock) {
        throw new Error(`include: block "[${blockName}]" not found`);
    }
    return result;
}
// ── Header builder ────────────────────────────────────────────────────────────
function buildHeader(config) {
    const header = {
        version: config.outputFormat === 'v2' ? 2 : 3,
        cols: config.width,
        rows: config.height,
        timestamp: Math.floor(Date.now() / 1000),
    };
    if (config.title)
        header.title = config.title;
    if (Object.keys(config.env).length > 0)
        header.env = config.env;
    return header;
}
// ── Styled text renderer ──────────────────────────────────────────────────────
export function renderStyledText(text) {
    let out = '';
    for (const span of text) {
        if (span.kind === 'plain') {
            out += span.text;
        }
        else {
            const openSeq = modifiersToAnsi(span.modifiers);
            const inner = renderStyledText(span.content);
            out += openSeq + inner + RESET;
        }
    }
    return out;
}
// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Unescape common escape sequences in raw: directive strings.
 * e.g. "\\x1b[1m" → "\x1b[1m"
 */
function unescapeRaw(input) {
    return input
        .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\');
}
//# sourceMappingURL=compiler.js.map