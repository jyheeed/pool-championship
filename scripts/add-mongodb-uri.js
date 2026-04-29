#!/usr/bin/env node

/**
 * Add MONGODB_URI to pool-championship production via Vercel API
 * Usage: VERCEL_TOKEN=xxx node scripts/add-mongodb-uri.js
 */

const https = require('https');
const projectId = 'prj_R0ORwyMKU5Wb4BNxAjMyxc1gmXpS';
const teamId = 'team_yDIeFVwkuyRXCyEYdUnXZVqZ';
const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.error('❌ VERCEL_TOKEN env var not set');
  console.error('Get token from: https://vercel.com/account/tokens');
  process.exit(1);
}

const mongoUri = process.argv[2] || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MongoDB URI not provided');
  console.error('Usage: VERCEL_TOKEN=xxx node add-mongodb-uri.js "mongodb+srv://..."');
  process.exit(1);
}

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🔄 Adding MONGODB_URI to pool-championship production...\n');

  const body = {
    key: 'MONGODB_URI',
    value: mongoUri,
    target: ['production'],
    type: 'encrypted'
  };

  try {
    const result = await request(
      'POST',
      `/v10/projects/${projectId}/env?teamId=${teamId}`,
      body
    );

    if (result.status === 200 || result.status === 201) {
      console.log('✅ MONGODB_URI added successfully!');
      console.log('\nVariable details:');
      console.log(`  Key: MONGODB_URI`);
      console.log(`  Target: production`);
      console.log(`  Type: encrypted`);
      console.log('\n📝 Deploying to apply changes...');
    } else {
      console.error('❌ Failed to add variable');
      console.error(`Status: ${result.status}`);
      console.error('Response:', result.data);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
