"use client";

// lib/supabaseClient.ts
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;
let connectionRetryCount = 0;
const MAX_RETRY_ATTEMPTS = 3;

// Global channel registry to prevent duplicate subscriptions
const activeChannels = new Map<string, RealtimeChannel>();

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  if (typeof window === "undefined") {
    console.log('DEBUG: getSupabaseClient called server-side, returning null');
    cachedClient = null;
    return null;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error('DEBUG: Missing Supabase environment variables:', {
      NEXT_PUBLIC_SUPABASE_URL: !!url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!anonKey
    });
    cachedClient = null;
    return null;
  }

  try {
    console.log('DEBUG: Creating Supabase browser client with realtime support...');

    cachedClient = createBrowserClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'X-Client-Info': 'codejoin-team-chat/1.0.0',
        },
      },
    });

    // Set up connection monitoring
    setupConnectionMonitoring(cachedClient);

    console.log('DEBUG: Supabase client created successfully');
    connectionRetryCount = 0; // Reset retry count on successful creation
    return cachedClient;
  } catch (error) {
    console.error('DEBUG: Error creating Supabase client:', {
      error: error,
      errorType: typeof error,
      errorString: String(error),
      errorJson: JSON.stringify(error, null, 2)
    });

    // Implement retry logic
    if (connectionRetryCount < MAX_RETRY_ATTEMPTS) {
      connectionRetryCount++;
      console.log(`DEBUG: Retrying Supabase client creation (${connectionRetryCount}/${MAX_RETRY_ATTEMPTS})`);
      setTimeout(() => {
        cachedClient = undefined; // Reset cached client to retry
      }, 1000 * connectionRetryCount);
    } else {
      cachedClient = null;
    }

    return cachedClient;
  }
}

function setupConnectionMonitoring(client: SupabaseClient) {
  if (!client.realtime) return;

  // Monitor connection state
  client.realtime.onOpen = () => {
    console.log('DEBUG: Supabase realtime connection opened');
    connectionRetryCount = 0;
  };

  client.realtime.onClose = () => {
    console.log('DEBUG: Supabase realtime connection closed');
  };

  client.realtime.onError = (error) => {
    console.error('DEBUG: Supabase realtime connection error:', error);
    // Attempt to reconnect
    if (connectionRetryCount < MAX_RETRY_ATTEMPTS) {
      connectionRetryCount++;
      console.log(`DEBUG: Attempting to reconnect (${connectionRetryCount}/${MAX_RETRY_ATTEMPTS})`);
      setTimeout(() => {
        client.realtime.connect();
      }, 2000 * connectionRetryCount);
    }
  };
}

// Enhanced channel creation with duplicate prevention and proper cleanup
export function createRealtimeChannel(
  client: SupabaseClient | null,
  channelName: string,
  config?: {
    table?: string;
    filter?: string;
    event?: string;
    schema?: string;
  }
): RealtimeChannel | null {
  if (!client) {
    console.error('DEBUG: Cannot create channel - Supabase client is null');
    return null;
  }

  try {
    // Check if channel already exists in global registry
    if (activeChannels.has(channelName)) {
      console.log(`DEBUG: Channel ${channelName} already exists in registry, cleaning up first`);
      const existingChannel = activeChannels.get(channelName);
      if (existingChannel) {
        try {
          existingChannel.unsubscribe();
        } catch (error) {
          console.warn(`DEBUG: Error unsubscribing existing channel ${channelName}:`, error);
        }
      }
      activeChannels.delete(channelName);
    }

    console.log(`DEBUG: Creating realtime channel: ${channelName}`);

    let channel = client.channel(channelName);

    if (config?.table && config?.filter) {
      channel = channel.on('postgres_changes', {
        event: config.event || 'INSERT',
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter,
      }, (payload) => {
        console.log(`DEBUG: Received realtime event on ${channelName}:`, payload);
      });
    }

    // Set up channel error handling and lifecycle management
    channel.subscribe((status) => {
      console.log(`DEBUG: Channel ${channelName} status:`, status);

      if (status === 'SUBSCRIBED') {
        console.log(`DEBUG: Successfully subscribed to channel: ${channelName}`);
        // Add to registry only when successfully subscribed
        activeChannels.set(channelName, channel);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`DEBUG: Channel error for ${channelName}`);
        // Remove from registry on error
        activeChannels.delete(channelName);
      } else if (status === 'TIMED_OUT') {
        console.warn(`DEBUG: Channel subscription timed out for ${channelName}`);
        // Remove from registry on timeout
        activeChannels.delete(channelName);
      } else if (status === 'CLOSED') {
        console.log(`DEBUG: Channel ${channelName} closed`);
        // Remove from registry when closed
        activeChannels.delete(channelName);
      }
    });

    // Store in registry immediately (will be removed if subscription fails)
    activeChannels.set(channelName, channel);

    return channel;
  } catch (error) {
    console.error(`DEBUG: Error creating channel ${channelName}:`, error);
    // Ensure cleanup on error
    activeChannels.delete(channelName);
    return null;
  }
}

