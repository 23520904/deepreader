const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const API_HOST = 'localhost';
const API_PORT = 8083;
const DOC_PATH = 'docs/dummy.pdf'; // Let's upload this markdown file

async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: `testuser_${Date.now()}@example.com`, password: 'Password123!' });
    const req = http.request({
      hostname: API_HOST, port: API_PORT, path: '/api/v1/auth/register', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testUpload(token, userId) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
    const fileContent = fs.readFileSync(DOC_PATH);
    const filename = path.basename(DOC_PATH);
    
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
    payload += `Content-Type: text/markdown\r\n\r\n`;
    
    const head = Buffer.from(payload, 'utf-8');
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    
    const req = http.request({
      hostname: API_HOST, port: API_PORT, path: `/api/v1/books/upload?userId=${userId}`, method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': head.length + fileContent.length + tail.length
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        if (res.statusCode === 200) {
           resolve(JSON.parse(body));
        } else {
           reject(new Error(`Status: ${res.statusCode}, Body: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(head);
    req.write(fileContent);
    req.write(tail);
    req.end();
  });
}

async function run() {
  try {
    console.log("Registering user...");
    const user = await login();
    console.log("User registered:", user.userId);
    
    console.log("Uploading file...");
    const result = await testUpload(user.token, user.userId);
    console.log("Upload Success! Response:", result);
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
