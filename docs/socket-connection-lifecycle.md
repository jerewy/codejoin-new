# Socket connection lifecycle during redirects

This note documents why the backend occasionally logs `User disconnected` and
how to avoid unnecessary disconnects when navigating around the app.

## Where the message comes from

The Socket.IO server logs the message from the `disconnect` listener in
[`server.js`](../server.js). Whenever a socket closes—for example because the
browser navigated away—the server prints `User disconnected: <socket id>` to the
terminal.

## Why redirects triggered the log

The React tree opens the Socket.IO client in the `SocketProvider`. When that
provider unmounts it calls `socketInstance.close()`, which tells the server that
the client left. We discovered that some redirects rendered raw `<a>` tags. Raw
anchors trigger a **full page reload** instead of a client-side transition,
which unmounts the provider and closes the socket. The server then prints the
`User disconnected` message.

## Mitigation

Prefer Next.js navigation helpers (`next/link`, `useRouter().push`, etc.) so the
page transitions happen on the client. The provider remains mounted and the
socket stays connected.

We fixed the most noticeable occurrence by replacing the login link in the
protected-route fallback with a `<Link href="/login">`. If new pages introduce a
hard navigation, look for raw `<a>` tags or `window.location` mutations and
replace them with Next.js navigation primitives.

## When the log is expected

It is normal to see `User disconnected` when the user intentionally leaves the
app (closing the tab, refreshing, or losing connectivity). The message is
informational; if you need to perform cleanup before disconnects, emit a custom
Socket.IO event such as `leave-project` before navigating away.
