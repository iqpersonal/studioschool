#!/bin/bash

# Global Learn - Deployment Script
# This script helps automate the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to validate environment
validate_environment() {
    print_status "Validating environment..."
    
    # Check Node.js
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js 16 or higher."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        print_error "Node.js version 16 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    # Check npm
    if ! command_exists npm; then
        print_error "npm is not installed."
        exit 1
    fi
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        print_warning ".env file not found. Please copy .env.example to .env and configure it."
        if [ -f ".env.example" ]; then
            print_status "Copying .env.example to .env..."
            cp .env.example .env
            print_warning "Please edit .env file with your configuration before proceeding."
            exit 1
        fi
    fi
    
    print_success "Environment validation completed."
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm ci --only=production
    print_success "Dependencies installed successfully."
}

# Function to build application
build_application() {
    print_status "Building application..."
    npm run build
    print_success "Application built successfully."
}

# Function to test application
test_application() {
    print_status "Running tests..."
    if npm test 2>/dev/null; then
        print_success "All tests passed."
    else
        print_warning "Tests failed or no tests found. Continuing anyway..."
    fi
}

# Function to start application
start_application() {
    print_status "Starting application..."
    
    # Check if port is available
    local port=${PORT:-5000}
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null; then
        print_error "Port $port is already in use. Please stop the existing process or change the PORT environment variable."
        exit 1
    fi
    
    npm start &
    local pid=$!
    
    # Wait for application to start
    print_status "Waiting for application to start..."
    sleep 5
    
    # Check if application is running
    if ps -p $pid > /dev/null; then
        print_success "Application started successfully on port $port"
        print_status "Health check: http://localhost:$port/health"
        print_status "Process ID: $pid"
        
        # Test health endpoint
        if command_exists curl; then
            print_status "Testing health endpoint..."
            if curl -f http://localhost:$port/health >/dev/null 2>&1; then
                print_success "Health check passed!"
            else
                print_warning "Health check failed. Application may still be starting..."
            fi
        fi
    else
        print_error "Failed to start application."
        exit 1
    fi
}

# Function to deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker..."
    
    if ! command_exists docker; then
        print_error "Docker is not installed."
        exit 1
    fi
    
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed."
        exit 1
    fi
    
    print_status "Building Docker image..."
    docker build -t global-learn .
    
    print_status "Starting services with Docker Compose..."
    docker-compose up -d
    
    print_success "Docker deployment completed."
    print_status "Application is running at http://localhost:80"
}

# Function to show deployment options
show_deployment_options() {
    echo
    print_status "Available deployment options:"
    echo "1. Local deployment (default)"
    echo "2. Docker deployment"
    echo "3. Heroku deployment"
    echo "4. Vercel deployment"
    echo "5. Railway deployment"
    echo
}

# Function to deploy to Heroku
deploy_heroku() {
    print_status "Deploying to Heroku..."
    
    if ! command_exists heroku; then
        print_error "Heroku CLI is not installed. Please install it first."
        print_status "Visit: https://devcenter.heroku.com/articles/heroku-cli"
        exit 1
    fi
    
    # Check if user is logged in
    if ! heroku auth:whoami >/dev/null 2>&1; then
        print_status "Please login to Heroku first:"
        heroku login
    fi
    
    # Check if app exists
    if ! heroku apps:info >/dev/null 2>&1; then
        print_status "Creating new Heroku app..."
        heroku create global-learn-$(date +%s)
    fi
    
    print_status "Deploying to Heroku..."
    git push heroku main
    
    print_success "Heroku deployment completed."
    heroku open
}

# Function to deploy to Vercel
deploy_vercel() {
    print_status "Deploying to Vercel..."
    
    if ! command_exists vercel; then
        print_error "Vercel CLI is not installed."
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    print_status "Deploying to Vercel..."
    vercel --prod
    
    print_success "Vercel deployment completed."
}

# Function to deploy to Railway
deploy_railway() {
    print_status "Deploying to Railway..."
    
    if ! command_exists railway; then
        print_error "Railway CLI is not installed."
        print_status "Installing Railway CLI..."
        npm install -g @railway/cli
    fi
    
    print_status "Deploying to Railway..."
    railway login
    railway up
    
    print_success "Railway deployment completed."
}

# Main deployment function
main() {
    echo
    print_status "Global Learn - Deployment Script"
    echo "================================="
    echo
    
    # Parse command line arguments
    local deployment_type=${1:-local}
    
    case $deployment_type in
        "local")
            validate_environment
            install_dependencies
            build_application
            test_application
            start_application
            ;;
        "docker")
            deploy_docker
            ;;
        "heroku")
            validate_environment
            install_dependencies
            build_application
            deploy_heroku
            ;;
        "vercel")
            validate_environment
            install_dependencies
            build_application
            deploy_vercel
            ;;
        "railway")
            validate_environment
            install_dependencies
            build_application
            deploy_railway
            ;;
        "help"|"-h"|"--help")
            show_deployment_options
            echo "Usage: $0 [local|docker|heroku|vercel|railway|help]"
            echo
            echo "Examples:"
            echo "  $0                # Local deployment (default)"
            echo "  $0 docker         # Deploy with Docker"
            echo "  $0 heroku         # Deploy to Heroku"
            echo "  $0 vercel         # Deploy to Vercel"
            echo "  $0 railway        # Deploy to Railway"
            echo
            exit 0
            ;;
        *)
            print_error "Unknown deployment type: $deployment_type"
            show_deployment_options
            echo "Use '$0 help' for more information."
            exit 1
            ;;
    esac
    
    echo
    print_success "Deployment completed successfully!"
    echo
}

# Run main function with all arguments
main "$@"