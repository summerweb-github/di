import { classMetadataKey } from './const';
import type { BindingKey, ScopeEnum } from './binding';

export interface ClassMetadata {
  scope?: ScopeEnum;
  dependencies: Map<number, { binding: BindingKey<unknown>; options?: InjectOptions }>;
}

export type EnumObject<T> = T[keyof T];

export interface InjectOptions {
  optional?: boolean;
}

declare global {
  interface Function {
    [classMetadataKey]?: ClassMetadata;
  }
}
