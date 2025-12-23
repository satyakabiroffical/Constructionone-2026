# Node.js API Boilerplate

A production-ready Node.js API with Express, MongoDB, and best practices for high performance and maintainability.

## Features

- 🚀 **Fast API responses** (optimized for <100ms response times)
- 🔒 **Secure by default** (Helmet, CORS, rate limiting, input sanitization)
- 🛠 **Modern JavaScript** (ES modules, async/await)
- 🏗 **Modular architecture** (MVC pattern with services layer)
- ✅ **Input validation** (express-validator)
- 📊 **Logging** (Winston with file rotation)
- 🧪 **Testing ready** (Jest setup included)
- 🔄 **Caching** (in-memory with Redis potential)
- 📦 **Environment configuration** (dotenv)
- 🗃 **MongoDB** with Mongoose (ODM with schemas and models)
- 🛡 **Error handling** (Global error handling middleware)
- 📝 **API documentation** (OpenAPI/Swagger ready)

## Project Structure

```
src/
├── config/           # Configuration files
│   └── database.js   # Database connection
├── controllers/      # Route controllers
├── middleware/       # Custom middleware
├── models/           # Mongoose models
├── routes/           # API routes
├── services/         # Business logic
├── utils/            # Utility functions
│   └── logger.js     # Winston logger
└── validations/      # Request validation schemas
```

## Getting Started

### Prerequisites

- Node.js 16+ & npm 8+
- MongoDB 5.0+

### Installation

1. Clone the repository
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Set up environment variables
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start the development server
   ```bash
   npm run dev
   ```

5. Build and start for production
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

### Examples

- `GET /api/v1/examples` - Get all examples
- `GET /api/v1/examples/:id` - Get a single example
- `POST /api/v1/examples` - Create a new example
- `PATCH /api/v1/examples/:id` - Update an example
- `DELETE /api/v1/examples/:id` - Delete an example

## Performance Optimization

- **Database Indexing**: Proper indexes for common queries
- **Query Optimization**: Using `lean()`, `select()`, and `populate()` efficiently
- **Caching**: In-memory caching for frequently accessed data
- **Compression**: Response compression with `compression`
- **Connection Pooling**: Optimized MongoDB connection settings
- **Request Limiting**: Rate limiting to prevent abuse

## Best Practices

- **Environment Configuration**: Sensitive data in environment variables
- **Error Handling**: Global error handling middleware
- **Logging**: Structured logging with Winston
- **Security**: Helmet, CORS, rate limiting, input sanitization
- **Code Organization**: Modular structure with separation of concerns
- **Validation**: Request validation with express-validator
- **Documentation**: Code comments and API documentation

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Deployment

1. Set up a MongoDB database (e.g., MongoDB Atlas)
2. Configure environment variables in production
3. Use PM2 or similar process manager for Node.js
4. Set up Nginx as a reverse proxy
5. Enable HTTPS with Let's Encrypt

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Express](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Mongoose](https://mongoosejs.com/)
- [Winston](https://github.com/winstonjs/winston)
- [Jest](https://jestjs.io/)
