import sqlite3 from 'sqlite3';
import { Database } from 'sqlite';
export declare function initDB(): Promise<Database<sqlite3.Database, sqlite3.Statement>>;
export declare function getDB(): Promise<Database<sqlite3.Database, sqlite3.Statement>>;
