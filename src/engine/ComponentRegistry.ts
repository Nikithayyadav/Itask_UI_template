import type { ComponentType } from "react";

export type ComponentRegistryType = Record<
  string,
  ComponentType<any>
>;

const componentRegistry: ComponentRegistryType = {};

export const registerComponent = (
  name: string,
  component: ComponentType<any>
): void => {
  componentRegistry[name] = component;
};

export const getComponent = (
  name: string
): ComponentType<any> | undefined => {
  return componentRegistry[name];
};

export const getRegisteredComponents = (): string[] => {
  return Object.keys(componentRegistry);
};