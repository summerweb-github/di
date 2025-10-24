import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BindingKey } from './binding';
import { Scope, classMetadataKey } from './const';

import { DIContainer } from './di-container';

// Test classes for testing
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

// Test function
function testFunction() {
  return 'test function result';
}

describe('DIContainer', () => {
  let container: DIContainer;

  beforeEach(() => {
    container = new DIContainer();
    // Mock Logger.log to avoid console output in tests
    vi.spyOn(console, 'log').mockImplementation(() => {
      // empty
    });
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
      expect(result?.()).toBe('test function result');
    });

    it('should resolve a class binding', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.TRANSIENT);
      container.bind(key).toClass(TestClass).toScope(Scope.TRANSIENT);

      // Set up metadata for dependency injection
      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      const result = container.resolve(key);

      expect(result).toBeInstanceOf(TestClass);
      expect(result?.getValue()).toBe('test class');
      expect(result?.dependency).toBeInstanceOf(TestDependency);
      expect(result?.dependency.value).toBe('dependency');
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

      // Set up metadata for dependency injection
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
      expect(result?.dependency).toBeInstanceOf(TestDependency);
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

      // Set up metadata for dependency injection
      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.SINGLETON,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(instance1).toBe(instance2);
      expect(instance1?.dependency).toBe(instance2?.dependency);
    });
  });

  describe('transient scope', () => {
    it('should return different instances for transient scope', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.TRANSIENT);
      container.bind(key).toClass(TestClass).toScope(Scope.TRANSIENT);

      // Set up metadata for dependency injection
      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.TRANSIENT,
      };

      const instance1 = container.resolve(key);
      const instance2 = container.resolve(key);

      expect(instance1).not.toBe(instance2);
      // Dependencies should also be different instances
      expect(instance1?.dependency).not.toBe(instance2?.dependency);
    });
  });

  describe('clear', () => {
    it('should clear all cached instances', () => {
      const key = new BindingKey<TestClass>(Symbol('test'));
      const depKey = new BindingKey<TestDependency>(Symbol('dependency'));

      container.bind(depKey).toClass(TestDependency).toScope(Scope.SINGLETON);
      container.bind(key).toClass(TestClass).toScope(Scope.SINGLETON);

      // Set up metadata for dependency injection
      TestClass[classMetadataKey] = {
        dependencies: new Map([[0, { binding: depKey }]]),
        scope: Scope.SINGLETON,
      };

      const instance1 = container.resolve(key);
      container.clear();
      const instance2 = container.resolve(key);

      expect(instance1).not.toBe(instance2);
      expect(instance1?.dependency).not.toBe(instance2?.dependency);
    });
  });
});
