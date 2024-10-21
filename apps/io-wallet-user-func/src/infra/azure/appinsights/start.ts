import * as ai from "applicationinsights";

ai.setup(process.env["AppInsightsConnectionString"])
  .setAutoCollectRequests(true)
  .setAutoCollectExceptions(true)
  .setUseDiskRetryCaching(true)
  .start();

export default ai;
