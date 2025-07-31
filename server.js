import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './resolvers/index.js';
import { WebhookHandler } from './webhook/handler.js';
import { LineService } from './services/lineService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize LINE services
const lineService = new LineService();
const webhookHandler = new WebhookHandler(lineService);

// GraphQL Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    lineService,
    req
  }),
  formatError: (error) => {
    console.error('GraphQL Error:', error);
    return {
      message: error.message,
      path: error.path
    };
  }
});

// Apply GraphQL middleware
await server.start();
server.applyMiddleware({ app, path: '/graphql' });

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    services: {
      graphql: '/graphql',
      webhook: '/webhook'
    }
  });
});

// LINE Webhook endpoint (with proper error handling)
app.post('/webhook', async (req, res) => {
  try {
    // ตรวจสอบว่ามี events หรือไม่
    const events = req.body.events || [];
    console.log(`Received ${events.length} webhook events`);
    
    // ถ้าไม่มี events (LINE verification) ให้ตอบ 200
    if (events.length === 0) {
      console.log('No events received - likely LINE verification');
      res.status(200).json({ success: true, message: 'Webhook verification successful' });
      return;
    }
    
    const results = await webhookHandler.handleEvents(events);
    console.log('Webhook processing results:', results);
    
    res.json({ success: true, processed: results.length });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// LINE Webhook endpoint (without signature validation for testing)
app.post('/webhook/test-verify', async (req, res) => {
  try {
    const events = req.body.events || [];
    console.log(`Received ${events.length} webhook events (test mode)`);
    
    if (events.length === 0) {
      // Return 200 for LINE verification
      res.status(200).json({ success: true, message: 'Webhook verification successful' });
      return;
    }
    
    const results = await webhookHandler.handleEvents(events);
    console.log('Webhook processing results:', results);
    
    res.json({ success: true, processed: results.length });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test webhook endpoint (for development)
app.post('/webhook/test', async (req, res) => {
  try {
    const testEvent = {
      type: 'message',
      message: {
        type: 'text',
        text: 'Test message from server'
      },
      replyToken: 'test-token-123',
      source: {
        userId: 'test-user-123',
        type: 'user'
      }
    };
    
    const result = await webhookHandler.handleEvent(testEvent);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LINE Bot API Server running on port ${PORT}`);
  console.log(`📊 GraphQL endpoint: http://localhost:${PORT}/graphql`);
  console.log(`🔗 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/webhook/test`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

export default app; 