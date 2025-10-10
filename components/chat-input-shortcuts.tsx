"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Keyboard, Command, ArrowUp } from "lucide-react";

interface ShortcutConfig {
  keys: string[];
  description: string;
  action: () => void;
  category?: string;
  mobile?: boolean;
}

interface ChatInputShortcutsProps {
  shortcuts: ShortcutConfig[];
  onShortcutTriggered?: (shortcut: ShortcutConfig) => void;
  showHelp?: boolean;
  className?: string;
}

export function ChatInputShortcuts({
  shortcuts,
  onShortcutTriggered,
  showHelp = false,
  className,
}: ChatInputShortcutsProps) {
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for our shortcuts
      const key = normalizeKey(e.key);
      const newPressedKeys = new Set(pressedKeys).add(key);
      setPressedKeys(newPressedKeys);

      // Check for matching shortcuts
      const matchedShortcut = findMatchingShortcut(
        Array.from(newPressedKeys),
        e.ctrlKey || e.metaKey,
        e.shiftKey,
        e.altKey
      );

      if (matchedShortcut) {
        e.preventDefault();
        matchedShortcut.action();
        onShortcutTriggered?.(matchedShortcut);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = normalizeKey(e.key);
      const newPressedKeys = new Set(pressedKeys);
      newPressedKeys.delete(key);
      setPressedKeys(newPressedKeys);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [pressedKeys, shortcuts, onShortcutTriggered]);

  // Normalize key names
  const normalizeKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Enter',
      'Escape': 'Esc',
      'Tab': 'Tab',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
    };
    return keyMap[key] || key;
  };

  // Find matching shortcut
  const findMatchingShortcut = (
    keys: string[],
    ctrlKey: boolean,
    shiftKey: boolean,
    altKey: boolean
  ): ShortcutConfig | undefined => {
    return shortcuts.find(shortcut => {
      const shortcutKeys = [...shortcut.keys].sort();
      const currentKeys = [...keys].sort();

      // Check if keys match
      if (shortcutKeys.length !== currentKeys.length) return false;

      const keyMatch = shortcutKeys.every(key => currentKeys.includes(key));
      if (!keyMatch) return false;

      // Check modifier keys
      const hasCtrl = shortcutKeys.includes('Ctrl') || shortcutKeys.includes('Cmd');
      const hasShift = shortcutKeys.includes('Shift');
      const hasAlt = shortcutKeys.includes('Alt');

      return (
        (!hasCtrl || ctrlKey) &&
        (!hasShift || shiftKey) &&
        (!hasAlt || altKey)
      );
    });
  };

  // Toggle shortcuts help
  const toggleShortcuts = useCallback(() => {
    setShowShortcuts(!showShortcuts);
  }, [showShortcuts]);

  // Group shortcuts by category
  const shortcutsByCategory = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'General';
    if (!acc[category]) acc[category] = [];
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutConfig[]>);

  if (!showHelp) return null;

  return (
    <div className={cn("relative", className)}>
      {/* Shortcuts toggle button */}
      <button
        onClick={toggleShortcuts}
        className={cn(
          "p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors",
          "flex items-center gap-2 text-sm"
        )}
      >
        <Keyboard className="h-4 w-4" />
        Keyboard Shortcuts
      </button>

      {/* Shortcuts help panel */}
      {showShortcuts && (
        <div className="absolute bottom-full right-0 mb-2 w-80 bg-background border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {Object.entries(shortcutsByCategory).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    {category}
                  </h4>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <KeyCombo keys={shortcut.keys} />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {shortcut.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Key combo display component
function KeyCombo({ keys }: { keys: string[] }) {
  return (
    <div className="flex items-center gap-1">
      {keys.map((key, index) => (
        <div key={index} className="flex items-center gap-1">
          <KeyIcon key={key} keyName={key} />
          {index < keys.length - 1 && <span className="text-muted-foreground/50">+</span>}
        </div>
      ))}
    </div>
  );
}

// Individual key icon component
function KeyIcon({ keyName }: { keyName: string }) {
  const getKeyIcon = (key: string) => {
    switch (key.toLowerCase()) {
      case 'ctrl':
      case 'cmd':
        return <Command className="h-3 w-3" />;
      case 'shift':
        return <span className="text-xs font-bold">⇧</span>;
      case 'up':
        return <ArrowUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const icon = getKeyIcon(keyName);
  const displayKey = keyName.replace(/^(Ctrl|Cmd|Shift|Alt)\+/, '');

  return (
    <div className={cn(
      "inline-flex items-center justify-center",
      "px-1.5 py-0.5 text-xs font-mono",
      "bg-muted border border-border/50 rounded",
      "min-w-[1.5rem] h-5"
    )}>
      {icon || displayKey}
    </div>
  );
}

// Default shortcuts for chat input
export const defaultChatShortcuts: ShortcutConfig[] = [
  {
    keys: ['Enter'],
    description: 'Send message',
    category: 'Messaging',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'New line',
    category: 'Messaging',
  },
  {
    keys: ['Ctrl', 'Enter'],
    description: 'Send message (alternative)',
    category: 'Messaging',
  },
  {
    keys: ['Esc'],
    description: 'Clear input',
    category: 'Navigation',
  },
  {
    keys: ['Ctrl', 'k'],
    description: 'Search conversations',
    category: 'Navigation',
  },
  {
    keys: ['Ctrl', '/'],
    description: 'Show shortcuts help',
    category: 'Help',
  },
  {
    keys: ['Up'],
    description: 'Edit previous message',
    category: 'Navigation',
  },
  {
    keys: ['Ctrl', 'Shift', 'Up'],
    description: 'Go to first message',
    category: 'Navigation',
  },
  {
    keys: ['Ctrl', 'Shift', 'Down'],
    description: 'Go to last message',
    category: 'Navigation',
  },
];

// Hook for using chat shortcuts
export function useChatShortcuts(additionalShortcuts: ShortcutConfig[] = []) {
  const allShortcuts = [...defaultChatShortcuts, ...additionalShortcuts];

  const handleShortcut = useCallback((shortcut: ShortcutConfig) => {
    console.log('Shortcut triggered:', shortcut);
  }, []);

  return {
    shortcuts: allShortcuts,
    handleShortcut,
  };
}