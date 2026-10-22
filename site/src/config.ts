/** Links and facts the website shows, in one place. */
export const GITHUB_URL = 'https://github.com/heyjeay/streamcode'
export const DISCORD_URL = 'https://discord.gg/8wwfPxfMWA'
/** The newest release's .vsix, under a fixed name so this link never changes. */
export const DOWNLOAD_URL = `${GITHUB_URL}/releases/latest/download/stream-code.vsix`
export const RELEASES_URL = `${GITHUB_URL}/releases`
/** Empty until the extension is live on the VS Code Marketplace. */
export const MARKETPLACE_URL = ''
export const OVERLAY_URL = 'http://127.0.0.1:7331/'

/** The overlay's themes, in the order the extension lists them. */
export const THEMES = [
  { id: 'mocha', label: 'Mocha', swatch: '#cba6f7' },
  { id: 'kick', label: 'Kick', swatch: '#53fc18' },
  { id: 'twitch', label: 'Twitch', swatch: '#9146ff' },
  { id: 'terminal', label: 'Terminal', swatch: '#39ff14' },
  { id: 'paper', label: 'Paper', swatch: '#f6f8fa' },
  { id: 'glass', label: 'Glass', swatch: '#7ee8fa' },
  { id: 'neon', label: 'Neon', swatch: '#ff6ec7' },
  { id: 'mac', label: 'Mac', swatch: '#61afef' },
  { id: 'nord', label: 'Nord', swatch: '#88c0d0' },
  { id: 'dracula', label: 'Dracula', swatch: '#bd93f9' },
  { id: 'gruvbox', label: 'Gruvbox', swatch: '#fabd2f' },
  { id: 'minimal', label: 'Minimal', swatch: '#ffffff' },
] as const
