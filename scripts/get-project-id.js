#!/usr/bin/env node

/**
 * Get project ID for pool-championship
 */

const https = require('https');

const token = process.env.VERCEL_TOKEN;
const teamId = 'team_yDIeFVwkuyRXCyEYdUnXZVqZ';

if (!token) {
  console.error('❌ VERCEL_TOKEN not set');
  console.error('Get token from: https://vercel.com/account/tokens');
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
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('🔍 Finding pool-championship project ID...\n');

  // Get projects
  const projects = await request('GET', `/v9/teams/${teamId}/projects`);
  
  const pcProject = projects.projects?.find(p => p.name === 'pool-championship');
  
  if (pcProject) {
    console.log('✅ Found pool-championship:');
    console.log(`   Project ID: ${pcProject.id}`);
    console.log(`   Name: ${pcProject.name}`);
    console.log('\n📝 .vercel/project.json should contain:');
    console.log(JSON.stringify({
      projectId: pcProject.id,
      orgId: teamId,
      projectName: 'pool-championship'
    }, null, 2));
  } else {
    console.log('❌ pool-championship not found');
    console.log('\nAvailable projects:');
    projects.projects?.forEach(p => console.log(`  - ${p.name} (${p.id})`));
  }
}

main().catch(console.error);
