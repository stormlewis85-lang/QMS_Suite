#!/bin/bash

# PFMEA Suite - Replit Quick Start
# This script sets up the complete PFMEA application on Replit

set -e

echo "🚀 PFMEA Suite - Replit Setup"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check Node.js version
echo -e "${YELLOW}[1/7]${NC} Checking Node.js version..."
node_version=$(node --version)
echo "✓ Node.js $node_version detected"
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}[2/7]${NC} Installing dependencies..."
npm install
echo "✓ Dependencies installed"
echo ""

# Step 3: Check for DATABASE_URL
echo -e "${YELLOW}[3/7]${NC} Checking database configuration..."
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}✗ DATABASE_URL not found!${NC}"
    echo ""
    echo "Please set up PostgreSQL:"
    echo "1. Go to Tools → Database in Replit"
    echo "2. Create a PostgreSQL database"
    echo "3. Add DATABASE_URL to Secrets"
    echo ""
    echo "Example: postgresql://user:pass@host:5432/dbname"
    echo ""
    exit 1
else
    echo "✓ DATABASE_URL configured"
fi
echo ""

# Step 4: Generate database schema
echo -e "${YELLOW}[4/7]${NC} Generating database schema..."
npm run db:generate
echo "✓ Schema generated"
echo ""

# Step 5: Push schema to database
echo -e "${YELLOW}[5/7]${NC} Pushing schema to database..."
npm run db:push
echo "✓ Schema pushed"
echo ""

# Step 6: Seed database
echo -e "${YELLOW}[6/7]${NC} Seeding database with sample data..."
npm run db:seed
echo "✓ Database seeded"
echo ""

# Step 7: Build application
echo -e "${YELLOW}[7/7]${NC} Building application..."
npm run build
echo "✓ Application built"
echo ""

# Success message
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To view the database:"
echo "  npm run db:studio"
echo ""
echo "Access your app at: https://$REPL_SLUG.$REPL_OWNER.repl.co"
echo ""
