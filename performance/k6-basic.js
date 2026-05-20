import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    warmup: {
      executor: "constant-vus",
      vus: Number(__ENV.WARMUP_VUS || __ENV.VUS || 10),
      duration: __ENV.WARMUP_DURATION || "10s",
      exec: "warmup",
      tags: { phase: "warmup" },
    },
    main: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 10),
      duration: __ENV.DURATION || "30s",
      startTime: __ENV.WARMUP_DURATION || "10s",
      exec: "main",
      tags: { phase: "main" },
    },
  },
  thresholds: {
    "http_req_failed{phase:main}": ["rate<0.05"],
    "http_req_duration{phase:main}": ["p(95)<1500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8083";
const email = __ENV.TEST_EMAIL || "k6@example.com";
const password = __ENV.TEST_PASSWORD || "password123";
const provider = __ENV.PROVIDER || "groq";
const bookId = __ENV.TEST_BOOK_ID || "book-id-required";

function getToken() {
  const payload = JSON.stringify({ email, password });
  const params = { headers: { "Content-Type": "application/json" } };

  let res = http.post(`${baseUrl}/api/v1/auth/login`, payload, params);
  if (res.status !== 200) {
    res = http.post(`${baseUrl}/api/v1/auth/register`, payload, params);
  }
  const success = check(res, { "auth success": (r) => r.status === 200 });
  if (!success) {
    return null;
  }

  let body = null;
  try {
    body = res.json();
  } catch (e) {
    return null;
  }

  return body?.token || null;
}

function runFlow() {
  const token = getToken();
  if (!token) {
    sleep(1);
    return;
  }
  if (!bookId || bookId === "book-id-required") {
    sleep(1);
    return;
  }
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const searchRes = http.post(
    `${baseUrl}/api/v1/books/${bookId}/search`,
    JSON.stringify({
      query: "What is the main idea?",
      limit: 5,
      provider,
    }),
    { headers }
  );
  check(searchRes, {
    "search is 200/400": (r) => r.status === 200 || r.status === 400,
  });

  const chatRes = http.post(
    `${baseUrl}/api/v1/books/${bookId}/chat`,
    JSON.stringify({
      query: "Summarize key points briefly.",
      limit: 5,
      provider,
    }),
    { headers }
  );
  check(chatRes, {
    "chat is 200/400": (r) => r.status === 200 || r.status === 400,
  });

  sleep(1);
}

export function warmup() {
  runFlow();
}

export function main() {
  runFlow();
}
