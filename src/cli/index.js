#! /usr/bin/env node

import { program } from "commander";
import init from "./init.js";

program
  .command("init")
  .description("Initialize a new libsqlrc.js")
  .action(init);

program.parse();
