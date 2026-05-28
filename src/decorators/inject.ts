import { BindingKey } from '../binding';
import { classMetadataKey } from '../const';
import { Logger } from '../logger';
import type { ClassMetadata, InjectOptions } from '../types';

type InjectableConstructor = abstract new (...args: unknown[]) => unknown;

export function Inject<T>(
  binding: BindingKey<T>,
  options?: InjectOptions
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    const constructor = (
      propertyKey === undefined
        ? (target as InjectableConstructor)
        : target.constructor
    ) as InjectableConstructor & {
      [classMetadataKey]?: ClassMetadata;
    };

    let meta = constructor[classMetadataKey];
    if (!meta) {
      meta = {
        dependencies: new Map(),
      };
      constructor[classMetadataKey] = meta;
    }

    meta.dependencies.set(parameterIndex, { binding, options });

    Logger.log(
      { propertyKey, parameterIndex, binding, options },
      'inject dependency'
    );
  };
}
