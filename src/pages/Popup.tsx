import { useEffect, useState, KeyboardEvent } from "react";
import browser from "webextension-polyfill";
import "./Popup.css";

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

const DEFAULT_SETTINGS: Settings = {
  shortcuts: {
    increase: "d",
    decrease: "s",
    reset: "r",
  },
  enabledDomains: ["youtube.com"],
  increment: 0.25,
};

export default function Popup() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [currentDomain, setCurrentDomain] = useState<string>("");
  const [newDomainInput, setNewDomainInput] = useState<string>("");
  const [recordingKey, setRecordingKey] = useState<keyof Shortcuts | null>(null);

  useEffect(() => {
    // Load settings
    browser.storage.sync.get(DEFAULT_SETTINGS).then((items) => {
      setSettings(items as Settings);
    });

    // Get current tab domain
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      if (tabs.length > 0 && tabs[0].url) {
        try {
          const url = new URL(tabs[0].url);
          setCurrentDomain(url.hostname);
        } catch (e) {
          console.error("Invalid URL", e);
        }
      }
    });
  }, []);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    browser.storage.sync.set(newSettings);
  };

  const handleKeyDown = (keyType: keyof Shortcuts) => (e: KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Ignore modifier keys only presses if you want simple shortcuts
    // Or allow complex ones (Ctrl+Shift+L). For simplicity, let's take the key code.
    // Ideally we'd want something like "Ctrl+S".
    
    let key = e.key;
    if (key === "Escape") {
      setRecordingKey(null);
      return;
    }

    if (e.ctrlKey) key = `Ctrl+${key}`;
    if (e.altKey) key = `Alt+${key}`;
    if (e.shiftKey) key = `Shift+${key}`;
    if (e.metaKey) key = `Meta+${key}`;

    const newShortcuts = { ...settings.shortcuts, [keyType]: key };
    saveSettings({ ...settings, shortcuts: newShortcuts });
    setRecordingKey(null);
  };

  const addDomain = (domain: string) => {
    if (!domain) return;
    const cleanDomain = domain.trim().toLowerCase();
    if (!settings.enabledDomains.includes(cleanDomain)) {
      const newDomains = [...settings.enabledDomains, cleanDomain];
      saveSettings({ ...settings, enabledDomains: newDomains });
    }
    setNewDomainInput("");
  };

  const removeDomain = (domain: string) => {
    const newDomains = settings.enabledDomains.filter((d) => d !== domain);
    saveSettings({ ...settings, enabledDomains: newDomains });
  };

  return (
    <div className="popup-container">
      <h2>Playback Speed Control</h2>

      <div className="section">
        <h3>General</h3>
        <div className="shortcut-input">
          <label>Speed Step</label>
          <input
            type="number"
            step="0.05"
            min="0.01"
            max="1.00"
            value={settings.increment}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) {
                saveSettings({ ...settings, increment: val });
              }
            }}
          />
        </div>
      </div>

      <div className="section">
        <h3>Shortcuts</h3>
        <div className="shortcut-input">
          <label>Increase Speed</label>
          <input
            type="text"
            readOnly
            value={recordingKey === "increase" ? "Press key..." : settings.shortcuts.increase}
            onFocus={() => setRecordingKey("increase")}
            onBlur={() => setRecordingKey(null)}
            onKeyDown={handleKeyDown("increase")}
          />
        </div>
        <div className="shortcut-input">
          <label>Decrease Speed</label>
          <input
            type="text"
            readOnly
            value={recordingKey === "decrease" ? "Press key..." : settings.shortcuts.decrease}
            onFocus={() => setRecordingKey("decrease")}
            onBlur={() => setRecordingKey(null)}
            onKeyDown={handleKeyDown("decrease")}
          />
        </div>
        <div className="shortcut-input">
          <label>Reset Speed</label>
          <input
            type="text"
            readOnly
            value={recordingKey === "reset" ? "Press key..." : settings.shortcuts.reset}
            onFocus={() => setRecordingKey("reset")}
            onBlur={() => setRecordingKey(null)}
            onKeyDown={handleKeyDown("reset")}
          />
        </div>
      </div>

      <div className="section">
        <h3>Enabled Domains</h3>
        {currentDomain && !settings.enabledDomains.includes(currentDomain) && (
          <button className="add-current-btn" onClick={() => addDomain(currentDomain)}>
            Add Current Domain ({currentDomain})
          </button>
        )}
        
        <div className="add-domain-form">
          <input
            type="text"
            placeholder="example.com"
            value={newDomainInput}
            onChange={(e) => setNewDomainInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addDomain(newDomainInput);
            }}
          />
          <button onClick={() => addDomain(newDomainInput)}>Add</button>
        </div>

        <ul className="domain-list">
          {settings.enabledDomains.map((domain) => (
            <li key={domain}>
              <span>{domain}</span>
              <button className="remove-btn" onClick={() => removeDomain(domain)}>×</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
