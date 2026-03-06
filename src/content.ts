import browser from "webextension-polyfill";
import { DEFAULT_SETTINGS } from "./pages/Popup";




interface Shortcuts {
  increase: string;
  decrease: string;
  reset: string;
}

interface Settings {
  shortcuts: Shortcuts;
  enabledDomains: string[];
  increment: number;
}

let settings: Settings = { ...DEFAULT_SETTINGS };

let overlayTimeout: NodeJS.Timeout | null = null;
let overlayElement: HTMLDivElement | null = null;

const init = async () => {
  const stored = await browser.storage.sync.get(DEFAULT_SETTINGS);
  settings = stored as Settings;
};

browser.storage.onChanged.addListener((changes) => {
  if (changes.shortcuts) settings.shortcuts = changes.shortcuts.newValue;
  if (changes.enabledDomains) settings.enabledDomains = changes.enabledDomains.newValue;
  if (changes.increment) settings.increment = changes.increment.newValue;
});

init();

function isEnabled(): boolean {
  const hostname = window.location.hostname;
  // Check exact match or if the hostname ends with the domain (e.g. www.youtube.com ends with youtube.com)
  return settings.enabledDomains.some(domain => hostname.includes(domain));
}

function getActiveVideo(): HTMLVideoElement | null {
  const videos = Array.from(document.getElementsByTagName("video"));
  if (videos.length === 0) return null;

  // Filter for visible videos
  const visibleVideos = videos.filter(v => {
    const rect = v.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.top >= -rect.height && rect.bottom <= window.innerHeight + rect.height;
  });

  if (visibleVideos.length === 0) return null;

  // Return the largest video by area
  return visibleVideos.reduce((prev, current) => {
    const prevRect = prev.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    return (prevRect.width * prevRect.height) > (currentRect.width * currentRect.height) ? prev : current;
  });
}

function showOverlay(video: HTMLVideoElement, speed: number) {
  if (overlayElement) {
    overlayElement.remove();
  }
  if (overlayTimeout) {
    clearTimeout(overlayTimeout);
  }

  const rect = video.getBoundingClientRect();
  
  overlayElement = document.createElement("div");
  overlayElement.className = "speed-control-overlay";
  overlayElement.innerText = `${speed.toFixed(2)}x`;
  
  // Position in the center of the video
  // We use fixed positioning to avoid layout issues
  overlayElement.style.position = "fixed";
  overlayElement.style.left = `${rect.left + (rect.width / 2)}px`;
  overlayElement.style.top = `${rect.top + (rect.height / 2)}px`;
  overlayElement.style.transform = "translate(-50%, -50%)";
  
  // Ensure we reset potentially conflicting styles if CSS didn't load or old CSS is present
  overlayElement.style.right = "auto";
  overlayElement.style.bottom = "auto";

  document.body.appendChild(overlayElement);

  overlayTimeout = setTimeout(() => {
    if (overlayElement) {
      overlayElement.style.opacity = "0";
      setTimeout(() => overlayElement?.remove(), 300);
    }
  }, 1500);
}

function handleKeyEvent(e: KeyboardEvent) {
  if (!isEnabled()) return;

  // Ignore if user is typing in an input
  const target = e.target as HTMLElement;
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
    return;
  }

  let key = e.key;
  // Standardize key check (simple version matching Popup.tsx logic)
  if (key === "Escape") return;
  
  let keyString = key;
  if (e.metaKey) keyString = `Meta+${keyString}`;
  if (e.shiftKey) keyString = `Shift+${keyString}`;
  if (e.altKey) keyString = `Alt+${keyString}`;
  if (e.ctrlKey) keyString = `Ctrl+${keyString}`;

  // Check against settings
  let action: "increase" | "decrease" | "reset" | null = null;
  
  if (keyString === settings.shortcuts.increase) action = "increase";
  else if (keyString === settings.shortcuts.decrease) action = "decrease";
  else if (keyString === settings.shortcuts.reset) action = "reset";

  if (action) {
    const video = getActiveVideo();
    if (video) {
      e.preventDefault();
      e.stopPropagation();

      let newSpeed = video.playbackRate;
      if (action === "increase") newSpeed += settings.increment;
      if (action === "decrease") newSpeed = Math.max(0.1, newSpeed - settings.increment);
      if (action === "reset") newSpeed = 1.0;

      // Fix floating point errors
      newSpeed = Math.round(newSpeed * 100) / 100;
      
      video.playbackRate = newSpeed;
      showOverlay(video, newSpeed);
    }
  }
}

document.addEventListener("keydown", handleKeyEvent);
