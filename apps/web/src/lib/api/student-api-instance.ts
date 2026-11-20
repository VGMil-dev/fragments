import { createApiClient } from "./api-client.js";
import { createStudentApi } from "./student-api.js";

export const studentApi = createStudentApi(createApiClient());
