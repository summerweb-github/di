import { Scope } from '../const';
import { Logger } from '../logger';
import { BindingKey } from './bindingKey';
import { BindingType } from './const';
import type {
  ScopeEnum,
  BindingTypeEnum,
  BindingSource,
  Newable,
  Callable,
  LazyClassLoader,
  LazyFunctionLoader,
  LazyConstantLoader,
} from './types';

export class Binding<V> {
  private type: BindingTypeEnum | undefined;
  private scope: ScopeEnum;
  private readonly key: BindingKey<V>;
  private source: BindingSource<V> | undefined;
  private lazyClassLoader: LazyClassLoader<V> | undefined;
  private lazyFunctionLoader: LazyFunctionLoader<V> | undefined;
  private lazyConstantLoader: LazyConstantLoader<V> | undefined;

  constructor(key: BindingKey<V>) {
    this.scope = Scope.SINGLETON;
    this.key = key;
  }

  public getKey(): BindingKey<V> {
    return this.key;
  }

  public getType(): BindingTypeEnum | undefined {
    return this.type;
  }

  public getScope(): ScopeEnum {
    return this.scope;
  }

  public getClass(): Newable<V> {
    if (this.type !== BindingType.CLASS) {
      throw new Error(
        `Binding type is not class ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.source) {
      throw new Error(
        `Binding source is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.source as Newable<V>;
  }

  private getSourceBindingErrorText() {
    return `${this.source?.toString() ?? ''} ${this.key.getDefaultBinding()?.toString() ?? ''}`;
  }

  public getValue(): V {
    if (this.type !== BindingType.CONSTANT) {
      throw new Error(
        `Binding type is not constant ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.source) {
      throw new Error(
        `Binding source is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.source as V;
  }

  public getFunction(): V {
    if (this.type !== BindingType.FUNCTION) {
      throw new Error(
        `Binding type is not function ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.source) {
      throw new Error(
        `Binding source is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.source as V;
  }

  public getLazyClassLoader(): LazyClassLoader<V> {
    if (this.type !== BindingType.LAZY_CLASS) {
      throw new Error(
        `Binding type is not lazy class ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.lazyClassLoader) {
      throw new Error(
        `Lazy class loader is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.lazyClassLoader;
  }

  public getLazyFunctionLoader(): LazyFunctionLoader<V> {
    if (this.type !== BindingType.LAZY_FUNCTION) {
      throw new Error(
        `Binding type is not lazy function ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.lazyFunctionLoader) {
      throw new Error(
        `Lazy function loader is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.lazyFunctionLoader;
  }

  public getLazyConstantLoader(): LazyConstantLoader<V> {
    if (this.type !== BindingType.LAZY_CONSTANT) {
      throw new Error(
        `Binding type is not lazy constant ${this.getSourceBindingErrorText()}`
      );
    }
    if (!this.lazyConstantLoader) {
      throw new Error(
        `Lazy constant loader is not set ${this.getSourceBindingErrorText()}`
      );
    }
    return this.lazyConstantLoader;
  }

  public toScope(scope: ScopeEnum): this {
    this.scope = scope;
    Logger.log(
      { key: this.key, type: this.type, value: this.source, scope: this.scope },
      `Binding to scope`
    );
    return this;
  }

  public toClass(cls: Newable<V>): this {
    if (this.type && this.type !== BindingType.CLASS) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.CLASS;
    this.source = cls;
    Logger.log(
      { key: this.key, type: this.type, value: this.source, scope: this.scope },
      `New binding`
    );
    return this;
  }

  public toConstant(v: V): this {
    if (this.type && this.type !== BindingType.CONSTANT) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.CONSTANT;
    this.source = v;
    Logger.log(
      { key: this.key, type: this.type, value: this.source, scope: this.scope },
      `New binding`
    );
    return this;
  }

  public toFunction(fn: Callable): this {
    if (this.type && this.type !== BindingType.FUNCTION) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.FUNCTION;
    this.source = fn as BindingSource<V>;
    Logger.log(
      { key: this.key, type: this.type, value: this.source, scope: this.scope },
      `New binding`
    );
    return this;
  }

  public toLazyClass(loader: LazyClassLoader<V>): this {
    if (this.type && this.type !== BindingType.LAZY_CLASS) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.LAZY_CLASS;
    this.lazyClassLoader = loader;
    Logger.log(
      { key: this.key, type: this.type, scope: this.scope },
      `New lazy class binding`
    );
    return this;
  }

  public toLazyFunction(loader: LazyFunctionLoader<V>): this {
    if (this.type && this.type !== BindingType.LAZY_FUNCTION) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.LAZY_FUNCTION;
    this.lazyFunctionLoader = loader;
    Logger.log(
      { key: this.key, type: this.type, scope: this.scope },
      `New lazy function binding`
    );
    return this;
  }

  public toLazyConstant(loader: LazyConstantLoader<V>): this {
    if (this.type && this.type !== BindingType.LAZY_CONSTANT) {
      throw new Error(`Binding type already set to ${this.type}`);
    }
    this.type = BindingType.LAZY_CONSTANT;
    this.lazyConstantLoader = loader;
    Logger.log(
      { key: this.key, type: this.type, scope: this.scope },
      `New lazy constant binding`
    );
    return this;
  }
}
