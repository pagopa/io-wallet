import { HealthHandler } from "@/infra/http/handlers/health";
import { app } from "@azure/functions";

app.http("healthCheck", {
  authLevel: "anonymous",
  handler: HealthHandler,
  methods: ["GET"],
  route: "health",
});
