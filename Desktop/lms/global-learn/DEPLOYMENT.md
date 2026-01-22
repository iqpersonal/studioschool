# Global Learn - Web Deployment Guide

This guide provides comprehensive instructions for deploying the Global Learn platform to various web hosting services.

## Prerequisites

Before deploying, ensure you have:

1. **Node.js** (version 16 or higher)
2. **npm** or **yarn** package manager
3. **Git** for version control
4. **Database** (MongoDB or PostgreSQL)
5. **Environment variables** configured

## Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/global-learn.git
   cd global-learn
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Build the application:**
   ```bash
   npm run build
   ```

5. **Start the application:**
   ```bash
   npm start
   ```

## Environment Configuration

Copy `.env.example` to `.env` and configure the following variables:

### Required Variables
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)
- `JWT_SECRET` - Secret key for JWT tokens
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database configuration
- `MONGODB_URI` - MongoDB connection string (if using MongoDB)

### Optional Variables
- `PAYMENT_API_KEY` - Stripe API key for payments
- `EMAIL_HOST`, `EMAIL_USER`, `EMAIL_PASSWORD` - Email service configuration
- `CORS_ORIGIN` - Allowed CORS origins

## Deployment Options

### 1. Heroku Deployment

1. **Install Heroku CLI:**
   ```bash
   # macOS
   brew tap heroku/brew && brew install heroku
   
   # Windows
   # Download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login and create app:**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set environment variables:**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set JWT_SECRET=your_secret_here
   heroku config:set PORT=
   # Add other required environment variables
   ```

4. **Add database addon:**
   ```bash
   # For PostgreSQL
   heroku addons:create heroku-postgresql:hobby-dev
   
   # For MongoDB
   heroku addons:create mongolab:sandbox
   ```

5. **Deploy:**
   ```bash
   git push heroku main
   ```

### 2. Vercel Deployment

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login and deploy:**
   ```bash
   vercel login
   vercel --prod
   ```

3. **Configure environment variables:**
   - Go to your Vercel dashboard
   - Navigate to your project settings
   - Add environment variables from your `.env` file

### 3. Railway Deployment

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Add database:**
   ```bash
   railway add postgresql
   # or
   railway add mongodb
   ```

### 4. Render Deployment

1. **Connect your GitHub repository** to Render
2. **Create a new Web Service**
3. **Configure build and start commands:**
   - Build Command: `npm ci && npm run build`
   - Start Command: `npm start`
4. **Add environment variables** in the Render dashboard
5. **Deploy** automatically on git push

### 5. Digital Ocean App Platform

1. **Create a new app** in Digital Ocean
2. **Connect your GitHub repository**
3. **Configure the app:**
   - Build Command: `npm ci && npm run build`
   - Run Command: `npm start`
   - Environment Variables: Add all required variables
4. **Add managed database** (PostgreSQL or MongoDB)
5. **Deploy**

### 6. AWS Elastic Beanstalk

1. **Install EB CLI:**
   ```bash
   pip install awsebcli
   ```

2. **Initialize and deploy:**
   ```bash
   eb init
   eb create production
   eb deploy
   ```

3. **Configure environment variables:**
   ```bash
   eb setenv NODE_ENV=production JWT_SECRET=your_secret
   ```

### 7. Google Cloud Platform

1. **Install Google Cloud SDK**
2. **Create app.yaml:**
   ```yaml
   runtime: nodejs16
   
   env_variables:
     NODE_ENV: production
     PORT: 8080
   
   automatic_scaling:
     min_instances: 1
     max_instances: 10
   ```

3. **Deploy:**
   ```bash
   gcloud app deploy
   ```

## Docker Deployment

### Local Docker Setup

1. **Build the image:**
   ```bash
   docker build -t global-learn .
   ```

2. **Run with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

### Production Docker Deployment

1. **Use Docker Hub or container registry**
2. **Deploy to container orchestration platform:**
   - Kubernetes
   - Docker Swarm
   - Amazon ECS
   - Google Cloud Run

## Database Setup

### MongoDB Atlas (Recommended)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Get connection string
3. Set `MONGODB_URI` environment variable

### PostgreSQL (Heroku Postgres, AWS RDS, etc.)

1. Create a PostgreSQL database
2. Set database configuration variables:
   - `DB_HOST`
   - `DB_PORT`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`

## SSL/HTTPS Configuration

### Using Cloudflare (Recommended)

1. Add your domain to Cloudflare
2. Enable SSL/TLS encryption
3. Configure DNS records

### Using Let's Encrypt

1. Install Certbot
2. Generate SSL certificates
3. Configure nginx or reverse proxy

## Performance Optimization

### Production Optimizations

1. **Enable gzip compression**
2. **Use CDN for static assets**
3. **Set up caching headers**
4. **Configure connection pooling**
5. **Enable request rate limiting**

### Monitoring and Logging

1. **Application Performance Monitoring:**
   - New Relic
   - DataDog
   - Sentry

2. **Logging:**
   - Winston (already configured)
   - LogRocket
   - Papertrail

## Troubleshooting

### Common Issues

1. **Build failures:**
   - Check Node.js version
   - Ensure all dependencies are installed
   - Verify TypeScript compilation

2. **Database connection issues:**
   - Verify environment variables
   - Check network connectivity
   - Ensure database is running

3. **Environment variable issues:**
   - Double-check variable names
   - Ensure values are properly quoted
   - Verify platform-specific configuration

### Health Check Endpoint

The application includes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok",
  "timestamp": "2023-12-07T10:30:00.000Z",
  "uptime": 12345
}
```

## Security Considerations

1. **Environment Variables:** Never commit `.env` files
2. **JWT Secrets:** Use strong, random secrets
3. **Database Security:** Use connection encryption
4. **CORS:** Configure appropriate origins
5. **Rate Limiting:** Implement to prevent abuse
6. **Input Validation:** Sanitize all user inputs

## Support

For deployment issues:
1. Check the logs for error messages
2. Verify all environment variables are set
3. Ensure database connectivity
4. Check platform-specific documentation

## Example Environment Variables for Production

```bash
# Required
NODE_ENV=production
PORT=5000
JWT_SECRET=your-super-secure-jwt-secret-with-at-least-32-characters
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/global_learn

# Optional but recommended
CORS_ORIGIN=https://yourfrontend.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760

# Payment (if using Stripe)
PAYMENT_API_KEY=sk_live_your_stripe_secret_key

# Email (if using email features)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@yourdomain.com
EMAIL_PASSWORD=your_app_password
```

This deployment guide should help you successfully deploy the Global Learn platform to any major cloud provider or hosting service.