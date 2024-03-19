# libsql Migrate

Database migration and seed management for libsql with configurable options.

**Warning:** This tool is in early development and most features are not yet
implemented.

## Installation

This project will be distributed via npm when it reaches some level of
stability. Until then, installation takes a more manual approach.

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

4. Install the CLI globally.

```sh
npm install -g .
```

The `libsql-migrate` command is now available for your usage.

## Usage

1. Navigate to your project's root directory.

```sh
cd my/project/root
```

2. Create a fresh libsql-migrate configuration file.

```sh
libsql-migrate init
```

This writes a file called `libsqlrc.js` with the following contents. Modify it
to meet your project's configuration.

```javascript
/**
 * Configuration object for libsql-migrate.
 * @typedef {Object} LibsqlMigrateConfig
 * @property {Object} development - Configuration for development environment.
 * @property {Object} development.connection - Connection configuration for development environment.
 * @property {string} development.connection.url - URL for development environment connection.
 * @property {Object} [production] - Configuration for production environment (optional).
 * @property {Object} [production.connection] - Connection configuration for production environment.
 * @property {string} [production.connection.url] - URL for production environment connection.
 * @property {string} [production.connection.authToken] - Authentication token for production environment connection.
 */

/**
 * Configuration object for libsql-migrate.
 * @type {LibsqlMigrateConfig}
 */
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

### Make a new migration

1. Make a new migration named `demo`.

```sh
libsql-migrate make demo
```

Replace `demo` with whatever name you'd like to give the migration.

A file with the timestamp and the name you chose will be written to the
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

The newly written migration file's contents look like this:

```javascript
/**
 * Migrates the database schema upward, making changes to bring the schema toward the latest version.
 * @param client - The libsql client to use when migrating.
 * @returns { Promise<void> }
 */
export async function up(client) {}

/**
 * Migrates the database schema downward, making changes to roll the schema back to a previous version.
 * @param client - The libsql client to use when migrating.
 * @returns { Promise<void> }
 */
export async function down(client) {}
```

Write the code that brings your schema toward the latest version in the `up()`
function. For example:

```javascript
export async function up(client) {
  await client.execute(
    "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT);",
  );
}
```

Write the code that rolls your schema backward in the `down()` function:

```javascript
export async function down(client) {
  await client.execute("DROP TABLE users;");
}
```

## Run the next migration

Run the next migration that has not yet been run.

```sh
libsql-migrate up
```

The `up()` function in the next migration file (alphabetically) in the migration
directory will be executed.

A "latest" command is planned. But until then, you can repeatedly run this
command to bring the database schema full up-to-date.

## Roll back the latest migration

Roll back the latest migration that was run.

```sh
libsql-migrate down
```

The `down()` function in the most recently executed migration file will be
executed.

You can repeadetly run this command go roll back the database schema further and
further.

## To do

- Increase unit test coverage
- `latest` command
- down `batch` option
- `seed:make` command
- `seed:run` command

## Contributing

Contributions are welcome. Kindly run `npm run format` and `npm run lint` before
committing code and submitting a pull request.

## License

The MIT License (MIT)

Copyright © 2024 Travis Horn

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
