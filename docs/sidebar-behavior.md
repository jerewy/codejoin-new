# Sidebar Auto-Close Behaviour

## Relevant File
- `components/app-layout.tsx`
  - Wraps all protected routes in the shared layout, including the sidebar provider.

## How It Works
- The component reads the active app-route segment via `useSelectedLayoutSegment()`.
- It keeps the sidebar open state in a React `useState<boolean>` (`isSidebarOpen`).
- A list of routes (`sidebarRoutes`) determines which pages show the sidebar; `project` is included so the UI still renders, but:
  - `isProjectPage` flags when the active segment equals `"project"`.
  - On first mount, the layout restores the saved open/closed state from `localStorage`, **but** immediately forces it to `false` if you are on a project page.
  - A second `useEffect` watches `isProjectPage` and:
    1. Closes the sidebar whenever you enter `/project/[id]` (`setIsSidebarOpen(false)`).
    2. Restores the last saved state when you leave the project section.
- A third effect persists the open/closed value to `localStorage` (skipped while viewing project pages so the stored preference isn’t overwritten by the forced close).

## Provider Wiring
```tsx
return (
  <SidebarProvider
    open={isSidebarOpen}
    onOpenChange={(open) => {
      if (!isProjectPage) {
        setIsSidebarOpen(open);
      }
    }}
  >
    <AppSidebar />
    <SidebarInset>
      <main className="flex-1">{children}</main>
    </SidebarInset>
  </SidebarProvider>
);
```
- The sidebar gets its `open` state from layout-level state, not internal storage, which allows the layout to force-close it as needed.
- While viewing a project, the `onOpenChange` guard prevents reopening (via trigger or hotkey).

## Modifying the Behaviour
- To keep the sidebar open on project pages, remove or adjust the `isProjectPage` checks:
  - Delete the `if (isProjectPage) { setIsSidebarOpen(false); }` block inside the dependency-based effect.
  - Allow the `onOpenChange` handler to run even when `isProjectPage` is `true`.
- To close the sidebar on additional routes, add their segments to `sidebarRoutes` and handle them the same way as `project` (e.g., define another boolean like `isFocusedFlow` and reuse the same effect logic).

## Manual Close Trigger
- Anywhere else in the app you can import `useSidebar()` from `@/components/ui/sidebar` and call `setOpen(false)` or `toggleSidebar()` in response to a navigation event.
- Example for a project link:
  ```tsx
  const { setOpen } = useSidebar();
  const router = useRouter();

  const handleOpenProject = (id: string) => {
    router.push(`/project/${id}`);
    setOpen(false);
  };
  ```

## Summary
- The auto-close is controlled at the layout level, not inside the sidebar component itself.
- `isProjectPage` + the `useEffect` pair enforce the closed state whenever you load `/project/[id]`.
- Local storage remembers the last non-project value so your preferred sidebar width returns after you leave the builder.
