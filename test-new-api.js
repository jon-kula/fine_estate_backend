// Test API endpoints
const apiUrl = 'https://fineestatebackend-production.up.railway.app';

async function testApi() {
  console.log('Testing API endpoints...\n');
  
  // Test root endpoint
  try {
    const rootResponse = await fetch(apiUrl);
    const rootData = await rootResponse.json();
    console.log('Root endpoint (/):', rootData);
  } catch (error) {
    console.error('Root endpoint error:', error.message);
  }
  
  // Test auth endpoint
  try {
    const authResponse = await fetch(`${apiUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'jtsf71@gmail.com',
        password: 'night_!!!'
      })
    });
    
    const authData = await authResponse.json();
    console.log('\nAuth endpoint (/api/auth/login):', authData);
    
    if (authData.token) {
      console.log('Login successful! Token received.');
    }
  } catch (error) {
    console.error('Auth endpoint error:', error.message);
  }
}

testApi();