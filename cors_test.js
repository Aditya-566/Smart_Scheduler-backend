import express from 'express';
import cors from 'cors';
const app = express();

const FRONTEND_URL = 'smartschedulerfontend.vercel.app'; // Mocking process.env

const corsOptions = {
    origin: [
        'https://smartschedulerfrontend.vercel.app',
        'https://smart-scheduler-frontend.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        FRONTEND_URL || '*'
    ]
};

app.use(cors(corsOptions));
app.get('/test', (req, res) => res.json({ ok: true }));
app.listen(9999, () => console.log('Test server running'));
