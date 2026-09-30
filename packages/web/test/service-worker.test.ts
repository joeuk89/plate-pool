// @vitest-environment node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { buildApp, type Deployment } from "./build-app";

const scope = "https://joeuk89.github.io/plate-pool/";

type FetchInput = string | URL | { url: string };
type Listener = (event: object) => void;

function urlOf(input: FetchInput): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function deployedFiles(outDir: string, dir = outDir): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? deployedFiles(outDir, path) : [relative(outDir, path)];
  });
}

class Server {
  deployment: Deployment | undefined;
  online = true;
  hang = false;

  fetch = async (input: FetchInput): Promise<Response> => {
    if (this.hang) return new Promise<Response>(() => {});
    if (!this.online || !this.deployment) throw new TypeError("Failed to fetch");
    const url = new URL(urlOf(input));
    const file = url.pathname.slice(new URL(scope).pathname.length) || "index.html";
    const path = join(this.deployment.outDir, file);
    if (!existsSync(path) || statSync(path).isDirectory()) return new Response("Not found", { status: 404 });
    return new Response(readFileSync(path));
  };
}

class Caches {
  private stores = new Map<string, Map<string, Response>>();

  constructor(private server: Server) {}

  async open(name: string) {
    let store = this.stores.get(name);
    if (!store) this.stores.set(name, (store = new Map()));
    return {
      addAll: async (requests: FetchInput[]) => {
        const responses = await Promise.all(requests.map((request) => this.server.fetch(request)));
        const failed = requests.filter((_request, index) => !responses[index]!.ok);
        if (failed.length > 0) throw new TypeError(`Precache failed: ${failed.map(urlOf).join(", ")}`);
        requests.forEach((request, index) => store.set(urlOf(request), responses[index]!));
      },
    };
  }

  async match(request: FetchInput) {
    for (const store of this.stores.values()) {
      const response = store.get(urlOf(request));
      if (response) return response.clone();
    }
    return undefined;
  }

  async keys() {
    return [...this.stores.keys()];
  }

  async delete(name: string) {
    return this.stores.delete(name);
  }
}

class Browser {
  server = new Server();
  caches = new Caches(this.server);
  private worker: Map<string, Listener> | undefined;

  async install(deployment: Deployment) {
    const listeners = new Map<string, Listener>();
    const self = {
      addEventListener: (type: string, listener: Listener) => listeners.set(type, listener),
      registration: { scope },
      caches: this.caches,
      fetch: (input: FetchInput) => this.server.fetch(input),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    };
    new Function("self", readFileSync(join(deployment.outDir, "sw.js"), "utf8"))(self);
    await this.lifecycle(listeners, "install");
    await this.lifecycle(listeners, "activate");
    this.worker = listeners;
  }

  async visit(url: string): Promise<string | undefined> {
    return this.request({ url: new URL(url, scope).href, method: "GET", mode: "navigate" });
  }

  async get(url: string): Promise<string | undefined> {
    return this.request({ url: new URL(url, scope).href, method: "GET", mode: "no-cors" });
  }

  private async request(request: { url: string; method: string; mode: string }): Promise<string | undefined> {
    let responded: Promise<Response> | undefined;
    this.worker?.get("fetch")?.({ request, respondWith: (response: Promise<Response>) => (responded = response) });
    const response = await (responded ?? this.server.fetch(request)).catch(() => undefined);
    return response?.ok ? response.text() : undefined;
  }

  private async lifecycle(listeners: Map<string, Listener>, type: string) {
    const pending: Promise<unknown>[] = [];
    listeners.get(type)?.({ waitUntil: (promise: Promise<unknown>) => pending.push(promise) });
    await Promise.all(pending);
  }
}

function text(deployment: Deployment, file: string): string {
  return readFileSync(join(deployment.outDir, file), "utf8");
}

let first: Deployment;
let second: Deployment;

beforeAll(async () => {
  first = await buildApp({ title: "plate-pool first" });
  second = await buildApp({ title: "plate-pool second" });
}, 60_000);

afterAll(() => {
  first.remove();
  second.remove();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("offline", () => {
  it("after the first visit, loads every page and every file of the app with no network", async () => {
    const browser = new Browser();
    browser.server.deployment = first;
    await browser.visit("./");
    await browser.install(first);

    browser.server.online = false;
    expect(await browser.visit("./")).toBe(text(first, "index.html"));
    expect(await browser.visit("./?barbell=173&dumbbells=40")).toBe(text(first, "index.html"));
    for (const file of deployedFiles(first.outDir)) {
      if (file === "sw.js") continue;
      expect(await browser.get(file), file).toBe(text(first, file));
    }
  });

  it("falls back to the cached copy when the network does not answer", async () => {
    const browser = new Browser();
    browser.server.deployment = first;
    await browser.install(first);

    vi.useFakeTimers();
    browser.server.hang = true;
    const page = browser.visit("./");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await page).toBe(text(first, "index.html"));
  });
});

describe("a new deployment", () => {
  it("changes the service worker, so the browser installs it on the next visit with a network", () => {
    expect(text(second, "sw.js")).not.toBe(text(first, "sw.js"));
  });

  it("shows on the next visit with a network, and replaces the cached copy", async () => {
    const browser = new Browser();
    browser.server.deployment = first;
    await browser.install(first);

    browser.server.deployment = second;
    expect(await browser.visit("./")).toBe(text(second, "index.html"));
    await browser.install(second);

    browser.server.online = false;
    expect(await browser.visit("./")).toBe(text(second, "index.html"));
    expect(await browser.caches.keys()).toHaveLength(1);
  });
});
