import { createClient } from "@libsql/client";
import { getConfig, getSeeds, logger } from "../lib/index.js";

/**
 * Runs all seed files.
 *
 * @async
 * @function seedRun
 * @returns {Promise<void>} A promise that resolves when all seed files have been run.
 * @example
 * await seedRun();
 */
export default async function seedRun() {
  const seeds = await getSeeds();
  const config = await getConfig();
  const client = createClient(config.connection);

  if (seeds) {
    for (const seed of seeds) {
      await seed.run(client);
    }

    const names = seeds.map((seed) => seed.name).join(", ");

    const plural = seeds.length !== 1;

    logger.info(`Ran ${seeds.length} seed${plural ? "s" : ""}: ${names}.`);
  }
}
