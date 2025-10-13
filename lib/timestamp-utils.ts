/**
 * Robust timestamp formatting utilities for AI chat messages
 */

/**
 * Format a timestamp string for display in chat messages
 * Handles various timestamp formats and provides appropriate fallbacks
 */
export function formatMessageTime(dateString: string | null | undefined): string {
  // Handle null/undefined/empty cases
  if (!dateString || dateString.trim() === '') {
    return 'Just now';
  }

  try {
    let date: Date;

    // Handle different timestamp formats
    if (dateString.includes('T')) {
      // ISO format: 2025-10-11T16:30:53.158233+00:00 or 2025-10-11 16:30:53.158233+00
      date = new Date(dateString);
    } else if (/^\d{10}$/.test(dateString)) {
      // Unix timestamp in seconds
      date = new Date(parseInt(dateString) * 1000);
    } else if (/^\d{13}$/.test(dateString)) {
      // Unix timestamp in milliseconds
      date = new Date(parseInt(dateString));
    } else {
      // Try parsing as-is
      date = new Date(dateString);
    }

    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp string:', dateString);
      return 'Unknown time';
    }

    // Check if the timestamp is in the future (more than 1 minute ahead, could be timezone issues)
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes > 1) {
      // Future timestamp, likely timezone issue, format with date
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // Check if the timestamp is very old (more than 1 day ago)
    const daysDiff = Math.abs(diffMinutes) / (60 * 24);
    if (daysDiff > 1) {
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    // For recent messages, just show time
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

  } catch (error) {
    console.error('Error formatting timestamp:', error, 'for dateString:', dateString);
    return 'Time error';
  }
}

/**
 * Format a timestamp with relative time for better UX
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString || dateString.trim() === '') {
    return 'Just now';
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return formatMessageTime(dateString); // fallback to simple format
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 30) {
      return 'Just now';
    } else if (diffMinutes < 1) {
      return 'Less than a minute ago';
    } else if (diffMinutes === 1) {
      return '1 minute ago';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    } else if (diffHours === 1) {
      return '1 hour ago';
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      // For older messages, show the date
      return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return formatMessageTime(dateString); // fallback to simple format
  }
}

/**
 * Validate and fix timestamp in message objects
 */
export function validateMessageTimestamp(message: any): any {
  if (!message) return message;

  // If message has no created_at, add current timestamp
  if (!message.created_at) {
    return {
      ...message,
      created_at: new Date().toISOString()
    };
  }

  // If timestamp is invalid, fix it
  try {
    const date = new Date(message.created_at);
    if (isNaN(date.getTime())) {
      console.warn('Invalid timestamp in message, fixing:', message.id);
      return {
        ...message,
        created_at: new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn('Error validating message timestamp, fixing:', message.id);
    return {
      ...message,
      created_at: new Date().toISOString()
    };
  }

  return message;
}

/**
 * Batch validate messages and fix timestamps
 */
export function validateMessageTimestamps(messages: any[]): any[] {
  if (!Array.isArray(messages)) return messages;

  return messages.map(validateMessageTimestamp);
}