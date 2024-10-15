import * as ai from "applicationinsights";

ai.setup(process.env["AppInsightsConnectionString"])
  .setUseDiskRetryCaching(true)
  .start();

export default ai;
