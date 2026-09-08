import mongoose from 'mongoose';
import { config } from '../config';

export async function connectDatabase(): Promise<void> {
    mongoose.set('strictQuery', true);

    await mongoose.connect(config.mongoUri);

    mongoose.connection.on('error', (err) => {
        console.error('[Database] Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('[Database] Disconnected from MongoDB');
    });

    console.log('[Database] Connected to MongoDB');
}
