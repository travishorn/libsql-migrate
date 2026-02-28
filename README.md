# libsql Migrate

Database migration and seed management for libsql with configurable options.

## Installation

The easiest method is a global installation.

```sh
npm install -g libsql-migrate
```

The `libsql-migrate` command is now available for your usage.

### Local installation

Instead of installing globally, you can install locally to your project.

```sh
npm install --save-dev libsql-migrate
```

This prevents compatibility issues because it defines the version of
`libsql-migrate` that the migrations/seeds in your repository were written for.

You can either run `npx libsql-migrate <command>` and/or add migration commands
to your `package.json`:

```json
{
  "name": "mypackage",
  "version": "0.1.0",
  "scripts": {
    "migrate": "libsql-migrate latest",
    "seed": "libsql-migrate seed:run"
  }
}
```

## Usage

1. Navigate to your project's root directory.

```sh
cd my/project/root
```

2. Create a fresh libsql-migrate configuration file.

```sh
libsql-migrate init
```

3. This writes a file called `libsqlrc.js` with the following contents. Modify it
   to meet your project's configuration.

```javascript
export default {
  development: {
    connection: {
      url: "file:local.db",
    },
  },
  production: {
    connection: {
      url: "libsql://...",
      authToken: "...",
    },
  },
};
```

### Options

#### Custom Config Path (`-c`, `--config`)

`libsql-migrate` uses a configuration file named `libsqlrc.js` by default, which should export the necessary database connection and migration settings.

You can specify a custom path to your configuration file using the `--config` (or short `-c`) option. This is useful if the config file is located outside the project root or when you want to manage multiple environments.

**Example:**

```bash
libsql-migrate up --config ../configs/libsqlrc.js
```

This tells `libsql-migrate` to load configuration from the specified file instead of looking for `libsqlrc.js` in the current working directory. If used with command `init` it will write the default config file to the given location.

### Make a new migration

1. Make a new migration named `demo`.

```sh
libsql-migrate make demo
```

Replace `demo` with whatever name you'd like to give the migration.

A file with the current timestamp and the name you chose will be written to the
migrations directory. This directory is `./migrations` by default, but can be
configured in `libsqlrc.js` like so:

```javascript
export default {
  development: {
    connection: {
      url: "file:local.db",
    },
    migrations: {
      directory: "my_migrations_directory",
    },
  },
  // ...
};
```

Migration files look like this:

```javascript
export async function up(client) {}

export async function down(client) {}
```

2. Write the code that brings your schema **up** toward the latest version in the
   `up()` function. For example:

```javascript
export async function up(client) {
  await client.execute(
    "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);",
  );
}
```

3. Write the code that reverts your schema **down** in the `down()` function:

```javascript
export async function down(client) {
  await client.execute("DROP TABLE users;");
}
```

---

## Hooks

You can define optional lifecycle hooks to run custom logic before, after, or when an error occurs during a migration/seed. These hooks are defined in the `libsqlrc.js` file.

### Available Hooks and Parameters

| Hook Name                                 | Called When                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `beforeMigration(action, name)`           | Before each migration is executed                                      |
| `afterMigration(action, name, result)`    | After each migration is successfully executed                          |
| `afterMigrations(action, names, results)` | Called after all migrations when using commands `latest` or `rollback` |
| `beforeSeed(name)`                        | Before each seed is executed                                           |
| `afterSeed(name, result)`                 | After each seed is successfully executed                               |
| `afterSeeds(names, results)`              | Called after all seeds are successfully executed                       |
| `onError(action, name, error)`            | When a migration/seed/make fails                                       |

> **Note:** All hooks may be async functions. If a function returns a Promise it will be awaited.

### Hook Parameters

#### `action` (`"up"` \| `"down"` \| `"seed"` \| `"make"` \| `"seed:make"`)

Indicates whether it is a seed-run or the direction of a migration:

- `"up"`: applying a migration
- `"down"`: rolling back a migration
- `"seed"`: running a seed
- `"make"`: error when "making" migration file
- `"seed:make"`: error when "making" seed file

#### `name` (string)

The full name of the migration/seed file, including the timestamp prefix.  
This is the name that has been generated using the `make` command, for example:

```
20240327102435_add-users-table
```

#### `result` (any | undefined)

The result of the executed migration or seed. This is the value returned by the function, if any.  
If the function does not return a value, `result` will be `undefined`.

#### `names` (string[])

