import { request } from "@playwright/test";

async function globalSetup() {
  const requestContext = await request.newContext();
  await requestContext.post("http://localhost:3001/api/auth/sign-up/email", {
    data: {
      name: "Test User",
      email: "test@example.com",
      password: "Test1234!",
    },
  });
  await requestContext.dispose();
}

export default globalSetup;
