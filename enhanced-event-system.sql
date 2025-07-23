-- Enhanced Event Management System Database Schema
-- Separate tables for Attendees and Organizers with shared email verification
-- PostgreSQL Database: event_management_db

-- Create table for roles
CREATE TABLE Roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(20) UNIQUE NOT NULL -- e.g., 'admin', 'organizer', 'attendee'
);

-- Create table for event companies
CREATE TABLE EventCompanies (
    company_id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    address TEXT,
    contact_info VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Core user authentication table (shared by both attendees and organizers)
CREATE TABLE Users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_type VARCHAR(20) NOT NULL CHECK (role_type IN ('attendee', 'organizer')),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    email_verification_token_expires TIMESTAMP,
    email_verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    password_reset_token VARCHAR(255),
    password_reset_token_expires TIMESTAMP,
    account_status VARCHAR(20) DEFAULT 'pending' -- 'pending', 'active', 'suspended', 'deleted'
);

-- Attendees table (specific attendee information)
CREATE TABLE Attendees (
    attendee_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    interests TEXT, -- JSON or comma-separated interests
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    profile_picture_url VARCHAR(500),
    bio TEXT,
    social_media_links JSON, -- Store social media links as JSON
    notification_preferences JSON, -- Email, SMS, push notification preferences
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Organizers table (specific organizer information)
CREATE TABLE Organizers (
    organizer_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    company_name VARCHAR(255),
    company_id INTEGER REFERENCES EventCompanies(company_id),
    job_title VARCHAR(255),
    business_address TEXT,
    business_phone VARCHAR(20),
    website_url VARCHAR(500),
    bio TEXT,
    experience_years INTEGER,
    specializations TEXT, -- Areas of expertise
    certifications TEXT,
    social_media_links JSON,
    business_license_number VARCHAR(255),
    tax_id VARCHAR(255),
    bank_account_info JSON, -- For payments (encrypted)
    profile_picture_url VARCHAR(500),
    verified_organizer BOOLEAN DEFAULT FALSE, -- Additional verification for organizers
    verification_documents JSON, -- Store document references
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table (updated to reference organizers)
CREATE TABLE Events (
    event_id SERIAL PRIMARY KEY,
    organizer_id INTEGER NOT NULL REFERENCES Organizers(organizer_id),
    event_name VARCHAR(255) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    end_date DATE,
    end_time TIME,
    event_location VARCHAR(255),
    venue_name VARCHAR(255),
    venue_address TEXT,
    description TEXT,
    capacity INTEGER,
    ticket_price DECIMAL(10, 2) DEFAULT 0.00,
    event_type VARCHAR(100) DEFAULT 'Conference',
    category VARCHAR(100),
    tags TEXT, -- Comma-separated or JSON
    image_url VARCHAR(500),
    registration_deadline DATE,
    refund_policy TEXT,
    terms_and_conditions TEXT,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'cancelled', 'completed'
    is_public BOOLEAN DEFAULT TRUE,
    requires_approval BOOLEAN DEFAULT FALSE,
    max_tickets_per_person INTEGER DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Event registrations (linking attendees to events)
CREATE TABLE EventRegistrations (
    registration_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES Events(event_id) ON DELETE CASCADE,
    attendee_id INTEGER NOT NULL REFERENCES Attendees(attendee_id) ON DELETE CASCADE,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ticket_quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'refunded', 'cancelled'
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    special_requirements TEXT,
    check_in_status BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP,
    qr_code VARCHAR(255), -- For event check-in
    status VARCHAR(50) DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'waitlist'
    cancellation_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, attendee_id) -- Prevent duplicate registrations
);

-- Event feedback/reviews
CREATE TABLE EventFeedback (
    feedback_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES Events(event_id) ON DELETE CASCADE,
    attendee_id INTEGER NOT NULL REFERENCES Attendees(attendee_id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(event_id, attendee_id) -- One feedback per attendee per event
);

-- Email verification logs (for audit purposes)
CREATE TABLE EmailVerificationLogs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES Users(user_id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verification_token VARCHAR(255),
    token_expires TIMESTAMP,
    verification_attempt_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verification_success BOOLEAN DEFAULT FALSE,
    ip_address INET,
    user_agent TEXT
);

-- Audit log for user actions
CREATE TABLE UserActivityLogs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES Users(user_id) ON DELETE SET NULL,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(100), -- 'event', 'profile', 'registration', etc.
    resource_id INTEGER,
    details JSON,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON Users(email);
CREATE INDEX idx_users_role_type ON Users(role_type);
CREATE INDEX idx_users_account_status ON Users(account_status);
CREATE INDEX idx_events_organizer_id ON Events(organizer_id);
CREATE INDEX idx_events_event_date ON Events(event_date);
CREATE INDEX idx_events_status ON Events(status);
CREATE INDEX idx_event_registrations_event_id ON EventRegistrations(event_id);
CREATE INDEX idx_event_registrations_attendee_id ON EventRegistrations(attendee_id);
CREATE INDEX idx_email_verification_token ON Users(email_verification_token);

-- Insert default roles
INSERT INTO Roles (role_name) VALUES 
('admin'),
('organizer'),
('attendee'),
('vendor'),
('speaker')
ON CONFLICT (role_name) DO NOTHING;

-- Sample data (optional)
-- Insert a sample company
INSERT INTO EventCompanies (company_name, address, contact_info) VALUES 
('Tech Events Corp', '123 Tech Street, Silicon Valley, CA', 'contact@techevents.com')
ON CONFLICT DO NOTHING;
