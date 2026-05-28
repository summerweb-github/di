import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BindingKey } from './binding';
import { Scope, classMetadataKey } from './const';

import { DIContainer } from './di-container';

class TestDependency {
  public value = 'dependency';
}

class TestClass {
  public dependency: TestDependency;

  constructor(dependency: TestDependency) {
    this.dependency = dependency;
  }

  public getValue() {
    return 'test class';
  }
}

function testFunction() {
  return 'test function result';
}

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('bind', () => {
    it('should create a new binding and store it in the registry', () => {
      const key = new BindingKey(Symbol('test'));
      const binding = container.bind(key);

      expect(binding).toBeDefined();
      expect(binding.getKey()).toBe(key);
    });
  });

  describe('resolve', () => {
    it('should resolve a constant binding', () => {
      const key = new BindingKey<string>(Symbol('test'));
      const value = 'test value';

      container.bind(key).toConstant(value);
      const result = container.resolve(key);

      expect(result).toBe(value);
    });

    it('should resolve a function binding', () => {
      const key = new BindingKey<() => string>(Symbol('test'));

      container.bind(key).toFunction(testFunction);
      const result = container.resolve(key);

      expect(result).toBe(testFunction);
      expect(result()).toBe('test function result');
    });

    it('should resolve a class binding', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.TRANSIENT);
      container.bind(key).toClass(TestClass).toScope(Scope.TRANSIENT);

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      const result = container.resolve(key);

      expect(result).toBeInstanceOf(TestClass);
      expect(result.getValue()).toBe('test class');
      expect(result.dependency).toBeInstanceOf(TestDependency);
      expect(result.dependency.value).toBe('dependency');
    });

    it('should throw an error when no binding is found', () => {
      const key = new BindingKey<string>(Symbol('test'));

      expect(() => container.resolve(key)).toThrow(
        `No binding found for key: ${key.getKey().toString()}`
      );
    });

    it('should resolve a class with default binding when no explicit binding exists', () => {
      const key = new BindingKey<TestClass>(Symbol('TestClass'), TestClass);
      const depKey = new BindingKey<TestDependency>(
        Symbol('TestDependency'),
        TestDependency
      );

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      TestDependency[classMetadataKey] = {
        dependencies: new Map<
          number,
          { binding: BindingKey<unknown>; options?: { optional?: boolean } }
        >(),
        scope: Scope.TRANSIENT,
      };

      const result = container.resolve(key);

      expect(result).toBeInstanceOf(TestClass);
      expect(result.dependency).toBeInstanceOf(TestDependency);
    });

    it('should resolve a constant with default binding when no explicit binding exists', () => {
      const defaultValue = 'default value';
      const key = new BindingKey<string>(Symbol('test'), defaultValue);

      const result = container.resolve(key);

      expect(result).toBe(defaultValue);
    });

    it('should resolve a function with default binding when no explicit binding exists', () => {
      const key = new BindingKey<() => string>(Symbol('test'), testFunction);

      const result = container.resolve(key);

      expect(result).toBe(testFunction);
    });

    it('should return undefined when no binding is found and optional is true', () => {
      const key = new BindingKey<string>(Symbol('test'));

      const result = container.resolve(key, { optional: true });

      expect(result).toBeUndefined();
    });
  });

  describe('singleton scope', () => {
    it('should return the same instance for singleton scope', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.SINGLETON);
      container.bind(key).toClass(TestClass).toScope(Scope.SINGLETON);

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.SINGLETON,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(instance1).toBe(instance2);
      expect(instance1.dependency).toBe(instance2.dependency);
    });
  });

  describe('transient scope', () => {
    it('should return different instances for transient scope', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.TRANSIENT);
      container.bind(key).toClass(TestClass).toScope(Scope.TRANSIENT);

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(instance1).not.toBe(instance2);
      expect(instance1.dependency).not.toBe(instance2.dependency);
    });
  });

  describe('clear', () => {
    it('should clear all cached instances', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.SINGLETON);
      container.bind(key).toClass(TestClass).toScope(Scope.SINGLETON);

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.SINGLETON,
      };

      const instance1 = container.resolve(key);
      container.clear();
      const instance2 = container.resolve(key);

      expect(instance1).not.toBe(instance2);
      expect(instance1.dependency).not.toBe(instance2.dependency);
    });
  });

  describe('lazy class binding', () => {
    it('should resolve a lazy class with sync loader', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));
      const loader = vi.fn(() => TestClass);

      container.bind(depKey).toClass(TestDependency).toScope(Scope.TRANSIENT);
      container.bind(key).toLazyClass(loader).toScope(Scope.TRANSIENT);

      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      const result = container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(TestClass);
      expect(result.dependency).toBeInstanceOf(TestDependency);
    });

    it('should call sync loader only once for singleton scope', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const loader = vi.fn(() => TestClass);

      container.bind(key).toLazyClass(loader).toScope(Scope.SINGLETON);

      TestClass[classMetadataKey] = {
        dependencies: new Map(),
        scope: Scope.SINGLETON,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(instance1).toBe(instance2);
    });

    it('should create new instances for transient scope', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const loader = vi.fn(() => TestClass);

      container.bind(key).toLazyClass(loader).toScope(Scope.TRANSIENT);

      TestClass[classMetadataKey] = {
        dependencies: new Map(),
        scope: Scope.TRANSIENT,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(instance1).not.toBe(instance2);
    });

    it('should resolve a lazy class with async loader', async () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const loader = vi.fn(() => Promise.resolve(TestClass));

      container.bind(key).toLazyClass(loader).toScope(Scope.SINGLETON);

      TestClass[classMetadataKey] = {
        dependencies: new Map(),
        scope: Scope.SINGLETON,
      };

      const result = await container.resolveAsync(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(TestClass);
    });

    it('should throw when async loader is used with sync resolve', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));

      container
        .bind(key)
        .toLazyClass(() => Promise.resolve(TestClass))
        .toScope(Scope.SINGLETON);

      expect(() => container.resolve(key)).toThrow(
        `Lazy binding requires resolveAsync for key: ${key.getKey().toString()}`
      );
    });

    it('should reload class after clear', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const loader = vi.fn(() => TestClass);

      container.bind(key).toLazyClass(loader).toScope(Scope.SINGLETON);

      TestClass[classMetadataKey] = {
        dependencies: new Map(),
        scope: Scope.SINGLETON,
      };

      container.resolve(key);
      container.clear();
      container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('lazy function binding', () => {
    it('should resolve a lazy function with sync loader', () => {
      const key = new BindingKey<() => string>(Symbol('test'));
      const loader = vi.fn(() => testFunction);

      container.bind(key).toLazyFunction(loader);

      const result = container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBe(testFunction);
      expect(result()).toBe('test function result');
    });

    it('should call sync loader only once', () => {
      const key = new BindingKey<() => string>(Symbol('test'));
      const loader = vi.fn(() => testFunction);

      container.bind(key).toLazyFunction(loader);

      container.resolve(key);
      container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should resolve a lazy function with async loader', async () => {
      const key = new BindingKey<() => string>(Symbol('test'));
      const loader = vi.fn(() => Promise.resolve(testFunction));

      container.bind(key).toLazyFunction(loader);

      const result = await container.resolveAsync(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBe(testFunction);
    });

    it('should reload function after clear', () => {
      const key = new BindingKey<() => string>(Symbol('test'));
      const loader = vi.fn(() => testFunction);

      container.bind(key).toLazyFunction(loader);

      container.resolve(key);
      container.clear();
      container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(2);
    });
  });

  describe('lazy constant binding', () => {
    it('should resolve a lazy constant from sync function', () => {
      const key = new BindingKey<string>(Symbol('test'));
      const loader = vi.fn(() => 'computed value');

      container.bind(key).toLazyConstant(loader);

      const result = container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBe('computed value');
    });

    it('should call sync loader only once', () => {
      const key = new BindingKey<string>(Symbol('test'));
      const loader = vi.fn(() => 'computed value');

      container.bind(key).toLazyConstant(loader);

      container.resolve(key);
      container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(1);
    });

    it('should resolve a lazy constant from promise', async () => {
      const key = new BindingKey<string>(Symbol('test'));
      const loader = vi.fn(() => Promise.resolve('async value'));

      container.bind(key).toLazyConstant(loader);

      const result = await container.resolveAsync(key);

      expect(loader).toHaveBeenCalledTimes(1);
      expect(result).toBe('async value');
    });

    it('should throw when async loader is used with sync resolve', () => {
      const key = new BindingKey<string>(Symbol('test'));

      container.bind(key).toLazyConstant(() => Promise.resolve('async value'));

      expect(() => container.resolve(key)).toThrow(
        `Lazy binding requires resolveAsync for key: ${key.getKey().toString()}`
      );
    });

    it('should reload constant after clear', () => {
      const key = new BindingKey<string>(Symbol('test'));
      const loader = vi.fn(() => 'computed value');

      container.bind(key).toLazyConstant(loader);

      container.resolve(key);
      container.clear();
      container.resolve(key);

      expect(loader).toHaveBeenCalledTimes(2);
    });
  });
});
