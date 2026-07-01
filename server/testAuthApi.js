const http = require('http');

const request = (method, path, body, token) => {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (body) options.headers['Content-Length'] = data.length;

    const req = http.request(options, (res) => {
      let result = '';
      res.on('data', d => result += d);
      res.on('end', () => {
        try { resolve(JSON.parse(result)); }
        catch (e) { resolve(result); }
      });
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
};

async function test() {
  try {
    const loginRes = await request('POST', '/api/auth/login', {
      email: 'admin@elitehire.com',
      password: 'EliteHire@2026'
    });
    const token = loginRes.token;

    process.stdout.write(require('util').format("Fetching CLIENTS with age='Today'") + "\n");
    const res1 = await request('GET', '/api/clients?age=Today', null, token);
    process.stdout.write(require('util').format("Total clients returned:", res1.records ? res1.records.length : res1) + "\n");
    if (res1.records && res1.records.length > 0) {
      const dates = res1.records.map(r => r.createdAt);
      process.stdout.write(require('util').format("Sample createdAt values:", dates.slice(0, 5)) + "\n");
    }

    process.stdout.write(require('util').format("Fetching RECEIVED-INFO with age='Today'") + "\n");
    const res2 = await request('GET', '/api/received-info?age=Today', null, token);
    process.stdout.write(require('util').format("Total received-info returned:", res2.records ? res2.records.length : res2) + "\n");
    if (res2.records && res2.records.length > 0) {
      const dates = res2.records.map(r => r.createdAt);
      process.stdout.write(require('util').format("Sample createdAt values:", dates.slice(0, 5)) + "\n");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}
test();
