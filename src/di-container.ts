import { Binding, BindingKey } from './binding';
import { BindingType } from './binding/const';
import { classMetadataKey, Scope, SimpleTypes } from './const';
import { Logger } from './logger';
import type { Callable, Newable } from './binding/types';

export class DIContainer {
  private registry = new Map<symbol, Binding<unknown>>();
  private instances = new Map<symbol, unknown>();
  private lazySources = new Map<symbol, unknown>();
  private lazyLoadingPromises = new Map<symbol, Promise<unknown>>();

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

  resolve<V>(key: BindingKey<V>, options?: { optional?: false | undefined }): V;

  resolve<V>(key: BindingKey<V>, options: { optional: true }): V | undefined;

  resolve<V>(
    key: BindingKey<V>,
    options?: { optional?: boolean }
  ): V | undefined;
  resolve<V>(
    key: BindingKey<V>,
    options?: { optional?: boolean }
  ): V | undefined {
    const result = this.resolveInternal(key, options);

    if (result instanceof Promise) {
      throw new Error(
        `Lazy binding requires resolveAsync for key: ${key.getKey().toString()}`
      );
    }

    return result;
  }

  resolveAsync<V>(
    key: BindingKey<V>,
    options?: { optional?: false | undefined }
  ): Promise<V>;

  resolveAsync<V>(
    key: BindingKey<V>,
    options: { optional: true }
  ): Promise<V | undefined>;

  resolveAsync<V>(
    key: BindingKey<V>,
    options?: { optional?: boolean }
  ): Promise<V | undefined> {
    return Promise.resolve(this.resolveInternal(key, options));
  }

  private resolveInternal<V>(
    key: BindingKey<V>,
    options?: { optional?: boolean }
  ): V | Promise<V> | undefined {
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
          newBinding.toClass(defaultBinding as Newable<V>).toScope(scope);
        } else {
          newBinding.toFunction(defaultBinding as Callable);
        }
      }
      binding = newBinding;
    }

    if (!binding) {
      if (options?.optional) {
        return undefined;
      }
      throw new Error(`No binding found for key: ${key.getKey().toString()}`);
    }

    if (binding.getType() === BindingType.CONSTANT) {
      return binding.getValue();
    }

    if (binding.getType() === BindingType.FUNCTION) {
      return binding.getFunction();
    }

    if (binding.getType() === BindingType.LAZY_FUNCTION) {
      return this.resolveLazyValue(binding.getLazyFunctionLoader(), key);
    }

    if (binding.getType() === BindingType.LAZY_CONSTANT) {
      return this.resolveLazyValue(binding.getLazyConstantLoader(), key);
    }

    if (binding.getType() === BindingType.LAZY_CLASS) {
      return this.resolveLazyClass(binding, key);
    }

    return this.resolveClass(binding, key);
  }

  private resolveClass<V>(binding: Binding<V>, key: BindingKey<V>): V {
    const cls = binding.getClass();
    const symbolKey = key.getKey();
    const clsInstance = this.instances.get(symbolKey);
    if (clsInstance) {
      Logger.log(
        {
          key: binding.getKey().getKey(),
          type: binding.getType(),
          scope: binding.getScope(),
          name: cls.name,
        },
        'resolved'
      );
      return clsInstance as V;
    }

    return this.instantiateClass(cls, binding, key);
  }

  private resolveLazyClass<V>(
    binding: Binding<V>,
    key: BindingKey<V>
  ): V | Promise<V> {
    const symbolKey = key.getKey();

    if (binding.getScope() === Scope.SINGLETON) {
      const clsInstance = this.instances.get(symbolKey);
      if (clsInstance) {
        Logger.log(
          {
            key: binding.getKey().getKey(),
            type: binding.getType(),
            scope: binding.getScope(),
            name: (clsInstance as object).constructor.name,
          },
          'resolved'
        );
        return clsInstance as V;
      }
    }

    const cachedClass = this.lazySources.get(symbolKey) as
      | Newable<V>
      | undefined;
    if (cachedClass) {
      return this.instantiateClass(cachedClass, binding, key);
    }

    const loadingPromise = this.lazyLoadingPromises.get(symbolKey) as
      | Promise<V>
      | undefined;
    if (loadingPromise) {
      return loadingPromise;
    }

    const loadResult = binding.getLazyClassLoader()();
    if (loadResult instanceof Promise) {
      const promise = loadResult.then((cls) => {
        this.lazySources.set(symbolKey, cls);
        this.lazyLoadingPromises.delete(symbolKey);
        return this.instantiateClass(cls, binding, key);
      });
      this.lazyLoadingPromises.set(symbolKey, promise);
      return promise;
    }

    this.lazySources.set(symbolKey, loadResult);
    return this.instantiateClass(loadResult, binding, key);
  }

  private resolveLazyValue<V>(
    loader: () => V | Promise<V>,
    key: BindingKey<V>
  ): V | Promise<V> {
    const symbolKey = key.getKey();
    if (this.lazySources.has(symbolKey)) {
      return this.lazySources.get(symbolKey) as V;
    }

    const loadingPromise = this.lazyLoadingPromises.get(symbolKey) as
      | Promise<V>
      | undefined;
    if (loadingPromise) {
      return loadingPromise;
    }

    const loadResult = loader();
    if (loadResult instanceof Promise) {
      const promise = loadResult.then((value) => {
        this.lazySources.set(symbolKey, value);
        this.lazyLoadingPromises.delete(symbolKey);
        return value;
      });
      this.lazyLoadingPromises.set(symbolKey, promise);
      return promise;
    }

    this.lazySources.set(symbolKey, loadResult);
    return loadResult;
  }

  private instantiateClass<V>(
    cls: Newable<V>,
    binding: Binding<V>,
    key: BindingKey<V>
  ): V {
    const symbolKey = key.getKey();

    if (binding.getScope() === Scope.SINGLETON) {
      const existingInstance = this.instances.get(symbolKey);
      if (existingInstance) {
        return existingInstance as V;
      }
    }

    const args: unknown[] = [];
    cls[classMetadataKey]?.dependencies.forEach((dep, index) => {
      args[index] = this.resolve(dep.binding, dep.options);
    });

    const newClsInstance = new cls(...args);

    if (binding.getScope() === Scope.SINGLETON) {
      this.instances.set(symbolKey, newClsInstance);
    }
    Logger.log(
      {
        key: binding.getKey().getKey(),
        type: binding.getType(),
        scope: binding.getScope(),
        name: cls.name,
      },
      'created and resolved'
    );

    return newClsInstance;
  }

  public clear(): void {
    Logger.log('Clearing DI container cache');
    this.instances.clear();
    this.lazySources.clear();
    this.lazyLoadingPromises.clear();
  }
}

export const container = new DIContainer();
