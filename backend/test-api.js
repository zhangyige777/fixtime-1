#!/usr/bin/env node

// Simple API test script for FixTime AI Backend
// Run with: node test-api.js

const API_BASE = 'http://localhost:8787';

// Test endpoints without authentication
async function testPublicEndpoints() {
  console.log('\n=== Testing Public Endpoints ===\n');

  try {
    // Test health check
    console.log('1. Health Check...');
    const health = await fetch(`${API_BASE}/`);
    console.log(`   Status: ${health.status}`);
    console.log(`   Response: ${await health.text()}\n`);

    // Test equipment templates
    console.log('2. Get Equipment Templates...');
    const templates = await fetch(`${API_BASE}/api/templates/equipment`);
    const templatesData = await templates.json();
    console.log(`   Status: ${templates.status}`);
    console.log(`   Found ${templatesData.data?.length || 0} templates\n`);

    // Test search
    console.log('3. Search Templates...');
    const search = await fetch(`${API_BASE}/api/templates/search?q=Generator`);
    const searchData = await search.json();
    console.log(`   Status: ${search.status}`);
    console.log(`   Results: ${searchData.data?.length || 0} items\n`);

  } catch (error) {
    console.error('Error testing public endpoints:', error.message);
  }
}

// Test workflow with simulated authentication
async function testWorkflow() {
  console.log('\n=== Testing Workflow (No Auth) ===\n');

  try {
    // This will fail without auth, which is expected
    console.log('1. Testing protected endpoint (should fail)...');
    const assets = await fetch(`${API_BASE}/api/assets`);
    console.log(`   Status: ${assets.status} (Expected: 401 Unauthorized)\n`);

  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🧪 FixTime AI API Test Suite');
  console.log('================================');
  console.log('Make sure your API is running: npm run dev\n');

  await testPublicEndpoints();
  await testWorkflow();

  console.log('\n✅ Basic tests completed!');
  console.log('\n📝 Next Steps:');
  console.log('   1. Set up Clerk authentication');
  console.log('   2. Test authenticated endpoints');
  console.log('   3. Deploy to Cloudflare Workers');
}

runTests().catch(console.error);