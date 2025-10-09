"use client";

interface VersionInfo {
  buildTime: string;
  buildHash: string;
  version: string;
}

// Global variable to store version info
let currentVersion: VersionInfo | null = null;
let versionCheckInterval: NodeJS.Timeout | null = null;

export function initVersionManager() {
  // DISABLED - Version checking system removed to eliminate "Application Updated" popup nuisance
  // Console logging preserved for debugging purposes
  if (typeof window === 'undefined') return;

  // Get version from meta tag or build info for debugging only
  const versionMeta = document.querySelector('meta[name="app-version"]');
  const buildTimeMeta = document.querySelector('meta[name="build-time"]');
  const buildHashMeta = document.querySelector('meta[name="build-hash"]');

  currentVersion = {
    version: versionMeta?.getAttribute('content') || '1.0.0',
    buildTime: buildTimeMeta?.getAttribute('content') || new Date().toISOString(),
    buildHash: buildHashMeta?.getAttribute('content') || Math.random().toString(36).substring(7),
  };

  // Store in session storage for comparison but DO NOT start checking
  sessionStorage.setItem('app-version', JSON.stringify(currentVersion));

  // Version checking DISABLED - no popups will be shown
  console.debug('Version manager initialized but checking disabled');
}

export function startVersionCheck() {
  // DISABLED - Version checking removed to eliminate popup nuisance
  console.debug('Version checking disabled - no popups will be shown');
  return;
}

export function stopVersionCheck() {
  if (versionCheckInterval) {
    clearInterval(versionCheckInterval);
    versionCheckInterval = null;
  }
}

export async function checkVersion() {
  // DISABLED - Version checking removed to eliminate popup nuisance
  // Console logging preserved for debugging purposes
  console.debug('Version check disabled - no popups will be shown');
  return;
}

export function handleVersionMismatch(localVersion: VersionInfo, serverVersion: VersionInfo) {
  // DISABLED - Version mismatch handling removed to eliminate popup nuisance
  // Console logging preserved for debugging purposes
  console.debug('Version mismatch detected but notification disabled:', {
    local: localVersion,
    server: serverVersion,
  });

  // Store the new version info silently
  sessionStorage.setItem('app-version', JSON.stringify(serverVersion));
  currentVersion = serverVersion;
}

export function showVersionUpdateNotification(newVersion: VersionInfo) {
  // DISABLED - Version update notification removed to eliminate popup nuisance
  // Console logging preserved for debugging purposes
  console.debug('Version update notification disabled:', newVersion);
  return;
}

export function getCurrentVersion(): VersionInfo | null {
  return currentVersion;
}

export function forceVersionCheck() {
  checkVersion();
}

// Hook for components to use version management
export function useVersionManager() {
  const refresh = () => {
    forceVersionCheck();
  };

  const getVersion = () => getCurrentVersion();

  return {
    refresh,
    getVersion,
    checkVersion: forceVersionCheck,
  };
}