import { Binding, BindingKey } from './binding';
import { BindingType } from './binding/const';
import { classMetadataKey, Scope, SimpleTypes } from './const';
import { Logger } from './logger';
import type { Newable } from './binding/types';

/**
 * Dependency Injection Container
 *
 * A container that manages dependencies and their lifecycle.
 * It allows binding values, classes, and functions to keys and resolving them when needed.
 * Supports singleton and transient scopes for class bindings.
 */
export class DIContainer {
  private registry = new Map<symbol, Binding<unknown>>();
  private instances = new Map<symbol, unknown>();

  /**
   * Binds a key to a new binding instance
   *
   * @template V - The type of value being bound
   * @param key - The binding key to register
   * @returns The created binding instance for further configuration
   */
  bind<V>(key: BindingKey<V>) {
    const binding = new Binding<V>(key);
    this.registry.set(key.getKey(), binding);
    Logger.log(
      {
        key: binding.getKey().getKey(),
        type: binding.getType(),
        scope: binding.getScope(),
      },
      `new bind`
    );
    return binding;
  }

  /**
   * Resolves a dependency by its key
   *
   * This is the main method for dependency resolution. It will:
   * 1. Look for an existing binding for the key
   * 2. If no binding exists but a default is provided, create a new binding
   * 3. Return constant values directly
   * 4. Return function values directly
   * 5. For class bindings:
   *    - Return existing instance if in singleton scope
   *    - Create new instance resolving dependencies recursively
   *    - Store instance if in singleton scope
   *
   * @template V - The type of value being resolved
   * @param key - The binding key to resolve
   * @returns The resolved value
   * @throws Error if no binding is found for the key
   */
  resolve<V>(key: BindingKey<V>): V {
    let binding = this.registry.get(key.getKey()) as Binding<V> | undefined;

    const defaultBinding = key.getDefaultBinding();
    if (!binding && defaultBinding) {
      const newBinding = this.bind(key);
      if (SimpleTypes.some((t) => t === typeof defaultBinding)) {
        newBinding.toConstant(defaultBinding as V);
      } else if (typeof defaultBinding === 'function') {
        if (defaultBinding.toString().startsWith('class')) {
          const scope =
            defaultBinding[classMetadataKey]?.scope ?? Scope.SINGLETON;
          newBinding.toClass(defaultBinding as Newable).toScope(scope);
        } else {
          newBinding.toFunction(defaultBinding);
        }
      }
      binding = newBinding;
    }

    if (!binding) {
      throw new Error(`No binding found for key: ${key.getKey().toString()}`);
    }

    if (binding.getType() === BindingType.CONSTANT) {
      return binding.getValue();
    }

    if (binding.getType() === BindingType.FUNCTION) {
      return binding.getFunction();
    }

    const cls = binding.getClass();
    const clsInstance = this.instances.get(key.getKey());
    if (clsInstance) {
      Logger.log(
        {
          key: binding.getKey().getKey(),
          type: binding.getType(),
          scope: binding.getScope(),
          name: cls.constructor.name,
        },
        'resolved'
      );
      return clsInstance as V;
    }

    const args: unknown[] = [];
    cls[classMetadataKey]?.dependencies.forEach((dep, key) => {
      args[key] = this.resolve(dep);
    });

    const newClsInstance = new cls(...args);

    if (binding.getScope() === Scope.SINGLETON) {
      this.instances.set(key.getKey(), newClsInstance);
    }
    Logger.log(
      {
        key: binding.getKey().getKey(),
        type: binding.getType(),
        scope: binding.getScope(),
        name: cls.constructor.name,
      },
      'created and resolved'
    );

    return newClsInstance;
  }

  /**
   * Clears all cached instances
   *
   * This method clears the instance cache but keeps the bindings.
   * Useful for resetting the container state without re-registering bindings.
   */
  public clear(): void {
    Logger.log('Clearing DI container cache');
    this.instances.clear();
  }
}

/**
 * Global instance of the DIContainer
 *
 * A singleton instance of the DIContainer that can be used throughout the application
 * for managing dependencies.
 */
export const container = new DIContainer();
