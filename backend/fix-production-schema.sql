-- Fix production database schema
-- This script adds missing columns to tables that were incompletely created

BEGIN;

-- Fix users table - add missing columns
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS email varchar(255),
  ADD COLUMN IF NOT EXISTS password_hash varchar(255),
  ADD COLUMN IF NOT EXISTS role_type varchar(50) DEFAULT 'attendee',
  ADD COLUMN IF NOT EXISTS is_email_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verification_token varchar(255),
  ADD COLUMN IF NOT EXISTS password_reset_token varchar(255),
  ADD COLUMN IF NOT EXISTS password_reset_expires timestamp,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS last_login timestamp,
  ADD COLUMN IF NOT EXISTS profile_visibility varchar(50) DEFAULT 'everyone',
  ADD COLUMN IF NOT EXISTS two_factor_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_changed_at timestamp,
  ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamp;

-- Fix organizers table - add missing columns
ALTER TABLE organizers 
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS full_name varchar(255),
  ADD COLUMN IF NOT EXISTS email varchar(255),
  ADD COLUMN IF NOT EXISTS company_name varchar(255),
  ADD COLUMN IF NOT EXISTS phone varchar(20),
  ADD COLUMN IF NOT EXISTS website varchar(255),
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS profile_picture_url varchar(500),
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Fix events table - add missing columns
ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS event_name varchar(255),
  ADD COLUMN IF NOT EXISTS event_description text,
  ADD COLUMN IF NOT EXISTS organizer_id integer,
  ADD COLUMN IF NOT EXISTS event_date timestamp,
  ADD COLUMN IF NOT EXISTS end_date timestamp,
  ADD COLUMN IF NOT EXISTS location varchar(500),
  ADD COLUMN IF NOT EXISTS venue_name varchar(255),
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city varchar(100),
  ADD COLUMN IF NOT EXISTS state varchar(100),
  ADD COLUMN IF NOT EXISTS country varchar(100),
  ADD COLUMN IF NOT EXISTS postal_code varchar(20),
  ADD COLUMN IF NOT EXISTS max_attendees integer,
  ADD COLUMN IF NOT EXISTS current_attendees integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ticket_price decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS category varchar(100),
  ADD COLUMN IF NOT EXISTS tags text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_filename varchar(255),
  ADD COLUMN IF NOT EXISTS image_type varchar(10),
  ADD COLUMN IF NOT EXISTS image_size integer,
  ADD COLUMN IF NOT EXISTS image_mimetype varchar(100),
  ADD COLUMN IF NOT EXISTS is_virtual boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS virtual_link varchar(500),
  ADD COLUMN IF NOT EXISTS registration_deadline timestamp,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Fix eventregistrations table - add missing columns
ALTER TABLE eventregistrations 
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS attendee_id integer,
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS registration_date timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'confirmed',
  ADD COLUMN IF NOT EXISTS payment_status varchar(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method varchar(50),
  ADD COLUMN IF NOT EXISTS payment_reference varchar(255),
  ADD COLUMN IF NOT EXISTS total_amount decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS ticket_type_id integer,
  ADD COLUMN IF NOT EXISTS special_requirements text,
  ADD COLUMN IF NOT EXISTS qr_code varchar(255),
  ADD COLUMN IF NOT EXISTS checked_in boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS check_in_time timestamp,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Fix companies table - add missing columns
ALTER TABLE companies 
  ADD COLUMN IF NOT EXISTS company_name varchar(255),
  ADD COLUMN IF NOT EXISTS organizer_id integer,
  ADD COLUMN IF NOT EXISTS industry varchar(100),
  ADD COLUMN IF NOT EXISTS website varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS logo_url varchar(500),
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Fix tickettypes table - add missing columns
ALTER TABLE tickettypes 
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS type_name varchar(255),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS price decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS max_quantity integer,
  ADD COLUMN IF NOT EXISTS sold_quantity integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_start_date timestamp,
  ADD COLUMN IF NOT EXISTS sale_end_date timestamp,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Fix other important tables
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS title varchar(255),
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS type varchar(50) DEFAULT 'info',
  ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE feedback 
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS comment text,
  ADD COLUMN IF NOT EXISTS is_anonymous boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE payments 
  ADD COLUMN IF NOT EXISTS registration_id integer,
  ADD COLUMN IF NOT EXISTS event_id integer,
  ADD COLUMN IF NOT EXISTS user_id integer,
  ADD COLUMN IF NOT EXISTS amount decimal(10,2),
  ADD COLUMN IF NOT EXISTS currency varchar(3) DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS payment_method varchar(50),
  ADD COLUMN IF NOT EXISTS paystack_reference varchar(255),
  ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS transaction_id varchar(255),
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Add missing primary key constraints where needed
ALTER TABLE attendees ADD COLUMN IF NOT EXISTS attendee_id serial PRIMARY KEY;
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS organizer_id serial PRIMARY KEY;

-- Create missing unique constraints
ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS users_email_unique UNIQUE (email);
ALTER TABLE organizers ADD CONSTRAINT IF NOT EXISTS organizers_user_id_unique UNIQUE (user_id);

COMMIT;
