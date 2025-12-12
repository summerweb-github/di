import { BindingKey } from '../binding';
import { classMetadataKey } from '../const';
import { Logger } from '../logger';
import type { InjectOptions } from '../types';

export function Inject<T>(
  binding: BindingKey<T>,
  options?: InjectOptions
): ParameterDecorator {
  return (
    target: object,
    propertyKey: string | symbol | undefined,
    parameterIndex: number
  ) => {
    const constructor =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
      propertyKey === undefined ? (target as Function) : target.constructor;

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
