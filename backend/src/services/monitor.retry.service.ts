import { checkMonitor } from "./monitor.service";
import logger from "../utils/logger";

const sleep = (ms:number) => new Promise(resolve => setTimeout(resolve,ms));

export const checkMonitorWithRetries = async (
  monitor:any
) => {
  const retries = monitor.retries ?? 3;
  const retryInterval = monitor.retryInterval ?? 10;
  let result = await checkMonitor(monitor);

  if (result.status === "UP") {
    return result;
  }

  // If initial check is DOWN, perform retries
  for (let attempt = 1; attempt <= retries; attempt++) {
    logger.warn(
      `Check failed for monitor target ${monitor.url}. Retrying attempt ${attempt}/${retries} in ${retryInterval}s...`
    ); 
    await sleep(retryInterval * 1000);
    const retryResult = await checkMonitor(monitor);
    if (retryResult.status === "UP") {
      logger.info(
        `Monitor recovered for target ${monitor.url} on retry attempt ${attempt}/${retries}.`
      );
      return retryResult;
    }
    result = retryResult; // Update result with latest failure state
  }
  logger.error(
    `Monitor check for target ${monitor.url} failed all ${retries} retry attempts. Registering DOWN status.`
  );
  return result;
};