An array of all processed file names (only used in `afterMigrations` and `afterSeeds`).

#### `results` (any[] | undefined[])

An array of results returned by each migration/seed (only used in `afterMigrations` and `afterSeeds`).  
If a function does not return a value, the corresponding entry will be `undefined`.

#### `error` (Error)

The error object thrown during a failed migration.

### Example

```js
// libsqlrc.js

export default {
  development: {
    connection: {
      url: "file:local.db",
    },
    migrations: {
      directory: "my_migrations_directory",
    },
    hooks: {
      beforeMigration: (action, name) => {
        console.log(`[${action}] Starting migration: ${name}`);
      },
      afterMigration: (action, name, result) => {
        console.log(`[${action}] Finished migration: ${name}`, result);
      },
      afterMigrations: (action, names, results) => {
        console.log(`[${action}] All migrations completed:`);
        names.forEach((name, i) => {
          console.log(` - ${name}`, results[i]);
        });
      },
      onError: (action, name, error) => {
        console.error(`[${action}] Migration failed: ${name}`, error);
      },
    },
  },
  // ...
};
```

> **Note:** All hooks are optional. If a hook is not defined, it will be skipped silently.

---

### Run the next migration

Run the next migration that has not yet been run.

```sh
libsql-migrate up
```

The `up()` function in the next migration file (alphabetically) in the migration
directory will be executed.

You can repeatedly run this command to keep migrating up. If you want to run all
pending migrations to bring the database schema fully up-to-date, use the
[`latest`](#latest) command.

### Roll back the latest migration

Roll back the latest migration that was run.

```sh
libsql-migrate down
```

The `down()` function in the most recently executed migration file will be
executed.

You can repeatedly run this command to roll back the database schema further and
further back.

### Run all pending migrations

Run all migrations that have not yet been run.

```sh
libsql-migrate latest
```

The `up()` function for all pending migration files will be executed in series.
All migrations that were run during this command are considered part of the same
"batch".

### Roll back the latest batch

Roll back all migrations that were run during the last batch.

```sh
libsql-migrate rollback
```

The `down()` function for all migrations that were run in the last batch will be
executed in series. This is useful to roll back all changes from a
`libsql-migrate latest` command.

You can repeatedly run this command to roll back subsequent batches.

### Make a new seed

1. Generate a new seed file.

```sh
libsql-migrate seed:make demo
```

Replace `demo` with whatever name you'd like to give the seed.

A file with the name you chose will be written to the seeds directory. This
directory is `./seeds` by default, but can be configured in `libsqlrc.js` like
so:

```javascript
export default {
  development: {
    connection: {
      url: "file:local.db",
    },
    seeds: {
      directory: "my_seeds_directory",
    },
  },
  // ...
};
```

Seed files look like this:

```javascript
export async function seed(client) {}
```

2. Write the code that seeds your database with preset data in the `seed()`
   function. Note that you'll probably want to delete old data before seeding.

For example:

```javascript
export async function seed(client) {
  await client.execute("DELETE FROM users;");
  await client.execute("INSERT INTO users (name) VALUES ('admin')");
}
```

### Run all seeds

Run all seed files to fill the database with preset data.

```sh
libsql-migrate seed:run
```

This will execute the `seed()` function inside all seed files in the seeds
directory. Files are executed in alphabetical order.

### Run specified seed(s)

Include the name of a seed file to run it.

```sh
libsql-migrate seed:run animals
```

This will execute the `seed()` function inside the `animals.js` file in the
seeds directory.

Include multiple names to run multiple seeds.

```sh
libsql-migrate seed:run animals cars
```

This will run both the `animals.js` and the `cars.js` seed files. Seeds are run
in alphabetical order no matter which order they are provided to the CLI.

## Development

You can clone this project via git and make changes that fit your application.

1. Clone this repository.

```sh
git clone https://github.com/travishorn/libsql-migrate
```

2. Change into the cloned repository's directory.

```sh
cd libsql-migrate
```

3. Install dependencies.

```sh
npm install
```

4. (Optional) Install the CLI globally.

```sh
npm install -g .
```

The `libsql-migrate` command is now available globally for your usage.

## Contributing

Contributions are welcome. Kindly run `npm test`, `npm run format`, and `npm run
lint` before committing code and submitting a pull request. Please ensure all
tests pass before submitting.

If you introduce new features, please add tests for them.

## License

The MIT License (MIT)

Copyright © 2025 Travis Horn

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
