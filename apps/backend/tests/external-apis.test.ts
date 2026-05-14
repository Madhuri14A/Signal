/**
 * Test: External APIs
 * Purpose: Verify Gemini and Redis connectivity (Signal-specific)
 * Run: npx tsx tests/external-apis.test.ts
 */

import dotenv from 'dotenv';
import axios from 'axios';

// Load .env file
dotenv.config({ path: '.env' });

async function testExternalAPIs() {
  console.log('🔍 Testing External APIs (Signal Features)...\n');
  const embedModel = process.env.GEMINI_EMBED_MODEL || 'models/gemini-embedding-001';

  // Test Gemini
  console.log('📌 Gemini API Test:');
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log('⚠️  GEMINI_API_KEY not set - embeddings won\'t work');
    } else {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${embedModel}:embedContent?key=${apiKey}`,
        {
          model: embedModel,
          content: {
            parts: [{ text: 'signal api connectivity test' }],
          },
        },
        { timeout: 10000 }
      );

      const values = (response.data as { embedding?: { values?: number[] } })?.embedding?.values;
      if (Array.isArray(values) && values.length > 0) {
        console.log(`✅ Gemini embedding API connected (${embedModel}, dimension: ${values.length})`);
      } else {
        console.log('⚠️  Gemini responded but no embedding values were found');
      }
    }
  } catch (error) {
    console.error('❌ Gemini API test failed:', error instanceof Error ? error.message : error);
  }

  console.log();

  // Test Redis/Upstash
  console.log('📌 Redis (Upstash) Test:');
  try {
    const redisUrl = process.env.UPSTASH_REDIS_URL;
    const redisToken = process.env.UPSTASH_REDIS_TOKEN;

    if (!redisUrl || !redisToken) {
      console.log('⚠️  UPSTASH_REDIS_URL or UPSTASH_REDIS_TOKEN not set');
      console.log('   Job queue (BullMQ) won\'t work');
    } else {
      console.log('✓ Attempting Redis connection...');
      try {
        // Try a simple HTTP ping to Upstash REST API
        const response = await axios.post(
          `${redisUrl}/ping`,
          {},
          {
            headers: {
              Authorization: `Bearer ${redisToken}`,
            },
            timeout: 5000,
          }
        );

        if (response.status === 200) {
          console.log('✅ Redis (Upstash) connection successful');
          console.log('   Response:', response.data);
        }
      } catch (pingError) {
        console.log('⚠️  Could not verify Redis connection (might still work with BullMQ)');
        console.log('   Error:', pingError instanceof Error ? pingError.message : pingError);
      }
    }
  } catch (error) {
    console.error('❌ Redis test error:', error instanceof Error ? error.message : error);
  }

  console.log('\n✅ API checks complete');
  process.exit(0);
}

testExternalAPIs();
