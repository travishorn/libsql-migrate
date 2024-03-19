#! /usr/bin/env node

import { program } from "commander";
import init from "./init.js";
import make from "./make.js";
import up from "./up.js";
import down from "./down.js";

program
  .command("init")
  .description("Create a fresh configuration file.")
  .action(init);

program
  .command("make <name>")
  .description("Create a named migration file.")
  .action(make);

program
  .command("up")
  .description("Run the next migration that has not yet been run.")
  .action(up);

program
  .command("down")
  .description("Roll back the latest migration that was run.")
  .action(down);

program.parse();
