#! /usr/bin/env node

import { program } from "commander";
import { getVersion } from "../lib/index.js";
import down from "./down.js";
import init from "./init.js";
import latest from "./latest.js";
import make from "./make.js";
import rollback from "./rollback.js";
import seedMake from "./seedMake.js";
import seedRun from "./seedRun.js";
import up from "./up.js";

program.name("libsql-migrate");

program.version(getVersion());

program
  .command("down")
  .description("Roll back the latest migration that was run.")
  .action(down);

program
  .command("init")
  .description("Create a fresh configuration file.")
  .action(init);

program
  .command("latest")
  .description("Run all pending migrations.")
  .action(latest);

program
  .command("make <name>")
  .description("Create a named migration file.")
  .action(make);

program
  .command("rollback")
  .description("Roll back all migrations in the latest batch that was run.")
  .action(rollback);

program
  .command("seed:make <name>")
  .description("Create a named seed file.")
  .action(seedMake);

program
  .command("seed:run [names...]")
  .description("Run all seeds.")
  .action(seedRun);

program
  .command("up")
  .description("Run the next migration that has not yet been run.")
  .action(up);

program.parse();
