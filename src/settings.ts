export interface Shortcuts {
  increase: string;
  decrease: string;
  reset: string;
}

export interface Settings {
  shortcuts: Shortcuts;
  enabledDomains: string[];
  increment: number;
}

export const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    increase: "d",
    decrease: "s",
    reset: "r",
  },
  enabledDomains: ["youtube.com", "twitch.com"],
  increment: 0.25,
};
