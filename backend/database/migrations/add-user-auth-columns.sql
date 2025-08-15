-- Migration to add missing columns to users table for authentication
-- Run this to fix user registration/login functionality

-- Add password column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='password') THEN
        ALTER TABLE users ADD COLUMN password character varying(255);
    END IF;
END $$;

-- Add role column if it doesn't exist  
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role') THEN
        ALTER TABLE users ADD COLUMN role character varying(50) DEFAULT 'attendee'::character varying;
    END IF;
END $$;

-- Add is_suspended column if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_suspended') THEN
        ALTER TABLE users ADD COLUMN is_suspended boolean DEFAULT false;
    END IF;
END $$;
