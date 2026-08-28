import dotenv from "dotenv";
dotenv.config();

import { searchRoute } from "../server/routes/search.js";
import app from "../server/app.js";

export default async function handler(request: Request): Promise<Response> {
  return app.fetch(request);
}

export const config = {
  runtime: "nodejs",
};
