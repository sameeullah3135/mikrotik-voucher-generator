const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

dotenv.config();

const app = express();

// Mock database (replace with real MongoDB later)
let users = [];
let routers = [];
let vouchers = [];

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api', limiter);

// Serve static files
app.use(express.static('public'));

// ============= AUTHENTICATION ROUTES =============

// Register endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Check if user exists
    const userExists = users.find(u => u.username === username);
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const user = {
      id: users.length + 1,
      username,
      password: hashedPassword,
      role: role || 'user',
      createdAt: new Date()
    };
    
    users.push(user);
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      id: user.id,
      username: user.username,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find user
    const user = users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your_secret_key',
      { expiresIn: '7d' }
    );
    
    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      token
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get current user (protected route example)
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

// ============= ROUTER MANAGEMENT =============

// Get all routers
app.get('/api/routers', authenticateToken, (req, res) => {
  res.json(routers);
});

// Add router
app.post('/api/routers', authenticateToken, (req, res) => {
  const router = {
    id: routers.length + 1,
    ...req.body,
    status: 'active',
    createdAt: new Date()
  };
  routers.push(router);
  res.status(201).json(router);
});

// Update router
app.put('/api/routers/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = routers.findIndex(r => r.id === id);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Router not found' });
  }
  
  routers[index] = { ...routers[index], ...req.body };
  res.json(routers[index]);
});

// Delete router
app.delete('/api/routers/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  routers = routers.filter(r => r.id !== id);
  res.json({ message: 'Router deleted successfully' });
});

// Test router connection
app.post('/api/routers/:id/test', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const router = routers.find(r => r.id === id);
  
  if (!router) {
    return res.status(404).json({ message: 'Router not found' });
  }
  
  // Mock connection test
  res.json({ 
    success: true, 
    identity: router.name || 'MikroTik Router',
    version: '7.14.3'
  });
});

// ============= VOUCHER MANAGEMENT =============

// Generate vouchers
app.post('/api/vouchers/generate', authenticateToken, (req, res) => {
  const { routerId, profile, quantity, validity, price, prefix = 'V' } = req.body;
  
  const generatedVouchers = [];
  
  for (let i = 0; i < quantity; i++) {
    const voucherCode = `${prefix}${Date.now()}${Math.floor(Math.random() * 1000)}`;
    const password = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const voucher = {
      id: vouchers.length + 1,
      code: voucherCode,
      password: password,
      routerId,
      profile,
      price,
      validity,
      status: 'active',
      generatedBy: req.user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + parseValidity(validity))
    };
    
    vouchers.push(voucher);
    generatedVouchers.push(voucher);
  }
  
  res.status(201).json({
    message: `${quantity} vouchers generated successfully`,
    vouchers: generatedVouchers
  });
});

// Get all vouchers
app.get('/api/vouchers', authenticateToken, (req, res) => {
  const { routerId, status } = req.query;
  let filtered = vouchers;
  
  if (routerId) {
    filtered = filtered.filter(v => v.routerId == routerId);
  }
  if (status) {
    filtered = filtered.filter(v => v.status === status);
  }
  
  res.json(filtered);
});

// Export to CSV
app.get('/api/vouchers/export/csv', authenticateToken, (req, res) => {
  const csv = convertToCSV(vouchers);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=vouchers.csv');
  res.send(csv);
});

// Print voucher (PDF)
app.get('/api/vouchers/print/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const voucher = vouchers.find(v => v.id === id);
  
  if (!voucher) {
    return res.status(404).json({ message: 'Voucher not found' });
  }
  
  // Simple HTML printable version
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Voucher ${voucher.code}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        .voucher { border: 2px solid #333; padding: 20px; max-width: 400px; margin: 0 auto; }
        h2 { text-align: center; }
        .info { margin: 10px 0; }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="voucher">
        <h2>HOTSPOT VOUCHER</h2>
        <div class="info"><strong>Username:</strong> ${voucher.code}</div>
        <div class="info"><strong>Password:</strong> ${voucher.password}</div>
        <div class="info"><strong>Profile:</strong> ${voucher.profile}</div>
        <div class="info"><strong>Validity:</strong> ${voucher.validity}</div>
        <div class="info"><strong>Price:</strong> $${voucher.price}</div>
        <button class="no-print" onclick="window.print()">Print</button>
      </div>
    </body>
    </html>
  `;
  
  res.send(html);
});

// ============= HELPER FUNCTIONS =============

function parseValidity(validity) {
  const value = parseInt(validity);
  const unit = validity.replace(/[0-9]/g, '');
  
  switch(unit) {
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'm': return value * 30 * 24 * 60 * 60 * 1000;
    default: return value * 60 * 60 * 1000;
  }
}

function convertToCSV(data) {
  if (!data.length) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(obj => headers.map(header => JSON.stringify(obj[header] || '')).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    message: 'MikroTik Voucher Generator API is running',
    version: '1.0.0'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({ 
    message: 'MikroTik Voucher Generator API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me'
      },
      routers: {
        list: 'GET /api/routers',
        add: 'POST /api/routers',
        update: 'PUT /api/routers/:id',
        delete: 'DELETE /api/routers/:id',
        test: 'POST /api/routers/:id/test'
      },
      vouchers: {
        generate: 'POST /api/vouchers/generate',
        list: 'GET /api/vouchers',
        export: 'GET /api/vouchers/export/csv',
        print: 'GET /api/vouchers/print/:id'
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Visit: http://localhost:${PORT}`);
  console.log(`🔗 API: https://mikrotik-voucher-api.onrender.com`);
});
