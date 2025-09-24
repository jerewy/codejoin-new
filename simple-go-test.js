const axios = require('axios');

const SERVER_URL = 'http://localhost:3001';
const API_KEY = 'test123';

async function testGo() {
  try {
    const response = await axios.post(`${SERVER_URL}/api/execute`, {
      language: 'go',
      code: `package main
import "fmt"
func main() {
    fmt.Println("Hello Go!")
}`
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY
      }
    });

    console.log('Go test response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testGo();