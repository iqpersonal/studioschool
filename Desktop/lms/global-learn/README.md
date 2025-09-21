# Global Learn

Global Learn is a comprehensive online learning platform designed to provide immersive educational experiences for students, parents, and instructors. The platform features secure user dashboards, real-time activity feeds, collaborative tools, and advanced analytics to enhance the learning journey.

## Features

- **User Authentication**: Secure sign-up and login processes for students, parents, and instructors.
- **Distinct User Dashboards**: Tailored dashboards for each user type, providing relevant information and tools.
- **Content Management**: Easy upload and management of course content, including lessons and quizzes.
- **Real-Time Activity Feeds**: Stay updated with real-time notifications and activity updates.
- **Collaborative Tools**: Facilitate group projects and shared workspaces for enhanced learning.
- **Immersive Learning Experiences**: Engage users with interactive and immersive learning modules.
- **Advanced Analytics**: Generate detailed reports on student engagement and performance.
- **Secure Payment Gateway**: Safe and reliable payment processing for course enrollments.

## Getting Started

To get started with Global Learn, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/global-learn.git
   cd global-learn
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Configure your environment variables in a `.env` file based on the provided `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Build the application:
   ```bash
   npm run build
   ```

5. Start the application:
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🚀 Deployment

**Ready to deploy to the web?** Check out our comprehensive [Deployment Guide](./DEPLOYMENT.md) for step-by-step instructions on deploying to:

- **Heroku** - Quick and easy deployment
- **Vercel** - Excellent for serverless deployment
- **Railway** - Modern deployment platform
- **Render** - Simple cloud hosting
- **Digital Ocean** - Scalable cloud infrastructure
- **AWS Elastic Beanstalk** - Amazon's platform service
- **Google Cloud Platform** - Google's cloud services
- **Docker** - Containerized deployment

### Quick Deploy Options

| Platform | Deploy Button | Documentation |
|----------|---------------|---------------|
| Heroku | [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy) | [Heroku Guide](./DEPLOYMENT.md#1-heroku-deployment) |
| Vercel | [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone) | [Vercel Guide](./DEPLOYMENT.md#2-vercel-deployment) |
| Railway | [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template) | [Railway Guide](./DEPLOYMENT.md#3-railway-deployment) |

## Environment Configuration

The application requires the following environment variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `JWT_SECRET` | JWT secret key | Yes | - |
| `MONGODB_URI` | MongoDB connection string | Yes* | - |
| `DB_HOST` | PostgreSQL host | Yes* | localhost |
| `PAYMENT_API_KEY` | Stripe API key | No | - |

*Either MongoDB or PostgreSQL configuration is required

## Technologies Used

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB or PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Payments**: Stripe
- **File Upload**: Multer
- **Logging**: Winston
- **Testing**: Jest
- **Deployment**: Docker, Heroku, Vercel, Railway

## API Documentation

The API provides the following main endpoints:

- `GET /health` - Health check endpoint
- `POST /api/auth/login` - User authentication
- `POST /api/auth/register` - User registration
- `GET /api/users` - Get users (authenticated)
- `POST /api/content` - Upload course content
- `GET /api/analytics` - Get analytics data
- `POST /api/payments` - Process payments

## Development

### Running in Development Mode

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

### Docker Development

```bash
# Build and run with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📖 [Deployment Guide](./DEPLOYMENT.md)
- 🐛 [Report Issues](https://github.com/yourusername/global-learn/issues)
- 💬 [Discussions](https://github.com/yourusername/global-learn/discussions)
- 📧 Email: support@globallearn.com

---

**Happy Learning! 🎓**