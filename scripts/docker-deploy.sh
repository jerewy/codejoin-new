#!/bin/bash

# Docker Deployment Script
# This script helps you deploy your application using Docker containers

set -e

echo "🐳 Docker Deployment Script"
echo "==========================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Check if Docker and Docker Compose are installed
check_dependencies() {
    print_header "🔍 Checking Dependencies"
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_status "Docker and Docker Compose are installed."
    echo ""
}

# Create environment file if it doesn't exist
setup_environment() {
    print_header "⚙️ Setting Up Environment"
    
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_status "Created .env from .env.example"
        else
            print_warning "No .env.example found. Creating basic .env file."
            cat > .env << EOF
# Environment Variables for Docker Deployment
# Please update these values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# API Keys
API_KEY=your_secure_api_key_here

# AI Service Keys (optional)
ANTHROPIC_API_KEY=your_anthropic_key
OPENROUTER_API_KEY=your_openrouter_key
GOOGLE_API_KEY=your_google_key
EOF
        fi
        print_warning "Please edit .env file with your actual values before continuing."
        read -p "Press Enter to continue after editing .env file..."
    else
        print_status ".env file already exists."
    fi
    echo ""
}

# Build Docker images
build_images() {
    print_header "🔨 Building Docker Images"
    
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t codejoin-frontend .
    
    print_status "Building backend image..."
    cd code-execution-backend
    docker build -t codejoin-backend .
    cd ..
    
    print_status "Building Socket.IO server image..."
    cd socket-server
    docker build -t codejoin-socket .
    cd ..
    
    print_status "All Docker images built successfully."
    echo ""
}

# Start services
start_services() {
    print_header "🚀 Starting Services"
    
    # Stop any existing containers
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # Start new containers
    docker-compose up -d
    
    print_status "Services are starting up..."
    echo ""
}

# Wait for services to be ready
wait_for_services() {
    print_header "⏳ Waiting for Services to Be Ready"
    
    # Wait for frontend
    print_status "Waiting for frontend (port 3000)..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_status "Frontend is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Frontend may still be starting up..."
    fi
    
    # Wait for backend
    print_status "Waiting for backend (port 3001)..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3001/health >/dev/null 2>&1; then
            print_status "Backend is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Backend may still be starting up..."
    fi
    
    # Wait for Socket.IO server
    print_status "Waiting for Socket.IO server (port 3002)..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3002/health >/dev/null 2>&1; then
            print_status "Socket.IO server is ready!"
            break
        fi
        sleep 2
        timeout=$((timeout-2))
    done
    
    if [ $timeout -le 0 ]; then
        print_warning "Socket.IO server may still be starting up..."
    fi
    
    echo ""
}

# Show service status
show_status() {
    print_header "📊 Service Status"
    docker-compose ps
    echo ""
    
    print_header "🌐 Access URLs"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:3001"
    echo "Socket.IO: http://localhost:3002"
    echo "Nginx (if enabled): http://localhost"
    echo ""
}

# Show logs
show_logs() {
    print_header "📋 Recent Logs"
    docker-compose logs --tail=20
    echo ""
}

# Cleanup function
cleanup() {
    print_header "🧹 Cleanup Options"
    echo "1) Stop containers"
    echo "2) Stop and remove containers"
    echo "3) Stop, remove containers and images"
    echo "4) Stop, remove containers, images, and volumes"
    echo "5) Cancel"
    echo ""
    read -p "Choose cleanup option (1-5): " choice
    
    case $choice in
        1)
            docker-compose stop
            print_status "Containers stopped."
            ;;
        2)
            docker-compose down
            print_status "Containers stopped and removed."
            ;;
        3)
            docker-compose down --rmi all
            print_status "Containers, images stopped and removed."
            ;;
        4)
            docker-compose down --rmi all --volumes --remove-orphans
            docker system prune -f
            print_status "Full cleanup completed."
            ;;
        5)
            print_status "Cleanup cancelled."
            ;;
        *)
            print_error "Invalid choice."
            ;;
    esac
}

# Main menu
main_menu() {
    while true; do
        print_header "📋 Docker Deployment Menu"
        echo "1) Full deployment (build and start)"
        echo "2) Build images only"
        echo "3) Start services only"
        echo "4) Stop services"
        echo "5) Restart services"
        echo "6) Show service status"
        echo "7) Show logs"
        echo "8) Cleanup"
        echo "9) Exit"
        echo ""
        read -p "Choose an option (1-9): " choice
        
        case $choice in
            1)
                check_dependencies
                setup_environment
                build_images
                start_services
                wait_for_services
                show_status
                ;;
            2)
                check_dependencies
                build_images
                ;;
            3)
                start_services
                wait_for_services
                show_status
                ;;
            4)
                docker-compose down
                print_status "Services stopped."
                ;;
            5)
                docker-compose restart
                wait_for_services
                show_status
                ;;
            6)
                show_status
                ;;
            7)
                show_logs
                ;;
            8)
                cleanup
                ;;
            9)
                print_status "Goodbye! 👋"
                exit 0
                ;;
            *)
                print_error "Invalid choice. Please try again."
                ;;
        esac
        
        echo ""
        read -p "Press Enter to continue..."
        clear
    done
}

# Script entry point
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Docker Deployment Script"
    echo "Usage: $0 [option]"
    echo ""
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --deploy       Run full deployment"
    echo "  --build        Build images only"
    echo "  --start        Start services only"
    echo "  --stop         Stop services"
    echo "  --status       Show service status"
    echo "  --logs         Show logs"
    echo "  --cleanup      Cleanup resources"
    echo ""
    exit 0
fi

# Handle command line arguments
case $1 in
    --deploy)
        check_dependencies
        setup_environment
        build_images
        start_services
        wait_for_services
        show_status
        ;;
    --build)
        check_dependencies
        build_images
        ;;
    --start)
        start_services
        wait_for_services
        show_status
        ;;
    --stop)
        docker-compose down
        ;;
    --status)
        show_status
        ;;
    --logs)
        show_logs
        ;;
    --cleanup)
        cleanup
        ;;
    *)
        clear
        main_menu
        ;;
esac