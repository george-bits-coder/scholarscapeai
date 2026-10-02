/**
 * Database Initialization Module
 * 
 * Sets up Drizzle ORM with Neon serverless PostgreSQL database.
 * Provides a database instance for executing queries using the shared schema.
 * 
 * Exports:
 * - db: The Drizzle ORM database instance for executing queries
 * 
 * Environment Variables Required:
 * - DATABASE_URL: Neon PostgreSQL connection string
 */

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });