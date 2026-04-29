#!/usr/bin/env node

/**
 * Add MONGODB_URI to Vercel environment
 * Usage: node scripts/add-env.js <token> <value>
 */

const token = process.argv[2];
const value = process.argv[3];

if (!token || !value) {
  console.error('Usage: node scripts/add-env.js <vercel-token> <mongodb-uri>');
  process.exit(1);
}

const fetch = require('node-fetch');

const projectId = 'pool-championship';
const teamId = 'jyheeeds-projects';

async function addEnv() {
  const url = `https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}`;
  
  const body = {
    key: 'MONGODB_URI',
    value: value,
    target: ['production'],
    type: 'encrypted'
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ MONGODB_URI added successfully');
      console.log(result);
    } else {
      console.error('❌ Failed to add MONGODB_URI');
      console.error(result);
      process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addEnv();
