# MikroTik Voucher Generator

Multi-router voucher management system for MikroTik Hotspot (v6 & v7 support)

## Features

- 🔐 JWT Authentication with role-based access
- 🌐 Multi-router management (API & API-SSL)
- 🎫 Bulk voucher generation
- 📊 Printable voucher templates (Thermal/A4)
- 📈 Voucher history & status tracking
- 📥 Export to CSV/PDF
- 🔒 Encrypted router credentials in MongoDB
- 🚀 Support for MikroTik v6 and v7

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT for authentication
- node-routeros for MikroTik API
- PDFKit for PDF generation
- QR Code integration
## Quick Start

### Prerequisites
- Node.js 14+
- MongoDB
- MikroTik RouterOS 6+ or 7+

\`\`\`bash
# Clone repository
git clone https://github.com/sameeullah3135/mikrotik-voucher-generator.git
cd mikrotik-voucher-generator

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Start MongoDB
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Create admin user
node scripts/createAdmin.js

# Start server
npm start
\`\`\`

## API Documentation

[API documentation here]

## License

MIT
