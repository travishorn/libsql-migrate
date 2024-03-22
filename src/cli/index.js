#! /usr/bin/env node

import { program } from "commander";
import down from "./down.js";
import init from "./init.js";
import latest from "./latest.js";
import make from "./make.js";
import up from "./up.js";

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
  .command("up")
  .description("Run the next migration that has not yet been run.")
  .action(up);

program.parse();
