const http = require('http');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const API_HOST = 'localhost';
const API_PORT = 8083;

// Create a dummy image (a tiny 1x1 base64 GIF or JPEG)
const tinyJpgBase64 = "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
const dummyImageBuffer = Buffer.from(tinyJpgBase64, 'base64');
fs.writeFileSync('dummy_image.jpg', dummyImageBuffer);

async function login() {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email: `visionuser_${Date.now()}@example.com`, password: 'Password123!' });
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

async function testVision(token, prompt, provider) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(8).toString('hex');
    const fileContent = fs.readFileSync('dummy_image.jpg');
    
    let payload = `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="prompt"\r\n\r\n${prompt}\r\n`;
    
    payload += `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="provider"\r\n\r\n${provider}\r\n`;
    
    payload += `--${boundary}\r\n`;
    payload += `Content-Disposition: form-data; name="image"; filename="dummy_image.jpg"\r\n`;
    payload += `Content-Type: image/jpeg\r\n\r\n`;
    
    const head = Buffer.from(payload, 'utf-8');
    const tail = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf-8');
    
    const req = http.request({
      hostname: API_HOST, port: API_PORT, path: `/api/v1/vision/analyze`, method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': head.length + fileContent.length + tail.length
      }
    }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => resolve({ status: res.statusCode, body }));
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
    
    console.log("Testing Vision API (Gemini)...");
    const resultGemini = await testVision(user.token, "What is in this tiny white image?", "gemini");
    console.log("Gemini Response:", resultGemini.status, resultGemini.body);
    
  } catch (err) {
    console.error("Test failed:", err.message);
  }
}

run();
