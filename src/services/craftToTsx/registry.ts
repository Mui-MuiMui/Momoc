/**
 * Component generator registry.
 * Each generator is registered by its resolvedName (e.g. "CraftButton").
 */

import type { ComponentGenerator } from "./types.js";

const registry = new Map<string, ComponentGenerator>();

export function registerGenerator(resolvedName: string, generator: ComponentGenerator): void {
  registry.set(resolvedName, generator);
}

export function getGenerator(resolvedName: string): ComponentGenerator | undefined {
  return registry.get(resolvedName);
}

export function getAllGenerators(): ReadonlyMap<string, ComponentGenerator> {
  return registry;
}
