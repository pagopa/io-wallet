import { app } from "@azure/functions";

async function healthHandler() {
  return { status: 204 };
}

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: healthHandler,
  methods: ["GET"],
  route: "health",
});
