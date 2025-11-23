#!/usr/bin/env node

/**
 * Debug script to test API endpoints
 */

async function testAPI() {
  console.log('Testing /api/chat endpoint...\n');

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'hello',
            parts: [{ type: 'text', text: 'hello' }]
          }
        ],
        selectedModel: 'claude-4-5-sonnet',
        userId: 'test-user-123'
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (response.status === 200) {
      console.log('\n✅ API is working!');
      console.log('Response is streaming...');
    } else {
      const text = await response.text();
      console.log('\n❌ API returned error');
      console.log('Response body:', text);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testAPI();
