import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // ramp to 20 users
    { duration: '20s', target: 60 },  // ramp to 60 users
    { duration: '20s', target: 100 }, // ramp to 100 users
    { duration: '10s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],    // less than 1% errors
    http_req_duration: ['p(95)<150'],  // 95% of cached requests under 150ms
  },
};

const TARGET_URL = 'http://127.0.0.1:8765/resolve?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ';

export default function () {
  const res = http.get(TARGET_URL);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'has formats': (r) => {
      try {
        const json = r.json();
        return json.success === true && json.video_formats.length > 0;
      } catch {
        return false;
      }
    },
    'latency < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(0.1);
}
