import { useEffect, useCallback } from "react";

export interface ChatShortcut {
  keys: string[];
  description: string;
  action: () => void;
  category: 'navigation' | 'editing' | 'conversation' | 'system';
  enabled?: boolean;
}

export function useChatKeyboardShortcuts(shortcuts: ChatShortcut[]) {
  const normalizeKey = (key: string): string => {
    const keyMap: Record<string, string> = {
      ' ': 'Space',
      'Escape': 'Escape',
      'Enter': 'Enter',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
      'ArrowUp': 'ArrowUp',
      'ArrowDown': 'ArrowDown',
      'ArrowLeft': 'ArrowLeft',
      'ArrowRight': 'ArrowRight',
    };

    return keyMap[key] || key.toUpperCase();
  };

  const isModifierKey = (key: string): boolean => {
    return ['Control', 'Alt', 'Shift', 'Meta'].includes(key);
  };

  const matchesShortcut = (event: KeyboardEvent, shortcut: string[]): boolean => {
    if (shortcut.length === 0) return false;

    const eventKeys = new Set<string>();

    // Add modifier keys if they're pressed
    if (event.ctrlKey || event.metaKey) eventKeys.add('Ctrl');
    if (event.altKey) eventKeys.add('Alt');
    if (event.shiftKey) eventKeys.add('Shift');

    // Add the main key
    const mainKey = normalizeKey(event.key);
    if (!isModifierKey(mainKey)) {
      eventKeys.add(mainKey);
    }

    // Sort both sets for consistent comparison
    const eventKeyArray = Array.from(eventKeys).sort();
    const shortcutKeyArray = shortcut.map(normalizeKey).sort();

    return (
      eventKeyArray.length === shortcutKeyArray.length &&
      eventKeyArray.every((key, index) => key === shortcutKeyArray[index])
    );
  };

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    const isInputElement =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true';

    if (isInputElement) {
      // Only allow certain shortcuts when typing
      const allowedWhileTyping = shortcuts.filter(shortcut =>
        shortcut.category === 'editing' && shortcut.enabled !== false
      );
    } else {
      // Only allow non-editing shortcuts when not typing
      const nonEditingShortcuts = shortcuts.filter(shortcut =>
        shortcut.category !== 'editing' && shortcut.enabled !== false
      );

      for (const shortcut of nonEditingShortcuts) {
        if (matchesShortcut(event, shortcut.keys)) {
          event.preventDefault();
          event.stopPropagation();
          shortcut.action();
          return;
        }
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return {
    shortcuts: shortcuts.filter(s => s.enabled !== false),
    registerShortcut: (newShortcut: ChatShortcut) => {
      shortcuts.push(newShortcut);
    }
  };
}

// Default chat shortcuts
export const defaultChatShortcuts: ChatShortcut[] = [
  {
    keys: ['Ctrl', 'l'],
    description: 'Clear current conversation',
    action: () => {},
    category: 'conversation'
  },
  {
    keys: ['Ctrl', 'n'],
    description: 'New conversation',
    action: () => {},
    category: 'navigation'
  },
  {
    keys: ['Ctrl', '/'],
    description: 'Show help',
    action: () => {},
    category: 'system'
  },
  {
    keys: ['Escape'],
    description: 'Clear input',
    action: () => {},
    category: 'editing'
  },
  {
    keys: ['Ctrl', 'Enter'],
    description: 'Send message',
    action: () => {},
    category: 'editing'
  },
  {
    keys: ['Ctrl', 'k'],
    description: 'Search conversations',
    action: () => {},
    category: 'navigation'
  },
  {
    keys: ['Ctrl', 'e'],
    description: 'Export chat',
    action: () => {},
    category: 'conversation'
  }
];