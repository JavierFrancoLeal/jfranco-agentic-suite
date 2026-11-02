#!/usr/bin/env node
// @javierfrancoleal/dsh-supervisor — launcher. Created by J.Franco.
// Forwards every argument to the supervisor server with sane defaults:
//   data dir: ~/.dsh/supervisor-data   ·   sector packs: the package's own
const os = require("node:os");
const path = require("node:path");
process.env.DSH_SUPERVISOR_DATA =
  process.env.DSH_SUPERVISOR_DATA || path.join(os.homedir(), ".dsh", "supervisor-data");
process.env.DSH_SECTOR_PACKS_DIR =
  process.env.DSH_SECTOR_PACKS_DIR || path.join(__dirname, "..", "sector-packs");
require("../server.js");
