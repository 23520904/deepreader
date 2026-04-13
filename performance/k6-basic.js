import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || "30s",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1500"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://localhost:8080";
const email = __ENV.TEST_EMAIL || "k6@example.com";
const password = __ENV.TEST_PASSWORD || "password123";
const provider = __ENV.PROVIDER || "gemini";
const bookId = __ENV.TEST_BOOK_ID || "book-id-required";

function getToken() {
  const payload = JSON.stringify({ email, password });
  const params = { headers: { "Content-Type": "application/json" } };

  let res = http.post(`${baseUrl}/api/v1/auth/login`, payload, params);
  if (res.status !== 200) {
    res = http.post(`${baseUrl}/api/v1/auth/register`, payload, params);
  }
  check(res, { "auth success": (r) => r.status === 200 });
  const body = res.json();
  return body.token;
}

export default function () {
  const token = getToken();
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
