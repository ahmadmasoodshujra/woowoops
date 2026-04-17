import * as vscode from 'vscode';
import * as path from 'path';
import * as cp from 'child_process';
import * as fs from 'fs';

// ─────────────────────────────────────────────
//  Cross-platform WAV player
// ─────────────────────────────────────────────
function playWav(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.warn(`[Woo Woops] File not found: ${filePath}`);
    return;
  }

  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const escaped = filePath.replace(/'/g, "''");
      cp.execSync(`powershell -NoProfile -NonInteractive -Command "(New-Object Media.SoundPlayer '${escaped}').PlaySync()"`);
    } else if (platform === 'darwin') {
      cp.spawn('afplay', [filePath], { detached: true, stdio: 'ignore' });
    } else {
      for (const player of ['aplay', 'paplay', 'ffplay']) {
        try {
          cp.spawn(player, [filePath], { detached: true, stdio: 'ignore' });
          break;
        } catch { /* try next */ }
      }
    }
  } catch (err) {
    console.error('[Woo Woops] Playback error:', err);
  }
}

// ─────────────────────────────────────────────
//  Sound manager
// ─────────────────────────────────────────────
class SoundPlayer {
  private extensionPath: string;

  constructor(extensionPath: string) {
    this.extensionPath = extensionPath;
  }

  private getConfig() {
    return vscode.workspace.getConfiguration('wooWoops');
  }

  private isEnabled(): boolean {
    return this.getConfig().get<boolean>('enabled', true);
  }

  private resolveSound(type: 'success' | 'error'): string {
    const config = this.getConfig();
    const customKey = type === 'success' ? 'successSoundPath' : 'errorSoundPath';
    const customPath = config.get<string>(customKey, '');

    if (customPath && fs.existsSync(customPath)) {
      return customPath;
    }

    return path.join(this.extensionPath, 'sounds', `${type}.wav`);
  }

  playSuccess(): void {
    if (!this.isEnabled()) { return; }
    playWav(this.resolveSound('success'));
  }

  playError(): void {
    if (!this.isEnabled()) { return; }
    playWav(this.resolveSound('error'));
  }
}

// ─────────────────────────────────────────────
//  Terminal watcher using PTY API
// ─────────────────────────────────────────────
function watchTerminal(context: vscode.ExtensionContext, player: SoundPlayer) {
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
  const buffers = new Map<number, string>();

  context.subscriptions.push(
    (vscode.window as any).onDidWriteTerminalData((event: any) => {
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
    })
  );
}

// ─────────────────────────────────────────────
//  Activation
// ─────────────────────────────────────────────
export function activate(context: vscode.ExtensionContext) {
  const player = new SoundPlayer(context.extensionPath);

  console.log('[Woo Woops] Extension activated');

  // ── Shell Integration: detects ANY terminal command exit code ─────────────
  // This catches: python hello.py, node app.js, npm run, cargo build, etc.
  context.subscriptions.push(
    (vscode.window as any).onDidEndTerminalShellExecution((event: any) => {
      const exitCode = event.exitCode;
      if (exitCode === undefined) { return; }

      if (exitCode === 0) {
        player.playSuccess();
      } else {
        player.playError();
      }
    })
  );

  // ── Also catch VS Code tasks (Ctrl+Shift+B etc.) ──────────────────────────
  context.subscriptions.push(
    vscode.tasks.onDidEndTaskProcess(event => {
      if (event.exitCode === 0) {
        player.playSuccess();
      } else if (event.exitCode !== undefined) {
        player.playError();
      }
    })
  );

  // ── Commands ──────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('wooWoops.testSuccess', () => {
      player.playSuccess();
      vscode.window.showInformationMessage('Woo Woops: ✅ Success sound played!');
    }),

    vscode.commands.registerCommand('wooWoops.testError', () => {
      player.playError();
      vscode.window.showInformationMessage('Woo Woops: ❌ Error sound played!');
    }),

    vscode.commands.registerCommand('wooWoops.toggle', () => {
      const config = vscode.workspace.getConfiguration('wooWoops');
      const current = config.get<boolean>('enabled', true);
      config.update('enabled', !current, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage(
        `Woo Woops: ${!current ? '🔊 Enabled' : '🔇 Disabled'}`
      );
    })
  );
}

export function deactivate() {}