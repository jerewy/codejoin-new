# Toast Notification System Guide

This document explains how the toast notification system works in CodeJoin and best practices for using it.

## System Overview

CodeJoin uses a **dual toast system**:

1. **Custom Radix UI Toasts** (`components/ui/toast.tsx`) - For standard application notifications
2. **Sonner Toasts** (`components/ui/sonner-toaster.tsx`) - For error handling and system notifications

Both systems are styled to match the application's design system.

## Design System Colors

The toast system uses your design system colors:

- **Primary**: `hsl(var(--primary))` - Orange accent color (16 100% 50%)
- **Background**: `hsl(var(--background))` - Light/dark theme aware
- **Foreground**: `hsl(var(--foreground))` - Light/dark theme aware
- **Destructive**: `hsl(var(--destructive))` - Error red
- **Muted**: `hsl(var(--muted))` - Secondary gray
- **Border**: `hsl(var(--border))` - Subtle borders

## When to Use Each System

### Custom Radix UI Toasts (`useToast` hook)
**Use for:**
- User action confirmations (save, delete, copy)
- Form validation feedback
- Standard application notifications
- Success messages

```typescript
import { useToast } from "@/hooks/use-toast"

const { toast } = useToast()

toast({
  title: "Success!",
  description: "Your changes have been saved.",
  variant: "default", // or "destructive"
})
```

### Sonner Toasts (`toast` from "sonner")
**Use for:**
- Error handling (GlobalErrorHandler)
- System-level notifications
- File upload progress/status
- Quick notifications that don't need complex structure

```typescript
import { toast } from "sonner"

toast.success("File uploaded successfully")
toast.error("Upload failed")
toast.info("Processing...")
```

## Rate Limiting & Smart Toasts

The GlobalErrorHandler includes intelligent rate limiting to prevent toast spam:

- **Error Deduplication**: Same error type won't show multiple times within 10 seconds
- **Consecutive Error Limiting**: Prevents infinite error loops
- **Smart Timing**: Different error types have different cooldown periods:
  - Module call errors: 10-15 seconds
  - Chunk load errors: 5 seconds
  - Generic errors: 12 seconds
  - Dimension errors: 8 seconds

## Best Practices

### 1. Be Conservative with Errors
Only show error toasts for user-actionable problems. System errors should be logged but may not need user notification.

### 2. Use Appropriate Variants
- Use `default` for success/info messages
- Use `destructive` for errors that require user attention
- Use `description` for additional context

### 3. Keep Messages Clear and Concise
```typescript
// Good
toast({
  title: "Project created",
  description: "Your new project is ready to use."
})

// Avoid
toast({
  title: "The project has been successfully created in the system",
  description: "All database records have been updated and the project structure has been initialized."
})
```

### 4. Use Actions for User Response
```typescript
toast({
  title: "Connection lost",
  description: "Unable to connect to the server.",
  action: (
    <ToastAction onClick={handleReconnect}>
      Reconnect
    </ToastAction>
  )
})
```

## Styling Customization

### Toast Styling
Toast styles are defined in `components/ui/toast.tsx` using class-variance-authority:

```typescript
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive: "destructive group border-destructive bg-destructive text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)
```

### Sonner Styling
Sonner styles are configured in `components/ui/sonner-toaster.tsx`:

```typescript
<Toaster
  toastOptions={{
    style: {
      background: "hsl(var(--background))",
      border: "1px solid hsl(var(--border))",
      color: "hsl(var(--foreground))",
      borderRadius: "calc(var(--radius) - 2px)",
    },
    // Variant-specific styles...
  }}
/>
```

## Troubleshooting

### Toasts Not Showing
1. Ensure `<Toaster />` and `<SonnerToasterStyled />` are in your layout
2. Check that the theme provider is wrapping your components
3. Verify CSS variables are properly defined

### Toasts Wrong Color
1. Check `globals.css` for proper CSS variable definitions
2. Ensure theme switching is working correctly
3. Verify Tailwind CSS is processing your custom colors

### Too Many Error Toasts
1. The rate limiting should prevent this automatically
2. Check console for "Error rate limited" messages
3. Verify error deduplication is working

## Files Involved

- `components/ui/toast.tsx` - Custom Radix UI toast components
- `components/ui/sonner-toaster.tsx` - Sonner configuration
- `hooks/use-toast.ts` - Custom toast hook and state management
- `components/global-error-handler.tsx` - Error handling with rate limiting
- `app/layout.tsx` - Toast providers in app layout
- `app/globals.css` - Design system CSS variables
- `tailwind.config.ts` - Tailwind color configuration