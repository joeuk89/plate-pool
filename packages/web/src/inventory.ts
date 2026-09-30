import { readInventory } from "@plate-pool/core";
import data from "../../../inventory/inventory.json";

export const inventory = readInventory(data);
