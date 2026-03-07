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
import courseRoutes from './routes/courseRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import departmentRoutes from './routes/departmentRoutes.js';
import timeslotRoutes from './routes/timeslotRoutes.js';
import mongoose from 'mongoose';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// Connect to database
connectDB();

// Auto-migrate: Drop old non-partial faculty index if it exists
// The old index rejected null faculty values; the new partial index allows them
const migrateIndexes = async () => {
    try {
        // Wait for connection
        await mongoose.connection.asPromise();
        const collection = mongoose.connection.collection('schedules');
        const indexes = await collection.indexes();
        const oldIndex = indexes.find(idx => idx.name === 'faculty_1_timeSlot_1' && !idx.partialFilterExpression);
        if (oldIndex) {
            await collection.dropIndex('faculty_1_timeSlot_1');
            console.log('Migrated: Dropped old faculty_1_timeSlot_1 index (replaced with partial index)');
        }
    } catch (err) {
        // Index may not exist yet, that's fine
        if (err.code !== 27) { // 27 = IndexNotFound
            console.warn('Index migration note:', err.message);
        }
    }
};
migrateIndexes();

const app = express();

// Middlewares
app.use(express.json());

const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://smart-scheduler-fontend.vercel.app',
    'https://smart-scheduler-frontend.vercel.app'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

// CORS Configuration - Must come before helmet
const corsOptions = {
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`Origin blocked by CORS: ${origin}`);
            callback(null, false); // Return false instead of throwing an error for better handling
        }
    },
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
app.use('/api/courses', courseRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/timeslots', timeslotRoutes);

// Basic route
app.get('/', (req, res) => {
    res.send('Smart Classroom & Timetable Scheduler API is running...');
});

// Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`));
