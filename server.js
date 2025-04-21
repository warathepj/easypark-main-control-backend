const express = require('express');
const cors = require('cors');
const mqtt = require('mqtt');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = 3009;

// Enable CORS and JSON parsing
app.use(cors());
app.use(bodyParser.json());

// Store latest parking data
let latestParkingData = null;

// Connect to MQTT broker using environment variables
const mqttClient = mqtt.connect(process.env.BROKER_URL, {
  username: process.env.USER,
  password: process.env.PASSWORD,
  keepalive: 60,
  reconnectPeriod: 5000,
  connectTimeout: 30 * 1000,
  clean: true,
  rejectUnauthorized: false
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  
  mqttClient.subscribe('parking/data', (err) => {
    if (err) {
      console.error('MQTT Subscription error:', err);
      return;
    }
    console.log('Subscribed to parking/data topic');
  });
});

mqttClient.on('message', (topic, message) => {
  console.log('\n========== MQTT Message Received ==========');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Topic:', topic);
  
  try {
    const data = JSON.parse(message.toString());
    console.log('Payload:', JSON.stringify(data, null, 2));
    latestParkingData = data;
  } catch (error) {
    console.error('Error parsing MQTT message:', error);
    console.log('Raw message:', message.toString());
  }
  
  console.log('=========================================\n');
});

mqttClient.on('disconnect', () => {
  console.log('Disconnected from MQTT broker');
});

mqttClient.on('reconnect', () => {
  console.log('Attempting to reconnect to MQTT broker');
});

mqttClient.on('offline', () => {
  console.log('MQTT client is offline');
});

mqttClient.on('error', (error) => {
  console.error('MQTT Error:', error);
  // Don't end the client on error - let it reconnect
  if (error.code !== 'ECONNRESET') {
    console.error('Fatal MQTT error:', error);
  }
});

// API Routes
app.get('/api/parking-data', (req, res) => {
  res.json(latestParkingData || {});
});

app.post('/api/parking-data', (req, res) => {
  try {
    latestParkingData = req.body;
    console.log('Received HTTP POST data:', latestParkingData);
    
    // Publish to MQTT topic
    mqttClient.publish('parking/data', JSON.stringify(latestParkingData), (err) => {
      if (err) {
        console.error('Error publishing to MQTT:', err);
        return res.status(500).json({ success: false, message: 'Failed to publish to MQTT' });
      }
      res.json({ success: true, message: 'Data received and published successfully' });
    });
  } catch (error) {
    console.error('Error processing parking data:', error);
    res.status(500).json({ success: false, message: 'Failed to process parking data' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});


