import { Scope } from '../const';
import { BindingType } from './const';
import type { EnumObject } from '../types.ts';

export type Newable<T = unknown> = new (...args: unknown[]) => T;

export type Callable = (...args: unknown[]) => unknown;

export type BindingSource<V> = Newable<V> | V | Callable;

export type LazyClassLoader<V> = () => Newable<V> | Promise<Newable<V>>;
export type LazyFunctionLoader<V> = () => V | Promise<V>;
export type LazyConstantLoader<V> = () => V | Promise<V>;

export type BindingTypeEnum = EnumObject<typeof BindingType>;
export type ScopeEnum = EnumObject<typeof Scope>;
