const mqtt = require('mqtt');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
require('dotenv').config();

// Connect to the same MQTT broker as the publisher
const client = mqtt.connect(process.env.BROKER_URL, {
  username: process.env.USER,
  password: process.env.PASSWORD
});

// Update Dashboard endpoint to use port 8080
const DASHBOARD_URL = 'http://localhost:8080/api/parking-data';

// Add this function to check if the server is available
async function isServerAvailable(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

client.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  // Subscribe to the parking/data topic
  client.subscribe('parking/data', (err) => {
    if (err) {
      console.error('Subscription error:', err);
      return;
    }
    console.log('Subscribed to parking/data topic');
  });
});

client.on('message', async (topic, message) => {
  console.log('----------------------------------------');
  console.log('Received message at:', new Date().toISOString());
  console.log('Topic:', topic);
  
  try {
    const parkingData = JSON.parse(message.toString());
    console.log('Data:', parkingData);

    // Check if server is available before forwarding
    if (!await isServerAvailable(DASHBOARD_URL)) {
      console.error('Dashboard server is not available. Make sure the dashboard is running on port 8080');
      return;
    }

    // Forward the message to the dashboard
    const response = await fetch(DASHBOARD_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(parkingData),
    });

    if (!response.ok) {
      throw new Error(`Failed to forward data: ${response.status} ${response.statusText}`);
    }

    console.log('Successfully forwarded data to dashboard');
  } catch (error) {
    console.error('Error forwarding data to dashboard:', error);
  }
});

client.on('error', (error) => {
  console.error('MQTT Error:', error);
});
