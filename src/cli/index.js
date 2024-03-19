#! /usr/bin/env node

import { program } from "commander";
import init from "./init.js";
import make from "./make.js";

program
  .command("init")
  .description("Create a fresh configuration file.")
  .action(init);

program
  .command("make <name>")
  .description("Create a named migration file.")
  .action(make);

program.parse();
