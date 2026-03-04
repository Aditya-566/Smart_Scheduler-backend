import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import path from 'path';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import authRoutes from './routes/authRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
connectDB();

const app = express();

// Middlewares
app.use(express.json());

// CORS Configuration - Must come before helmet
const corsOptions = {
    origin: [
        'https://smartschedulerfrontend.vercel.app',
        'https://smart-scheduler-frontend.vercel.app',
        'https://smart-scheduler-fontend.vercel.app',
        'https://smart-scheduler-fontend-afxiufk17.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        process.env.FRONTEND_URL || '*'
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Length'],
    maxAge: 86400
};

app.use(cors(corsOptions));

// Helmet for security (after CORS)
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Morgan logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Smart Classroom & Timetable Scheduler API is running...');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
