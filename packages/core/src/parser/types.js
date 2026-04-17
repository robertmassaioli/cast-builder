// Parser types — the contract between the lexer, parser, compiler, and test suite.
// These types are frozen in Phase 0; implementations are filled in Phase 1+.
export const DEFAULT_CONFIG = {
    width: 120,
    height: 30,
    shell: 'bash',
    prompt: '$ ',
    theme: 'default',
    typingSpeed: 'normal',
    idleTime: 1.0,
    outputFormat: 'v3',
    env: {},
};
// ── Parse error ───────────────────────────────────────────────────────────────
export class ParseError extends Error {
    line;
    constructor(line, message) {
        super(`Line ${line}: ${message}`);
        this.line = line;
        this.name = 'ParseError';
    }
}
//# sourceMappingURL=types.js.map