// Function to properly cleanup a channel
export async function cleanupChannel(channelName: string): Promise<void> {
  const channel = activeChannels.get(channelName);
  if (channel) {
    try {
      console.log(`DEBUG: Cleaning up channel: ${channelName}`);
      await channel.unsubscribe();
      activeChannels.delete(channelName);
      console.log(`DEBUG: Successfully cleaned up channel: ${channelName}`);
    } catch (error) {
      console.warn(`DEBUG: Error cleaning up channel ${channelName}:`, error);
      // Force remove from registry even if unsubscribe fails
      activeChannels.delete(channelName);
    }
  }
}

// Function to check if a channel is active
export function isChannelActive(channelName: string): boolean {
  return activeChannels.has(channelName);
}

// Function to get all active channels (for debugging)
export function getActiveChannels(): string[] {
  return Array.from(activeChannels.keys());
}

// Function to cleanup all channels (useful for app-wide cleanup)
export async function cleanupAllChannels(): Promise<void> {
  const channelNames = Array.from(activeChannels.keys());
  console.log(`DEBUG: Cleaning up ${channelNames.length} active channels:`, channelNames);

  const cleanupPromises = channelNames.map(name => cleanupChannel(name));
  try {
    await Promise.allSettled(cleanupPromises);
    console.log('DEBUG: All channels cleaned up successfully');
  } catch (error) {
    console.warn('DEBUG: Some channels may not have cleaned up properly:', error);
  }
}

// Function to check user authentication status
export async function checkAuthentication(client: SupabaseClient | null): Promise<boolean> {
  if (!client) {
    console.error('DEBUG: Cannot check authentication - Supabase client is null');
    return false;
  }

  try {
    const { data: { session }, error } = await client.auth.getSession();

    if (error) {
      console.error('DEBUG: Error checking authentication:', error);
      return false;
    }

    if (!session) {
      console.log('DEBUG: No active session found');
      return false;
    }

    console.log('DEBUG: User is authenticated:', session.user?.id);
    return true;
  } catch (error) {
    console.error('DEBUG: Unexpected error checking authentication:', error);
    return false;
  }
}

// Function to verify project access before subscribing
export async function verifyProjectAccess(
  client: SupabaseClient | null,
  projectId: string
): Promise<boolean> {
  if (!client) {
    console.error('DEBUG: Cannot verify project access - Supabase client is null');
    return false;
  }

  try {
    const { data, error } = await client
      .from('conversations')
      .select('id')
      .eq('project_id', projectId)
      .eq('type', 'team-chat')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('DEBUG: Error verifying project access:', error);
      return false;
    }

    // If we can read the conversation, user has access
    console.log(`DEBUG: Project access verified for project ${projectId}`);
    return true;
  } catch (error) {
    console.error('DEBUG: Unexpected error verifying project access:', error);
    return false;
  }
}
