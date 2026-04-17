export type ConfigKey = 'title' | 'width' | 'height' | 'shell' | 'prompt' | 'theme' | 'typing-speed' | 'typing-seed' | 'idle-time' | 'output-format' | 'env';
export type TypingSpeed = 'instant' | 'fast' | 'normal' | 'slow' | number;
export interface Config {
    title?: string;
    width: number;
    height: number;
    shell: string;
    prompt: string;
    theme: string;
    typingSpeed: TypingSpeed;
    typingSeed?: number;
    idleTime: number;
    outputFormat: 'v2' | 'v3';
    env: Record<string, string>;
}
export declare const DEFAULT_CONFIG: Config;
export type StyledText = Array<PlainSpan | StyledSpan>;
export interface PlainSpan {
    kind: 'plain';
    text: string;
}
export interface StyledSpan {
    kind: 'styled';
    modifiers: string[];
    content: StyledText;
}
export type ScriptNode = {
    kind: 'command';
    text: string;
} | {
    kind: 'output';
    text: StyledText;
} | {
    kind: 'file-output';
    path: string;
} | {
    kind: 'type';
    text: string;
} | {
    kind: 'hidden';
    text: string;
} | {
    kind: 'print';
    text: StyledText;
} | {
    kind: 'wait';
    ms: number;
} | {
    kind: 'clear';
} | {
    kind: 'marker';
    label: string;
} | {
    kind: 'resize';
    cols: number;
    rows: number;
} | {
    kind: 'set';
    key: ConfigKey;
    value: string;
} | {
    kind: 'include';
    path: string;
    block?: string;
} | {
    kind: 'raw';
    ansi: string;
} | {
    kind: 'block-label';
    name: string;
} | {
    kind: 'comment';
};
export type TokenKind = 'config-section-header' | 'script-section-header' | 'config-line' | 'command' | 'output' | 'file-output' | 'type' | 'hidden' | 'print' | 'wait' | 'clear' | 'marker' | 'resize' | 'set' | 'include' | 'raw' | 'block-label' | 'comment' | 'blank';
export interface Token {
    kind: TokenKind;
    raw: string;
    line: number;
    value?: string;
}
export interface ParseResult {
    config: Config;
    nodes: ScriptNode[];
}
export declare class ParseError extends Error {
    readonly line: number;
    constructor(line: number, message: string);
}
//# sourceMappingURL=types.d.ts.map