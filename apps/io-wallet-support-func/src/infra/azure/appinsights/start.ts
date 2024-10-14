import * as ai from "applicationinsights";

ai.setup(process.env["AppInsightsConnectionString"]).start();

export default ai;
