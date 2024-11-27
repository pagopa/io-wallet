import { app } from "@azure/functions";

import { sendEmailHandler } from "./send-email";

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: async () => ({ body: "It's working!" }),
  methods: ["GET"],
  route: "health",
});

app.http("testEmailSend", {
  authLevel: "anonymous",
  handler: sendEmailHandler,
  methods: ["GET"],
  route: "email",
});
