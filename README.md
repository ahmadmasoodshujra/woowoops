# 🔊 Woo Woops

A VS Code extension that plays audio feedback when your code has errors or runs successfully.

## Features

- 🔴 **Error sound** — plays when a terminal command exits with an error (Python, Node, Rust, anything)
- ✅ **Success sound** — plays when a terminal command completes successfully
- 🎵 **Custom sounds** — point to your own `.wav` files
- 🔇 **Easy toggle** — enable/disable via command palette

## Usage

Install the extension and start coding — sounds play automatically whenever you run anything in the terminal.

### Commands (Ctrl+Shift+P)

| Command | Description |
|---|---|
| `Woo Woops: Test Success Sound` | Preview the success sound |
| `Woo Woops: Test Error Sound` | Preview the error sound |
| `Woo Woops: Toggle On/Off` | Mute/unmute all sounds |

## Settings

| Setting | Default | Description |
|---|---|---|
| `wooWoops.enabled` | `true` | Enable or disable all sounds |
| `wooWoops.errorSoundPath` | `""` | Path to a custom `.wav` file for errors |
| `wooWoops.successSoundPath` | `""` | Path to a custom `.wav` file for success |

### Custom Sound Example

In your `settings.json`:
```json
{
  "wooWoops.errorSoundPath": "C:\\Users\\You\\sounds\\my-error.wav",
  "wooWoops.successSoundPath": "C:\\Users\\You\\sounds\\my-success.wav"
}
```

## How It Works

Woo Woops uses VS Code's Shell Integration API (`onDidEndTerminalShellExecution`) to detect when any terminal command finishes. Exit code 0 = success sound. Anything else = error sound. Works with `python`, `node`, `cargo`, `npm`, or any command you run.

## Platform Support

| Platform | Audio Method |
|---|---|
| Windows | PowerShell `Media.SoundPlayer` |
| macOS | `afplay` (built-in) |
| Linux | `aplay` / `paplay` / `ffplay` |

## Requirements

Shell Integration must be enabled in VS Code (it's on by default). If sounds aren't triggering, check that `terminal.integrated.shellIntegration.enabled` is `true` in your settings.

## License

MIT