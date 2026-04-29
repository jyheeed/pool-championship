#!/usr/bin/env node

const https = require('https');

// Get projectId from .vercel/project.json if it exists
let projectId = 'prj_jmhgYyPjMGPJGq3bB4fj1qH8';
let teamId = 'team_yDIeFVwkuyRXCyEYdUnXZVqZ';

// You need to set VERCEL_TOKEN env var
const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.error('❌ VERCEL_TOKEN environment variable not set');
  console.error('Get your token from: https://vercel.com/account/tokens');
  process.exit(1);
}

function request(method, path, body = null) {
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
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🔍 Checking MONGODB_URI in Vercel...\n');

  // Get env vars
  const result = await request('GET', `/v10/projects/${projectId}/env?teamId=${teamId}`);
  
  if (result.status !== 200) {
    console.error('❌ Failed to get environment variables');
    console.error(result);
    process.exit(1);
  }

  const mongoVar = result.data.envs.find(e => e.key === 'MONGODB_URI');
  
  if (!mongoVar) {
    console.log('❌ MONGODB_URI not found!');
    console.log('\n Available variables:');
    result.data.envs.forEach(e => {
      console.log(`  - ${e.key}: ${e.target.join(',')}`);
    });
  } else {
    console.log('✅ MONGODB_URI found!');
    console.log(`  Key: ${mongoVar.key}`);
    console.log(`  Targets: ${mongoVar.target.join(', ')}`);
    console.log(`  Value: [encrypted]`);
  }
}

main().catch(console.error);
