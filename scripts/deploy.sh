#!/bin/bash

# Simple Deployment Script for Vercel + Railway/Render
# This script helps you deploy your separated frontend and backend services

set -e

echo "🚀 Starting deployment process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install it first."
        exit 1
    fi
    
    # Check for Vercel CLI
    if ! command -v vercel &> /dev/null; then
        print_warning "Vercel CLI not found. Installing..."
        npm install -g vercel
    fi
    
    print_status "Dependencies check completed."
}

# Deploy frontend to Vercel
deploy_frontend() {
    print_status "Deploying frontend to Vercel..."
    
    # Check if vercel.json exists
    if [ ! -f "vercel.json" ]; then
        print_error "vercel.json not found. Please create it first."
        exit 1
    fi
    
    # Deploy to Vercel
    vercel --prod
    
    if [ $? -eq 0 ]; then
        print_status "Frontend deployed successfully to Vercel!"
    else
        print_error "Frontend deployment failed."
        exit 1
    fi
}

# Prepare backend for deployment
prepare_backend() {
    print_status "Preparing backend for deployment..."
    
    # Check if code-execution-backend directory exists
    if [ ! -d "code-execution-backend" ]; then
        print_error "code-execution-backend directory not found."
        exit 1
    fi
    
    # Navigate to backend directory
    cd code-execution-backend
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in code-execution-backend directory."
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing backend dependencies..."
    npm install
    
    cd ..
    print_status "Backend preparation completed."
}

# Prepare socket server for deployment
prepare_socket_server() {
    print_status "Preparing Socket.IO server for deployment..."
    
    # Check if socket-server directory exists
    if [ ! -d "socket-server" ]; then
        print_error "socket-server directory not found."
        exit 1
    fi
    
    # Navigate to socket-server directory
    cd socket-server
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in socket-server directory."
        exit 1
    fi
    
    # Install dependencies
    print_status "Installing Socket.IO server dependencies..."
    npm install
    
    cd ..
    print_status "Socket.IO server preparation completed."
}

# Main deployment function
main() {
    echo "🎯 Simple Deployment Script for Vercel + Railway/Render"
    echo "======================================================"
    
    # Check dependencies
    check_dependencies
    
    # Ask user what to deploy
    echo ""
    echo "What would you like to deploy?"
    echo "1) Frontend only (Vercel)"
    echo "2) Prepare backend services (for Railway/Render)"
    echo "3) All services"
    echo "4) Exit"
    echo ""
    read -p "Please enter your choice (1-4): " choice
    
    case $choice in
        1)
            deploy_frontend
            ;;
        2)
            prepare_backend
            prepare_socket_server
            print_status "Backend services are ready for deployment!"
            print_status "Next steps:"
            print_status "1. Push your code to GitHub"
            print_status "2. Go to Railway.app or Render.com"
            print_status "3. Connect your repositories and deploy"
            ;;
        3)
            deploy_frontend
            prepare_backend
            prepare_socket_server
            print_status "All services are ready!"
            print_status "Frontend is deployed to Vercel."
            print_status "Backend services are ready for Railway/Render deployment."
            ;;
        4)
            print_status "Exiting deployment script."
            exit 0
            ;;
        *)
            print_error "Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
    
    echo ""
    print_status "Deployment process completed! 🎉"
    echo ""
    print_status "Important next steps:"
    print_status "1. Configure environment variables in your deployment platforms"
    print_status "2. Update your frontend environment variables with backend URLs"
    print_status "3. Test all services to ensure they're working correctly"
    print_status "4. Set up monitoring and logging"
    echo ""
    print_status "For detailed instructions, see: docs/SIMPLE_DEPLOYMENT_GUIDE.md"
}

# Run main function
main "$@"