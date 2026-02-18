export const ENV = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  apiGatewayUrl: process.env.API_GATEWAY_URL ?? "http://localhost:5200",
  apiGatewayKey: process.env.API_GATEWAY_KEY ?? "",
};
