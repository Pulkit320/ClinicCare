import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/authRoutes.js';
import doctorRoutes from './routes/doctorRoutes.js';
import slotRoutes from './routes/slotRoutes.js';
import llmRoutes from './routes/llmRoutes.js';
import { initCronJobs } from './services/cronService.js';

dotenv.config()

const app = express()

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin or any .vercel.app deployment URL
        if (!origin || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
            return callback(null, true);
        }
        return callback(null, true);
    },
    credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/slots', slotRoutes);
app.use('/api/llm', llmRoutes);

app.get('/', (req, res) => {
    res.json({ message: "Healthcare Appointment API is running" });
});

initCronJobs();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
});