# Theme Migration: Supabase to Local Cookie Storage

## Overview

This document describes the migration of theme persistence from Supabase database storage to local browser cookie storage. This change improves performance, reduces API dependencies, and provides immediate theme changes.

## Implementation Details

### Files Created/Modified

#### New Files:
- `lib/theme-cookies.ts` - Theme constants and types
- `lib/theme-cookies-server.ts` - Server-side cookie utilities
- `lib/theme-cookies-client.ts` - Client-side cookie utilities
- `hooks/use-theme-persistent.ts` - Custom hook for theme persistence
- `components/theme-provider-wrapper.tsx` - Server-side theme provider wrapper

#### Modified Files:
- `app/layout.tsx` - Updated to use ThemeProviderWrapper
- `app/settings/page.tsx` - Updated theme handling to use local storage
- `components/theme-provider.tsx` - Simplified for clean separation
- `lib/settings-api.ts` - Removed theme from API calls
- `types/settings.ts` - Updated to exclude theme from preferences
- `app/api/settings/preferences/route.ts` - Removed theme from API schema

## Cookie Configuration

- **Name**: `codejoin-theme`
- **Duration**: 1 year (60 * 60 * 24 * 365 seconds)
- **Path**: `/` (entire site)
- **HttpOnly**: `false` (allows client-side access)
- **Secure**: `true` in production
- **SameSite**: `lax`

## Theme Flow

### Initial Load (SSR)
1. `ThemeProviderWrapper` reads theme from server-side cookies
2. Passes theme to `ThemeProvider` as default
3. Prevents flash of incorrect theme

### Client-Side Updates
1. User selects new theme in settings
2. `handleThemeSelect` calls `setTheme` and `setClientThemeCookie`
3. Theme changes immediately via `next-themes`
4. Cookie is updated for persistence

### Page Reloads
1. Server reads cookie during SSR
2. Client-side `useThemePersistent` hook syncs with cookie
3. Theme remains consistent across sessions

## API Changes

### Before
```typescript
// Theme was part of user preferences API
{
  theme_preference: 'dark',
  language: 'en',
  timezone: 'UTC',
  // ... other preferences
}
```

### After
```typescript
// Theme excluded from API, handled locally
{
  language: 'en',
  timezone: 'UTC',
  // ... other preferences (no theme)
}
```

## Benefits

### Performance Improvements
- ✅ No API calls for theme changes
- ✅ Immediate theme updates
- ✅ Reduced database load
- ✅ Faster page loads

### User Experience
- ✅ Instant theme switching
- ✅ Theme persists without login
- ✅ Works in incognito mode
- ✅ Consistent across devices (same browser)

### Developer Experience
- ✅ Simpler state management
- ✅ No Supabase dependency for theme
- ✅ Easier testing and debugging
- ✅ Better SSR support

## Migration Steps Completed

1. ✅ Created cookie utilities (server and client)
2. ✅ Implemented persistent theme hook
3. ✅ Updated theme provider for SSR compatibility
4. ✅ Modified settings page for local storage
5. ✅ Removed theme from Supabase API
6. ✅ Updated types and interfaces
7. ✅ Updated UI to reflect local storage
8. ✅ Added comprehensive testing

## Testing

### Automated Tests
- Theme persistence logic verified
- Cookie functionality tested
- Fallback scenarios covered

### Manual Testing Checklist
- [ ] Theme changes apply immediately
- [ ] Theme persists across page reloads
- [ ] Theme works without authentication
- [ ] Theme works in incognito mode
- [ ] Cookie visible in browser dev tools
- [ ] No theme-related API calls in network tab
- [ ] Settings page shows "Saved locally" badge
- [ ] All three themes (light/dark/system) work

## Troubleshooting

### Common Issues

**Theme not persisting:**
- Check browser cookies for `codejoin-theme`
- Ensure cookies are enabled
- Check browser console for errors

**Theme flashing on load:**
- Verify ThemeProviderWrapper is used in layout
- Check server-side cookie reading
- Ensure proper SSR configuration

**Theme not updating immediately:**
- Check `useThemePersistent` hook usage
- Verify `setClientThemeCookie` is called
- Check for JavaScript errors

## Backward Compatibility

- Existing Supabase theme data is ignored but not removed
- No breaking changes to other settings functionality
- Graceful fallback to system theme
- No impact on user authentication or other preferences

## Future Considerations

- Theme could be extended with custom themes
- Cookie settings could be configurable
- Theme synchronization across devices (optional feature)
- Theme presets for different use cases

## Security Notes

- Theme data is non-sensitive, stored in cookies
- No personal information in theme cookies
- Standard browser cookie security measures apply
- No additional security concerns introduced