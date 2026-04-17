"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const cp = __importStar(require("child_process"));
const fs = __importStar(require("fs"));
// ─────────────────────────────────────────────
//  Cross-platform WAV player
// ─────────────────────────────────────────────
function playWav(filePath) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[Woo Woops] File not found: ${filePath}`);
        return;
    }
    const platform = process.platform;
    try {
        if (platform === 'win32') {
            const escaped = filePath.replace(/'/g, "''");
            cp.execSync(`powershell -NoProfile -NonInteractive -Command "(New-Object Media.SoundPlayer '${escaped}').PlaySync()"`);
        }
        else if (platform === 'darwin') {
            cp.spawn('afplay', [filePath], { detached: true, stdio: 'ignore' });
        }
        else {
            for (const player of ['aplay', 'paplay', 'ffplay']) {
                try {
                    cp.spawn(player, [filePath], { detached: true, stdio: 'ignore' });
                    break;
                }
                catch { /* try next */ }
            }
        }
    }
    catch (err) {
        console.error('[Woo Woops] Playback error:', err);
    }
}
// ─────────────────────────────────────────────
//  Sound manager
// ─────────────────────────────────────────────
class SoundPlayer {
    constructor(extensionPath) {
        this.extensionPath = extensionPath;
    }
    getConfig() {
        return vscode.workspace.getConfiguration('wooWoops');
    }
    isEnabled() {
        return this.getConfig().get('enabled', true);
    }
    resolveSound(type) {
        const config = this.getConfig();
        const customKey = type === 'success' ? 'successSoundPath' : 'errorSoundPath';
        const customPath = config.get(customKey, '');
        if (customPath && fs.existsSync(customPath)) {
            return customPath;
        }
        return path.join(this.extensionPath, 'sounds', `${type}.wav`);
    }
    playSuccess() {
        if (!this.isEnabled()) {
            return;
        }
        playWav(this.resolveSound('success'));
    }
    playError() {
        if (!this.isEnabled()) {
            return;
        }
        playWav(this.resolveSound('error'));
    }
}
// ─────────────────────────────────────────────
//  Terminal watcher using PTY API
// ─────────────────────────────────────────────
function watchTerminal(context, player) {
    const errorPatterns = [
        'Traceback',
        'SyntaxError',
        'NameError',
        'TypeError',
        'ValueError',
        'AttributeError',
        'ImportError',
        'IndentationError',
        'KeyError',
        'IndexError',
        'ZeroDivisionError',
        'FileNotFoundError',
        'RuntimeError',
        'Exception',
        'Error:',
        'FAILED',
        'fatal:',
    ];
    // Buffer per terminal to avoid firing on partial output
    const buffers = new Map();
    context.subscriptions.push(vscode.window.onDidWriteTerminalData((event) => {
        const id = event.terminal.processId;
        const current = (buffers.get(id) ?? '') + event.data;
        buffers.set(id, current);
        // Process after short delay to get full output
        setTimeout(() => {
            const text = buffers.get(id) ?? '';
            buffers.delete(id);
            const hasError = errorPatterns.some(p => text.includes(p));
            if (hasError) {
                player.playError();
            }
        }, 300);
    }));
}
// ─────────────────────────────────────────────
//  Activation
// ─────────────────────────────────────────────
function activate(context) {
    const player = new SoundPlayer(context.extensionPath);
    console.log('[Woo Woops] Extension activated');
    // ── Shell Integration: detects ANY terminal command exit code ─────────────
    // This catches: python hello.py, node app.js, npm run, cargo build, etc.
    context.subscriptions.push(vscode.window.onDidEndTerminalShellExecution((event) => {
        const exitCode = event.exitCode;
        if (exitCode === undefined) {
            return;
        }
        if (exitCode === 0) {
            player.playSuccess();
        }
        else {
            player.playError();
        }
    }));
    // ── Also catch VS Code tasks (Ctrl+Shift+B etc.) ──────────────────────────
    context.subscriptions.push(vscode.tasks.onDidEndTaskProcess(event => {
        if (event.exitCode === 0) {
            player.playSuccess();
        }
        else if (event.exitCode !== undefined) {
            player.playError();
        }
    }));
    // ── Commands ──────────────────────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('wooWoops.testSuccess', () => {
        player.playSuccess();
        vscode.window.showInformationMessage('Woo Woops: ✅ Success sound played!');
    }), vscode.commands.registerCommand('wooWoops.testError', () => {
        player.playError();
        vscode.window.showInformationMessage('Woo Woops: ❌ Error sound played!');
    }), vscode.commands.registerCommand('wooWoops.toggle', () => {
        const config = vscode.workspace.getConfiguration('wooWoops');
        const current = config.get('enabled', true);
        config.update('enabled', !current, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Woo Woops: ${!current ? '🔊 Enabled' : '🔇 Disabled'}`);
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map