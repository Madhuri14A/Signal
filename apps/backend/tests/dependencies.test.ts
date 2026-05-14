/**
 * Test: Core Dependencies
 * Purpose: Verify all critical Signal dependencies load correctly
 * Run: npx tsx tests/dependencies.test.ts
 */

async function testDependencies() {
  console.log('🔍 Testing Core Dependencies...\n');

  const tests: Record<string, () => Promise<void>> = {
    'Express': async () => {
      const express = await import('express');
      if (express.default) {
        console.log('✅ Express:', express.default.version || 'loaded');
      } else {
        throw new Error('Express failed to load');
      }
    },

    'PostgreSQL (pg)': async () => {
      const { Pool } = await import('pg');
      if (Pool) {
        console.log('✅ pg: Pool class available');
      } else {
        throw new Error('pg Pool failed to load');
      }
    },

    'CORS': async () => {
      const cors = await import('cors');
      if (cors.default) {
        console.log('✅ cors: loaded');
      } else {
        throw new Error('cors failed to load');
      }
    },

    'Dotenv': async () => {
      const dotenv = await import('dotenv');
      if (dotenv.config) {
        console.log('✅ dotenv: loaded');
      } else {
        throw new Error('dotenv failed to load');
      }
    },

    'RSS Parser': async () => {
      const Parser = await import('rss-parser');
      if (Parser.default) {
        console.log('✅ rss-parser: loaded');
      } else {
        throw new Error('rss-parser failed to load');
      }
    },

    'Axios': async () => {
      const axios = await import('axios');
      if (axios.default) {
        console.log('✅ axios: loaded');
      } else {
        throw new Error('axios failed to load');
      }
    },

    'BullMQ': async () => {
      const { Queue } = await import('bullmq');
      if (Queue) {
        console.log('✅ bullmq: Queue class available');
      } else {
        throw new Error('bullmq Queue failed to load');
      }
    },

    'Node-Cron': async () => {
      const cron = await import('node-cron');
      if (cron.default) {
        console.log('✅ node-cron: loaded');
      } else {
        throw new Error('node-cron failed to load');
      }
    },

    'Cheerio': async () => {
      const { load } = await import('cheerio');
      if (load) {
        console.log('✅ cheerio: load function available');
      } else {
        throw new Error('cheerio failed to load');
      }
    },
  };

  let passed = 0;
  let failed = 0;

  for (const [name, test] of Object.entries(tests)) {
    try {
      await test();
      passed++;
    } catch (error) {
      console.error(`❌ ${name}:`, error instanceof Error ? error.message : error);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

testDependencies();
