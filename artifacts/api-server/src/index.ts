import app from "./app";
import { logger } from "./lib/logger";
import { seedShop, expireShopOrders } from "./lib/physicalStore";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await seedShop();
const shopExpiryTimer = setInterval(() => {
  expireShopOrders().catch(error => logger.error({ err: error }, "Could not expire simulated store reservations"));
}, 60_000);
shopExpiryTimer.unref();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
