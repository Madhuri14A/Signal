/**
 * Test: Environment Setup
 * Purpose: Verify all required environment variables are set
 * Run: npx tsx tests/env-check.test.ts
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: '.env' });

function testEnvironment() {
  console.log('🔍 Testing Environment Setup...\n');

  const required = {
    'DATABASE_URL': 'PostgreSQL connection string',
    'PORT': 'Backend server port',
  };

  const recommended = {
    'GEMINI_API_KEY': 'Gemini API for embeddings (Signal feature)',
    'UPSTASH_REDIS_URL': 'Redis for BullMQ job queue (Signal feature)',
    'UPSTASH_REDIS_TOKEN': 'Redis authentication token (Signal feature)',
  };

  console.log('📋 REQUIRED Variables:');
  let missingRequired = 0;
  for (const [key, description] of Object.entries(required)) {
    const value = process.env[key];
    if (value) {
      const masked = key.includes('URL') 
        ? value.substring(0, 30) + '...' 
        : value;
      console.log(`  ✅ ${key}: ${masked}`);
    } else {
      console.log(`  ❌ ${key}: MISSING - ${description}`);
      missingRequired++;
    }
  }

  console.log('\n📋 RECOMMENDED Variables (Signal features):');
  let missingRecommended = 0;
  for (const [key, description] of Object.entries(recommended)) {
    const value = process.env[key];
    if (value) {
      const masked = value.substring(0, 30) + '...';
      console.log(`  ✅ ${key}: ${masked}`);
    } else {
      console.log(`  ⚠️  ${key}: NOT SET - ${description}`);
      missingRecommended++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`  Required: ${Object.keys(required).length - missingRequired}/${Object.keys(required).length}`);
  console.log(`  Recommended: ${Object.keys(recommended).length - missingRecommended}/${Object.keys(recommended).length}`);

  if (missingRequired > 0) {
    console.log('\n❌ Missing required environment variables. Check your .env file.');
    process.exit(1);
  } else if (missingRecommended > 0) {
    console.log('\n⚠️  Some optional features won\'t work without recommended variables.');
    console.log('Update .env to enable Signal features (embeddings, job queue).\n');
    process.exit(0);
  } else {
    console.log('\n✅ All variables configured!\n');
    process.exit(0);
  }
}

testEnvironment();
