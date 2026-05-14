/**
 * Test: PostgreSQL Connection
 * Purpose: Verify Node.js can connect to signal_db
 * Run: npx tsx tests/db-connection.test.ts
 */

import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load .env file
dotenv.config({ path: '.env' });

async function testDatabaseConnection() {
  console.log('Testing PostgreSQL Connection...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://madhuriamam@localhost:5432/signal_db',
  });

  try {
    // Test 1: Basic connection
    console.log('✓ Test 1: Attempting connection...');
    const client = await pool.connect();
    console.log('✅ Connected successfully\n');

    // Test 2: Simple query
    console.log('✓ Test 2: Running SELECT 1...');
    const result = await client.query('SELECT 1');
    console.log('✅ Query result:', result.rows[0], '\n');

    // Test 3: Check tables exist
    console.log('✓ Test 3: Checking tables...');
    const tableResult = await client.query(
      `SELECT table_name FROM information_schema.tables 
       WHERE table_schema='public' AND table_name IN ('sources','articles','signals') 
       ORDER BY table_name`
    );
    console.log('✅ Tables found:', tableResult.rows.map((r: any) => r.table_name).join(', '), '\n');

    // Test 4: Check pgvector extension
    console.log('✓ Test 4: Checking pgvector...');
    const vectorResult = await client.query(
      `SELECT installed_version FROM pg_available_extensions WHERE name='vector'`
    );
    if (vectorResult.rows.length > 0) {
      console.log('✅ pgvector version:', vectorResult.rows[0].installed_version, '\n');
    } else {
      console.log('⚠️  pgvector not found\n');
    }

    // Test 5: Check articles schema including embedding column
    console.log('✓ Test 5: Checking articles schema...');
    const schemaResult = await client.query(
      `SELECT column_name, udt_name FROM information_schema.columns 
       WHERE table_name='articles' ORDER BY ordinal_position`
    );
    console.log('✅ Articles columns:');
    schemaResult.rows.forEach((row: any) => {
      console.log(`   - ${row.column_name}: ${row.udt_name}`);
    });

    client.release();
    console.log('\n✅ ALL TESTS PASSED - PostgreSQL connection working!');
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();
