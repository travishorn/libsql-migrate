import { createClient } from "@libsql/client";
import { getConfig, getSeeds, logger } from "../lib/index.js";

/**
 * Runs specified or all seed file(s).
 *
 * @async
 * @function seedRun
 * @returns {Promise<void>} A promise that resolves when seed file(s) have been run.
 * @example
 * await seedRun(); // Runs all seeds
 * await seedRun(["animals"]); // Runs the seed named "animals"
 * await seedRun(["animals", "cars"]); // Runs the seeds named "animals" and "cars"
 */
export default async function seedRun(names) {
  let seeds = await getSeeds();
  const config = await getConfig();
  const client = createClient(config.connection);

  // If names were given, filter so only they remain
  if (names.length > 0) {
    seeds = seeds.filter((seed) => names.includes(seed.name));
  }

  seeds = seeds.sort();

  if (seeds.length > 0) {
    const results = [];
    for (const seed of seeds) {
      if (typeof config.hooks?.beforeSeed === "function") {
        await config.hooks.beforeSeed(seed.name);
      }

      let result;
      try {
        result = await seed.run(client);
        results.push(result);
      } catch (err) {
        if (typeof config.hooks?.onError === "function") {
          config.hooks.onError("seed", seed.name, err);
        }
        throw err;
      }

      if (typeof config.hooks?.afterSeed === "function") {
        await config.hooks.afterSeed(seed.name, result);
      }
    }

    const names = seeds.map((seed) => seed.name);
    const plural = seeds.length !== 1;

    if (typeof config.hooks?.afterSeeds === "function") {
      await config.hooks.afterSeeds(names, results);
    }

    logger.info(`Ran ${seeds.length} seed${plural ? "s" : ""}: ${names.join(", ")}.`);
  } else {
    const plural = names.length !== 1;
    logger.warn(
      `No seed exists with name${plural ? "s" : ""}: ${names.join(", ")}.`,
    );
  }
}
