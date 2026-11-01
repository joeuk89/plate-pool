# Carrying an inventory inline in a URL

Researched 2026-11-01 for the version 3 kit screen. The set-up link carries the whole inventory in the URL. This note establishes the sizes and limits that the link must respect, organised as the five questions of the research ticket.

Each number carries its source. Where a limit is undocumented, this note says so and gives the nearest measured or secondary figure instead.

## 1. Size of the owner's inventory in a link

Measured on `inventory/inventory.json` at commit `c74ea94` with Node 22.23.4: parse, `JSON.stringify` with no whitespace, `zlib.deflateRawSync` at level 9, `Buffer.toString("base64url")`.

| Stage | Size |
| --- | --- |
| File on disk | 4,902 bytes |
| Minified JSON | 3,586 bytes |
| deflate-raw | 1,007 bytes |
| base64url | 1,343 characters |
| Full link `https://joeuk89.github.io/plate-pool/#kit=` + payload | 1,385 characters |

Deflate level 6 (Node's default) gives 1,006 bytes and 1,342 characters, so the level does not matter. The payload is 37.5% of the minified JSON. Without compression the base64url payload would be 4,782 characters.

The owner's file holds five implements and twelve plate types. A gym with more implements or more plate types grows the payload roughly in proportion; deflate finds most of its savings in repeated keys, so the ratio holds.

## 2. URL length limits that matter

Summary: the only hard limits below 32 KB come from the web server (about 8.2 KB on GitHub Pages) and from QR codes (2,953 bytes). Browsers, the share sheet and the Web Share API set no limit that a few kilobytes would reach.

### Android Chrome

- **Accepted URL: 2 MiB.** `url::kMaxURLChars = 2 * 1024 * 1024` in Chromium's `url/url_constants.h`, "Max GURL length passed between processes". Chromium's URL display guidelines say Chrome "limits URLs to a maximum length of 2MB for practical reasons" to "avoid causing denial-of-service problems in inter-process communication". Source: [url_constants.h](https://chromium.googlesource.com/chromium/src/+/main/url/url_constants.h), [URL display guidelines, "URL Length"](https://chromium.googlesource.com/chromium/src/+/main/docs/security/url_display_guidelines/url_display_guidelines.md).
- **Address bar display: 32 KiB.** `kMaxURLDisplayChars = 32 * 1024` in `content/public/common/content_constants.cc`; the guidelines say the omnibox "limits URL display to 32kB" on most platforms. The page still loads with the full URL; only the text shown is cut. Source: [content_constants.cc](https://chromium.googlesource.com/chromium/src/+/main/content/public/common/content_constants.cc).
- **Share sheet: no documented limit in Chrome.** Chrome's Android Web Share implementation passes `title`, `text` and `url` separately to `ShareParams` with no length check on any of them; the only size constants are for files (`MAX_SHARED_FILE_COUNT = 10`, `MAX_SHARED_FILE_BYTES = 50 * 1024 * 1024`). Source: [ShareServiceImpl.java](https://chromium.googlesource.com/chromium/src/+/main/components/browser_ui/webshare/android/java/src/org/chromium/components/browser_ui/webshare/ShareServiceImpl.java). The shared text travels in an Android `Intent`, and Android's Binder transaction buffer "has a limited fixed size, currently 1MB", shared by all in-flight transactions in the process; exceeding it throws `TransactionTooLargeException`. Source: [TransactionTooLargeException.java](https://android.googlesource.com/platform/frameworks/base/+/main/core/java/android/os/TransactionTooLargeException.java). A link of a few kilobytes is three orders of magnitude under that. What the receiving app does with a long link (Messages, WhatsApp, Gmail, Keep) is undocumented and varies per app; the only way to know is to test the apps the owner uses.

### iOS Safari

- **Accepted URL: 64 MiB in WebKit.** `maximumURLSize = 0x04000000` in `Source/WebCore/page/SecurityOrigin.cpp`, checked in `SecurityOrigin::canDisplay`. The same function caps the fragment at `maximumFragmentIdentifierSize = 2 * 1024 * 1024` (2 MiB). WebKit raised the URL cap from 32 KB to 64 MB in January 2020 ([bug 205979](https://bugs.webkit.org/show_bug.cgi?id=205979)). Source: [SecurityOrigin.cpp](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/SecurityOrigin.cpp).
- **Address bar display: undocumented.** A 2021 report said Safari's address bar trims URLs to 4,096 characters while still requesting the full URL; WebKit closed it as "a non-WebKit issue" because the address bar is Apple's, not WebKit's ([bug 231652](https://bugs.webkit.org/show_bug.cgi?id=231652)). Apple publishes no figure. A 1.4 KB link is under that trim point anyway.
- **Share sheet: undocumented.** Apple publishes no size limit for `UIActivityViewController`. Nothing found suggests a few kilobytes is a problem.

### Web Share API

- **No size limit in the spec.** `title`, `text` and `url` are `USVString` with no maximum length. The `url` must parse and use `http`, `https` or a user-agent safelisted scheme; `file`, `javascript`, `ws` and `wss` are rejected. `share()` rejects with `TypeError` on invalid data, `NotAllowedError` without transient activation, and `AbortError` when the user cancels. The URL is normalised, never truncated. Source: [Web Share API](https://w3c.github.io/web-share/).
- **Chromium enforces the same.** The browser-side `ShareServiceImpl` checks only the URL scheme ("Web Share URL scheme must be http or https") and the file limits; no URL, text or title length check. Source: [share_service_impl.cc](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.cc), [share_service_impl.h](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/webshare/share_service_impl.h).
- **Support.** `navigator.share`: Chrome Android 61, Safari 12.1 (iOS same), Chrome desktop 128 (89 to 127 only on ChromeOS and Windows), Firefox Android 79, Android WebView none. `navigator.canShare`: Chrome Android 75, Safari 14. Source: [MDN browser-compat-data, `api/Navigator.json`](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json).

### QR codes

- **Hard cap: 2,953 bytes** in byte mode at version 40 (177 × 177 modules), error-correction level L. At M it is 2,331, at Q 1,663, at H 1,273. The figures come from ISO/IEC 18004 Table 7, which is paywalled; the copies consulted agree ([Thonky capacity table](https://www.thonky.com/qr-code-tutorial/character-capacities), [Han-Soft QR reference](https://han-soft.com/releases/barcode2d/documents/b_qrcode.html)); DENSO WAVE's own site gives the 40-L figure of 2,953 and the module counts ([qrcode.com](https://www.qrcode.com/en/about/version.html)).
- **The owner's link needs a large code.** base64url contains lower-case letters, so it falls outside QR alphanumeric mode and must use byte mode. The 1,385-character link fits version 27 at level L (1,465 capacity) or version 31 at level M (1,452). It does not fit at level H at any version (40-H holds 1,273). A version 27 code is 125 × 125 modules, which scans from a phone screen but not reliably from a small print. A QR code is a stretch goal for this link size, not a given.
- **Uncompressed does not fit.** 4,782 characters is over the 2,953 cap, so compression is a precondition for any QR route.

### GitHub Pages

- **Documented limits say nothing about URLs.** The published limits are site size (1 GB), bandwidth (100 GB per month, soft), builds (10 per hour, soft) and deploy time (10 minutes). Source: [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits).
- **Measured request-line limit: about 8.2 KB.** Probed on 2026-11-01 against `https://joeuk89.github.io/plate-pool/?kit=aaa…` with a Node script. Query strings of 8,000 and 8,171 characters returned 200; 8,187 and above returned `414 Request-URI Too Large` from `Server: Varnish` (the Fastly edge in front of GitHub Pages, `Via: 1.1 varnish`). The largest accepted full URL was 8,213 to 8,229 characters. At 131,000 characters the edge returned 502. This matches the HTTP floor: RFC 9112 section 3 says "HTTP does not place a predefined limit on the length of a request-line" but "It is RECOMMENDED that all HTTP senders and recipients support, at a minimum, request-line lengths of 8000 octets", and a server that will not parse a longer target "MUST respond with a 414". Source: [RFC 9112 section 3](https://datatracker.ietf.org/doc/html/rfc9112#section-3), [RFC 9110 section 4.1](https://datatracker.ietf.org/doc/html/rfc9110#section-4.1).
- **The fragment never reaches the server.** RFC 3986 section 3.5: "the fragment identifier is separated from the rest of the URI prior to a dereference". RFC 9112's `origin-form = absolute-path [ "?" query ]` has no fragment. A link with a 100,000-character fragment returned 200 in the same probe. Source: [RFC 3986 section 3.5](https://datatracker.ietf.org/doc/html/rfc3986#section-3.5), [RFC 9112 section 3.2](https://datatracker.ietf.org/doc/html/rfc9112#section-3.2).

### Service worker

- **No length limit of its own.** The worker receives a `Request` whose `url` is the request's URL "serialized", fragment included if the browser kept one; `Cache.match` compares URLs "with the exclude fragment flag set" and compares the query string unless `ignoreSearch` is true (default false). Source: [Fetch, Request constructor and `url` getter](https://fetch.spec.whatwg.org/#request-class), [Service Workers, "Request Matches Cached Item"](https://w3c.github.io/ServiceWorker/#request-matches-cached-item-algorithm), [MDN `Cache.match`](https://developer.mozilla.org/en-US/docs/Web/API/Cache/match).
- **plate-pool's worker today.** `packages/web/sw/worker.ts` answers navigations network-first and falls back to the precached `index.html` on a network error or a 4-second timeout. A 414 is a successful fetch, so a query-carried inventory over the edge limit would show GitHub's 414 page online and work only offline.

## 3. CompressionStream and DecompressionStream offline

Summary: available in every browser the app targets, offline included; the fallback is a small inflate library or no compression.

- **Spec.** `CompressionStream` and `DecompressionStream` accept `"deflate"` (RFC 1950), `"deflate-raw"` (RFC 1951), `"gzip"` (RFC 1952) and, newest, `"brotli"`. Both are `[Exposed=*]`, so they exist in windows and workers. The spec sets no secure-context requirement and "doesn't add any new privileges to the web platform". Source: [Compression Streams](https://compression.spec.whatwg.org/).
- **Support.** Interface: Chrome 80, Safari 16.4, Firefox 113. `deflate-raw` format: Chrome 103, Safari 16.4, Firefox 113. Chrome Android, iOS Safari, Android WebView and Samsung Internet mirror their desktop counterparts in browser-compat-data. Source: [MDN browser-compat-data, `api/CompressionStream.json`](https://github.com/mdn/browser-compat-data/blob/main/api/CompressionStream.json).
- **Offline.** These are built-in engine APIs with no network dependency, so they work in the installed app with no connection. An installed web app on Android runs in Chrome; on iOS it runs in WebKit, so the Safari figures apply. iOS 16.4 (March 2023) is the floor.
- **Fallback.** Detect with `typeof DecompressionStream === "undefined"`. Two choices: ship a small inflate implementation (fflate's inflate-only build is a few kilobytes, pako is larger) or accept an uncompressed base64url payload (4,782 characters for the owner's file, which still passes every browser and share limit above but not QR). Given a 2023 floor, a library fallback is hard to justify; the kit screen can refuse with a clear message on an older browser.
- **Decode path.** `DecompressionStream("deflate-raw")` pipes a `Blob` or `Uint8Array` stream and `Response.text()` collects it; the whole decode is a few lines and needs no worker.

## 4. Hashing in the browser

Summary: `crypto.subtle.digest("SHA-256", bytes)` is available in the installed app online and offline, because the origin is HTTPS.

- **Spec.** `SubtleCrypto` is `[SecureContext, Exposed=(Window,Worker)]` and `crypto.subtle` is `[SecureContext]`; `digest(algorithm, data)` returns `Promise<ArrayBuffer>`. Recognised names: `SHA-1` (not for security), `SHA-256`, `SHA-384`, `SHA-512`. Source: [Web Cryptography API](https://w3c.github.io/webcrypto/), [MDN `SubtleCrypto.digest`](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest).
- **Support.** `SubtleCrypto`: Chrome 37, Safari 11 (prefixed `webkitSubtle` from 7 to 11.1), Firefox 34. `digest`: Chrome 41, Safari 7, Firefox 34. Secure context required from Chrome 60, Firefox 75, Safari 15. Mobile browsers mirror desktop. Source: [MDN browser-compat-data, `api/SubtleCrypto.json`](https://github.com/mdn/browser-compat-data/blob/main/api/SubtleCrypto.json).
- **Secure context is a property of the origin, not of the connection at the time.** An origin whose scheme is `https` is "potentially trustworthy"; `localhost` and `file` also qualify. A page served from the service worker cache keeps its `https://joeuk89.github.io` origin, so it is a secure context with no network. Service workers "are always secure contexts" and may only have clients that are. Source: [Secure Contexts](https://w3c.github.io/webappsec-secure-contexts/), [MDN Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
- **Local development.** `http://localhost` is a secure context, so `crypto.subtle` works under Vite's dev server. An `http://` LAN address (phone testing) is not; use HTTPS or port forwarding.
- **What to hash.** The coach's `inventory_sha256` is over the file bytes. The browser must hash the same bytes, so the link must carry the inventory bytes as written (not re-serialised) or the two sides must agree on a canonical form. The research in this note did not settle that; it is a spec question for the hash ticket.

## 5. Hash fragment or query parameter

Summary: the fragment. It avoids the 8.2 KB server limit, keeps the inventory out of server and edge logs, and leaves the service worker's cache matching alone.

| Concern | `#kit=` | `?kit=` |
| --- | --- | --- |
| Sent to GitHub Pages | Never (RFC 3986 section 3.5) | Yes; 414 above about 8.2 KB (measured) |
| Appears in Fastly and GitHub logs, `Referer` headers | No | Yes |
| Service worker cache match | Fragment excluded by spec; precached `index.html` matches | Query compared unless `ignoreSearch`; the worker's app-shell fallback covers it today, but a 414 online is served as-is |
| Reaches the page | `location.hash`, same-document; no reload if changed by script | `location.search`; a navigation |
| Survives share sheet, paste, QR | Yes, it is part of the URL string | Yes |
| Browser length limits | 2 MiB fragment cap in WebKit, 2 MiB URL in Chrome | Same |
| Existing plate-pool links (`?barbell=173`) | Unaffected; both can coexist | Shares the namespace and the 8.2 KB budget |

Two costs of the fragment. The app must read `location.hash` on load and on `hashchange`, and should call `history.replaceState` to drop the payload from the address bar once the kit is stored, so the share button shares a short link and not the inventory. And a `#` link cannot be read by a server, which is no loss here: the app has no server.

## What the kit screen must respect

- The owner's inventory is 1,343 base64url characters compressed; budget for a few kilobytes, not tens.
- Carry the payload in the fragment, `#kit=<base64url(deflate-raw(minified JSON))>`. Never in the query: GitHub Pages' edge returns 414 above about 8.2 KB of URL, and a query is logged.
- Keep the whole link under 8 KB anyway, so a future query-carried link or a copy-paste into a form field still works; warn at the kit screen if a pasted file compresses to more than that.
- Decode with `DecompressionStream("deflate-raw")`; require Chrome 103 or iOS 16.4 and show a plain message below that. Ship no inflate library.
- Hash with `crypto.subtle.digest("SHA-256", …)`; it works offline because the origin is HTTPS. Test on `localhost` or over HTTPS, never on a plain `http://` LAN address.
- After storing the kit, replace the URL with the bare app URL so the share button and the address bar carry no inventory.
- Treat a QR code as optional: the compressed link needs a version 27 (125 × 125) code at level L, and an uncompressed one does not fit at all.
- Change nothing in the service worker for the fragment: it is never sent to the network and the spec excludes it from cache matching.
