# @smwb/di - Zero Dependencies Dependency Injection

A lightweight, zero-dependency Dependency Injection container for TypeScript and JavaScript applications.

## Features

- Zero external dependencies
- Decorator-based dependency injection (`@Injectable` and `@Inject`)
- Support for singleton and transient scopes
- Global container instance for easy access
- Support for binding constants, functions, and classes
- Default binding support
- TypeScript support with full type safety

## Installation

```bash
npm install @smwb/di
```

## Usage

### Basic Setup

First, define your services and dependencies using decorators:

```typescript
import { Injectable, Inject } from '@smwb/di';
import { Database } from './database';
import { Logger } from './logger';

// Define a binding key for your dependencies
const DatabaseKey = Symbol('Database');
const LoggerKey = Symbol('Logger');

@Injectable()
class UserService {
  constructor(
    @Inject(new BindingKey(DatabaseKey)) private database: Database,
    @Inject(new BindingKey(LoggerKey)) private logger: Logger
  ) {}

  getUsers() {
    this.logger.log('Fetching users');
    return this.database.query('SELECT * FROM users');
  }
}

@Injectable({ scope: Scope.TRANSIENT })
class OrderService {
  constructor(
    @Inject(new BindingKey(DatabaseKey)) private database: Database
  ) {}

  getOrders() {
    return this.database.query('SELECT * FROM orders');
  }
}
```

### Binding Dependencies

Configure your dependency container:

```typescript
import { container, BindingKey } from '@smwb/di';
import { Database } from './database';
import { Logger } from './logger';
import { UserService } from './user-service';
import { OrderService } from './order-service';

// Bind your dependencies
const DatabaseKey = Symbol('Database');
const LoggerKey = Symbol('Logger');
const UserServiceKey = Symbol('UserService');
const OrderServiceKey = Symbol('OrderService');

container.bind(new BindingKey(DatabaseKey)).toClass(Database);
container.bind(new BindingKey(LoggerKey)).toClass(Logger);
container.bind(new BindingKey(UserServiceKey)).toClass(UserService);
container.bind(new BindingKey(OrderServiceKey)).toClass(OrderService);

// Or bind constants
container.bind(new BindingKey('API_URL')).toConstant('https://api.example.com');

// Or bind functions
container.bind(new BindingKey('randomNumber')).toFunction(() => Math.random());
```

### Resolving Dependencies

Get instances of your services:

```typescript
import { container, BindingKey } from '@smwb/di';
import { UserService } from './user-service';

const UserServiceKey = Symbol('UserService');

// Resolve dependencies
const userService = container.resolve(new BindingKey(UserServiceKey));
const users = userService.getUsers();

// For constants and functions
const apiUrl = container.resolve(new BindingKey('API_URL'));
const randomNumber = container.resolve(new BindingKey('randomNumber'));
```

### Default Bindings

You can also use default bindings to simplify your code:

```typescript
import { Injectable, Inject } from '@smwb/di';

// Define binding keys
const DatabaseKey = Symbol('Database');
const UserServiceKey = Symbol('UserService');

@Injectable()
class Database {
  connect() {
    // Database connection logic
  }
}

@Injectable()
class UserService {
  constructor(
    @Inject(new BindingKey(DatabaseKey, Database)) private database: Database
  ) {}
  
  getUsers() {
    return this.database.connect();
  }
}

// No need to explicitly bind Database, it will use the default
const userService = container.resolve(
  new BindingKey(UserServiceKey, UserService)
);
```

## API

### `container`

Global instance of `DIContainer` for managing dependencies.

### `DIContainer`

Main container class with the following methods:

- `bind<V>(key: BindingKey<V>)` - Binds a key to a new binding instance
- `resolve<V>(key: BindingKey<V>)` - Resolves a dependency by its key
- `clear()` - Clears all cached instances

### `BindingKey<V>`

Represents a key for binding dependencies:

```typescript
new BindingKey<V>(key: symbol, defaultBinding?: Newable<V> | V)
```

### `@Injectable(options?)`

Class decorator to mark a class as injectable:

```typescript
@Injectable({ scope: Scope.SINGLETON }) // or Scope.TRANSIENT
class MyService {}
```

### `@Inject(binding)`

Parameter decorator to inject dependencies:

```typescript
// Define binding keys at the top of your file
const DependencyKey = Symbol('dep');

constructor(@Inject(new BindingKey(DependencyKey)) dependency: DependencyType)
```

### Scopes

- `Scope.SINGLETON` - Single instance shared across the application (default)
- `Scope.TRANSIENT` - New instance created each time it's resolved

## Testing

Run tests with:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:coverage
```

## License

MIT