import { InventoryError, readInventory, type Inventory } from "@plate-pool/core";

export interface KitFile {
  /** The file's bytes as received, decoded without dropping a byte-order mark, so encoding it again gives the same bytes. */
  text: string;
  sha256: string;
  inventory: Inventory;
}

export type KitRead = { kit: KitFile } | { errors: string[] };

const damagedLink = "This set-up link is damaged, so it holds no inventory. Open it again, or paste the inventory file below.";

function hex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function errorsOf(error: unknown): string[] {
  return error instanceof InventoryError ? error.errors : [String(error)];
}

export function inventoryOf(text: string): Inventory {
  return readInventory(text.replace(/^﻿/, ""));
}

export async function kitFromBytes(bytes: Uint8Array<ArrayBuffer>): Promise<KitRead> {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes);
  } catch {
    return { errors: ["inventory: not UTF-8 text"] };
  }
  let inventory: Inventory;
  try {
    inventory = inventoryOf(text);
  } catch (error) {
    return { errors: errorsOf(error) };
  }
  return { kit: { text, inventory, sha256: hex(await crypto.subtle.digest("SHA-256", bytes)) } };
}

export function kitFromText(text: string): Promise<KitRead> {
  return kitFromBytes(new TextEncoder().encode(text));
}

/** The payload of a set-up link's `#inventory=` fragment, or undefined when the fragment carries none. */
export function setupPayload(hash: string): string | undefined {
  return new URLSearchParams(hash.replace(/^#/, "")).get("inventory") ?? undefined;
}

function base64url(payload: string): Uint8Array<ArrayBuffer> {
  const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
}

export async function kitFromSetupLink(payload: string): Promise<KitRead> {
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    const inflated = new Response(base64url(payload)).body!.pipeThrough(new DecompressionStream("deflate-raw"));
    bytes = new Uint8Array(await new Response(inflated).arrayBuffer());
  } catch {
    return { errors: [damagedLink] };
  }
  return kitFromBytes(bytes);
}

export function shortHash(kit: KitFile): string {
  return kit.sha256.slice(0, 8);
}

function counted(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function kitSummary(inventory: Inventory): string {
  return [
    counted(inventory.implements.length, "implement", "implements"),
    counted(inventory.plates.length, "plate entry", "plate entries"),
    counted(inventory.hardware.length, "hardware item", "hardware items"),
  ].join(", ");
}
