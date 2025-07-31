-- Create Event Attendee Listing Table (Physical Table Implementation)
-- This creates a comprehensive physical table to track all attendee information for events

BEGIN;

-- Drop existing table if it exists
DROP TABLE IF EXISTS event_attendee_listing CASCADE;

-- Create Event Attendee Listing Table
CREATE TABLE event_attendee_listing (
    listing_id SERIAL PRIMARY KEY,
    
    -- Event Information
    event_id INTEGER NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_date TIMESTAMP NOT NULL,
    event_time TIME,
    end_date DATE,
    end_time TIME,
    venue_name VARCHAR(255),
    venue_address TEXT,
    event_type VARCHAR(100) DEFAULT 'Conference',
    category VARCHAR(100),
    ticket_price NUMERIC(10,2) DEFAULT 0.00,
    max_attendees INTEGER,
    
    -- Organizer Information
    organizer_id INTEGER NOT NULL,
    organizer_name VARCHAR(255) NOT NULL,
    organizer_email VARCHAR(255),
    organizer_company VARCHAR(255),
    
    -- Registration Information
    registration_id INTEGER NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ticket_quantity INTEGER DEFAULT 1,
    total_amount NUMERIC(10,2),
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    special_requirements TEXT,
    qr_code VARCHAR(255),
    registration_status VARCHAR(50) DEFAULT 'confirmed',
    cancellation_reason TEXT,
    
    -- Attendee Information
    attendee_id INTEGER NOT NULL,
    attendee_name VARCHAR(255) NOT NULL,
    attendee_email VARCHAR(255) NOT NULL,
    attendee_phone VARCHAR(20),
    date_of_birth DATE,
    gender VARCHAR(10),
    interests TEXT,
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    profile_picture_url VARCHAR(500),
    bio TEXT,
    social_media_links JSON,
    notification_preferences JSON,
    
    -- Attendance Tracking
    check_in_status BOOLEAN DEFAULT FALSE,
    check_in_time TIMESTAMP,
    attendance_id INTEGER,
    actual_check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    scan_method VARCHAR(20) DEFAULT 'qr_code',
    scanned_by_user_id INTEGER,
    scanned_by_email VARCHAR(255),
    attendance_status VARCHAR(20) DEFAULT 'registered',
    attendance_duration_hours NUMERIC(5,2),
    
    -- Ticket Information
    ticket_type_id INTEGER,
    ticket_type VARCHAR(100),
    ticket_type_price NUMERIC(10,2),
    ticket_description TEXT,
    
    -- Metadata
    listing_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    listing_updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key Constraints
    CONSTRAINT fk_event_listing_event FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_listing_organizer FOREIGN KEY (organizer_id) REFERENCES organizers(organizer_id),
    CONSTRAINT fk_event_listing_registration FOREIGN KEY (registration_id) REFERENCES eventregistrations(registration_id) ON DELETE CASCADE,
    CONSTRAINT fk_event_listing_attendee FOREIGN KEY (attendee_id) REFERENCES attendees(attendee_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicates
    CONSTRAINT unique_event_attendee_registration UNIQUE (event_id, attendee_id, registration_id)
);

-- Create indexes for better performance
CREATE INDEX idx_event_attendee_listing_event_id ON event_attendee_listing(event_id);
CREATE INDEX idx_event_attendee_listing_organizer_id ON event_attendee_listing(organizer_id);
CREATE INDEX idx_event_attendee_listing_attendee_email ON event_attendee_listing(attendee_email);
CREATE INDEX idx_event_attendee_listing_attendance_status ON event_attendee_listing(attendance_status);
CREATE INDEX idx_event_attendee_listing_event_date ON event_attendee_listing(event_date);
CREATE INDEX idx_event_attendee_listing_registration_date ON event_attendee_listing(registration_date);
CREATE INDEX idx_event_attendee_listing_payment_status ON event_attendee_listing(payment_status);
CREATE INDEX idx_event_attendee_listing_check_in_status ON event_attendee_listing(check_in_status);

-- Function to sync event attendee listing data
CREATE OR REPLACE FUNCTION sync_event_attendee_listing()
RETURNS VOID AS $$
BEGIN
    -- Clear existing data
    TRUNCATE event_attendee_listing;
    
    -- Insert fresh data from related tables
    INSERT INTO event_attendee_listing (
        event_id, event_name, event_date, event_time, end_date, end_time,
        venue_name, venue_address, event_type, category, ticket_price, max_attendees,
        organizer_id, organizer_name, organizer_email, organizer_company,
        registration_id, registration_date, ticket_quantity, total_amount,
        payment_status, payment_method, payment_reference, special_requirements, 
        qr_code, registration_status, cancellation_reason,
        attendee_id, attendee_name, attendee_email, attendee_phone,
        date_of_birth, gender, interests, dietary_restrictions, accessibility_needs,
        emergency_contact_name, emergency_contact_phone, profile_picture_url, bio,
        social_media_links, notification_preferences,
        check_in_status, check_in_time, attendance_id, actual_check_in_time, 
        check_out_time, scan_method, scanned_by_user_id, scanned_by_email,
        attendance_status, attendance_duration_hours,
        ticket_type_id, ticket_type, ticket_type_price, ticket_description
    )
    SELECT 
        -- Event Information
        e.event_id, e.event_name, e.event_date, e.event_time, e.end_date, e.end_time,
        e.venue_name, e.venue_address, e.event_type, e.category, e.ticket_price, e.max_attendees,
        
        -- Organizer Information
        org.organizer_id, 
        COALESCE(org.full_name, org.company_name, 'Unknown Organizer') as organizer_name,
        org_user.email as organizer_email, 
        org.company_name,
        
        -- Registration Information
        er.registration_id, er.registration_date, er.ticket_quantity, er.total_amount,
        er.payment_status, er.payment_method, er.payment_reference, er.special_requirements,
        er.qr_code, er.status, er.cancellation_reason,
        
        -- Attendee Information
        a.attendee_id, a.full_name, att_user.email, a.phone,
        a.date_of_birth, a.gender, a.interests, a.dietary_restrictions, a.accessibility_needs,
        a.emergency_contact_name, a.emergency_contact_phone, a.profile_picture_url, a.bio,
        a.social_media_links, a.notification_preferences,
        
        -- Attendance Tracking
        er.check_in_status, er.check_in_time, 
        al.attendance_id, al.check_in_time as actual_check_in_time, al.check_out_time, 
        al.scan_method, al.scanned_by, scanned_by_user.email,
        CASE 
            WHEN al.check_in_time IS NOT NULL THEN 'checked_in'
            WHEN er.status = 'confirmed' THEN 'registered'
            WHEN er.status = 'cancelled' THEN 'cancelled'
            ELSE 'pending'
        END as attendance_status,
        CASE 
            WHEN al.check_in_time IS NOT NULL AND al.check_out_time IS NOT NULL 
            THEN EXTRACT(EPOCH FROM (al.check_out_time - al.check_in_time))/3600 
            ELSE NULL 
        END as attendance_duration_hours,
        
        -- Ticket Information
        tt.ticket_type_id, tt.type_name, tt.price, tt.description
        
    FROM events e
    INNER JOIN organizers org ON e.organizer_id = org.organizer_id
    LEFT JOIN users org_user ON org.user_id = org_user.user_id
    LEFT JOIN eventregistrations er ON e.event_id = er.event_id
    LEFT JOIN attendees a ON er.attendee_id = a.attendee_id
    LEFT JOIN users att_user ON a.user_id = att_user.user_id
    LEFT JOIN attendancelogs al ON er.registration_id = al.registration_id
    LEFT JOIN users scanned_by_user ON al.scanned_by = scanned_by_user.user_id
    LEFT JOIN tickettypes tt ON er.event_id = tt.event_id
    WHERE er.registration_id IS NOT NULL; -- Only include actual registrations
    
    -- Update the listing_updated_at timestamp
    UPDATE event_attendee_listing SET listing_updated_at = CURRENT_TIMESTAMP;
    
    RAISE NOTICE 'Event attendee listing synchronized successfully. Total records: %', 
        (SELECT COUNT(*) FROM event_attendee_listing);
END;
$$ LANGUAGE plpgsql;

-- Function to add new attendee listing entry
CREATE OR REPLACE FUNCTION add_event_attendee_listing_entry(p_registration_id INTEGER)
RETURNS VOID AS $$
DECLARE
    rec RECORD;
BEGIN
    -- Get the registration and related data
    SELECT 
        e.event_id, e.event_name, e.event_date, e.event_time, e.end_date, e.end_time,
        e.venue_name, e.venue_address, e.event_type, e.category, e.ticket_price, e.max_attendees,
        org.organizer_id, 
        COALESCE(org.full_name, org.company_name, 'Unknown Organizer') as organizer_name,
        org_user.email as organizer_email, 
        org.company_name,
        er.registration_id, er.registration_date, er.ticket_quantity, er.total_amount,
        er.payment_status, er.payment_method, er.payment_reference, er.special_requirements,
        er.qr_code, er.status, er.cancellation_reason,
        a.attendee_id, a.full_name, att_user.email, a.phone,
        a.date_of_birth, a.gender, a.interests, a.dietary_restrictions, a.accessibility_needs,
        a.emergency_contact_name, a.emergency_contact_phone, a.profile_picture_url, a.bio,
        a.social_media_links, a.notification_preferences,
        er.check_in_status, er.check_in_time
    INTO rec
    FROM eventregistrations er
    INNER JOIN events e ON er.event_id = e.event_id
    INNER JOIN organizers org ON e.organizer_id = org.organizer_id
    LEFT JOIN users org_user ON org.user_id = org_user.user_id
    LEFT JOIN attendees a ON er.attendee_id = a.attendee_id
    LEFT JOIN users att_user ON a.user_id = att_user.user_id
    WHERE er.registration_id = p_registration_id;
    
    -- Insert or update the listing entry
    INSERT INTO event_attendee_listing (
        event_id, event_name, event_date, event_time, end_date, end_time,
        venue_name, venue_address, event_type, category, ticket_price, max_attendees,
        organizer_id, organizer_name, organizer_email, organizer_company,
        registration_id, registration_date, ticket_quantity, total_amount,
        payment_status, payment_method, payment_reference, special_requirements, 
        qr_code, registration_status, cancellation_reason,
        attendee_id, attendee_name, attendee_email, attendee_phone,
        date_of_birth, gender, interests, dietary_restrictions, accessibility_needs,
        emergency_contact_name, emergency_contact_phone, profile_picture_url, bio,
        social_media_links, notification_preferences,
        check_in_status, check_in_time, attendance_status
    ) VALUES (
        rec.event_id, rec.event_name, rec.event_date, rec.event_time, rec.end_date, rec.end_time,
        rec.venue_name, rec.venue_address, rec.event_type, rec.category, rec.ticket_price, rec.max_attendees,
        rec.organizer_id, rec.organizer_name, rec.organizer_email, rec.company_name,
        rec.registration_id, rec.registration_date, rec.ticket_quantity, rec.total_amount,
        rec.payment_status, rec.payment_method, rec.payment_reference, rec.special_requirements,
        rec.qr_code, rec.status, rec.cancellation_reason,
        rec.attendee_id, rec.full_name, rec.email, rec.phone,
        rec.date_of_birth, rec.gender, rec.interests, rec.dietary_restrictions, rec.accessibility_needs,
        rec.emergency_contact_name, rec.emergency_contact_phone, rec.profile_picture_url, rec.bio,
        rec.social_media_links, rec.notification_preferences,
        rec.check_in_status, rec.check_in_time,
        CASE 
            WHEN rec.check_in_status = true THEN 'checked_in'
            WHEN rec.status = 'confirmed' THEN 'registered'
            WHEN rec.status = 'cancelled' THEN 'cancelled'
            ELSE 'pending'
        END
    )
    ON CONFLICT (event_id, attendee_id, registration_id) 
    DO UPDATE SET
        event_name = EXCLUDED.event_name,
        event_date = EXCLUDED.event_date,
        payment_status = EXCLUDED.payment_status,
        registration_status = EXCLUDED.registration_status,
        check_in_status = EXCLUDED.check_in_status,
        check_in_time = EXCLUDED.check_in_time,
        attendance_status = EXCLUDED.attendance_status,
        listing_updated_at = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically maintain the listing table
CREATE OR REPLACE FUNCTION trigger_sync_event_attendee_listing()
RETURNS trigger AS $$
BEGIN
    -- Handle different trigger events
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Add or update the specific registration entry
        PERFORM add_event_attendee_listing_entry(NEW.registration_id);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove the specific registration entry
        DELETE FROM event_attendee_listing WHERE registration_id = OLD.registration_id;
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to relevant tables
DROP TRIGGER IF EXISTS trigger_eventregistrations_sync ON eventregistrations;
CREATE TRIGGER trigger_eventregistrations_sync
    AFTER INSERT OR UPDATE OR DELETE ON eventregistrations
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_event_attendee_listing();

-- Trigger for attendance logs
CREATE OR REPLACE FUNCTION trigger_sync_attendance_listing()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update attendance information in listing
        UPDATE event_attendee_listing 
        SET 
            attendance_id = NEW.attendance_id,
            actual_check_in_time = NEW.check_in_time,
            check_out_time = NEW.check_out_time,
            scan_method = NEW.scan_method,
            scanned_by_user_id = NEW.scanned_by,
            attendance_status = 'checked_in',
            attendance_duration_hours = CASE 
                WHEN NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL 
                THEN EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time))/3600 
                ELSE NULL 
            END,
            listing_updated_at = CURRENT_TIMESTAMP
        WHERE registration_id = NEW.registration_id;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Reset attendance information in listing
        UPDATE event_attendee_listing 
        SET 
            attendance_id = NULL,
            actual_check_in_time = NULL,
            check_out_time = NULL,
            scan_method = NULL,
            scanned_by_user_id = NULL,
            attendance_status = CASE 
                WHEN registration_status = 'confirmed' THEN 'registered'
                WHEN registration_status = 'cancelled' THEN 'cancelled'
                ELSE 'pending'
            END,
            attendance_duration_hours = NULL,
            listing_updated_at = CURRENT_TIMESTAMP
        WHERE registration_id = OLD.registration_id;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attendancelogs_sync ON attendancelogs;
CREATE TRIGGER trigger_attendancelogs_sync
    AFTER INSERT OR UPDATE OR DELETE ON attendancelogs
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_attendance_listing();

-- Initial sync of existing data
SELECT sync_event_attendee_listing();

-- Create helper functions for common queries

-- Function to get attendees for a specific event
CREATE OR REPLACE FUNCTION get_event_attendees_listing(p_event_id INTEGER)
RETURNS TABLE (
    listing_id INTEGER,
    attendee_name VARCHAR(255),
    attendee_email VARCHAR(255),
    attendee_phone VARCHAR(20),
    registration_date TIMESTAMP,
    ticket_quantity INTEGER,
    total_amount NUMERIC(10,2),
    payment_status VARCHAR(50),
    attendance_status VARCHAR(20),
    check_in_time TIMESTAMP,
    special_requirements TEXT,
    dietary_restrictions TEXT,
    accessibility_needs TEXT,
    qr_code VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eal.listing_id,
        eal.attendee_name,
        eal.attendee_email,
        eal.attendee_phone,
        eal.registration_date,
        eal.ticket_quantity,
        eal.total_amount,
        eal.payment_status,
        eal.attendance_status,
        eal.check_in_time,
        eal.special_requirements,
        eal.dietary_restrictions,
        eal.accessibility_needs,
        eal.qr_code
    FROM event_attendee_listing eal
    WHERE eal.event_id = p_event_id
    ORDER BY eal.registration_date ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get attendee statistics for an organizer
CREATE OR REPLACE FUNCTION get_organizer_attendee_statistics(p_organizer_id INTEGER)
RETURNS TABLE (
    event_name VARCHAR(255),
    event_date TIMESTAMP,
    total_registered BIGINT,
    total_checked_in BIGINT,
    total_pending BIGINT,
    total_cancelled BIGINT,
    attendance_rate NUMERIC,
    total_revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        eal.event_name,
        eal.event_date,
        COUNT(*) as total_registered,
        COUNT(CASE WHEN eal.attendance_status = 'checked_in' THEN 1 END) as total_checked_in,
        COUNT(CASE WHEN eal.attendance_status = 'registered' THEN 1 END) as total_pending,
        COUNT(CASE WHEN eal.attendance_status = 'cancelled' THEN 1 END) as total_cancelled,
        ROUND(
            COUNT(CASE WHEN eal.attendance_status = 'checked_in' THEN 1 END)::numeric / 
            NULLIF(COUNT(CASE WHEN eal.attendance_status != 'cancelled' THEN 1 END), 0) * 100, 2
        ) as attendance_rate,
        SUM(CASE WHEN eal.payment_status IN ('completed', 'paid') THEN eal.total_amount ELSE 0 END) as total_revenue
    FROM event_attendee_listing eal
    WHERE eal.organizer_id = p_organizer_id
    GROUP BY eal.event_id, eal.event_name, eal.event_date
    ORDER BY eal.event_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON event_attendee_listing TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE event_attendee_listing_listing_id_seq TO your_app_user;
-- GRANT EXECUTE ON FUNCTION sync_event_attendee_listing() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_event_attendees_listing(INTEGER) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_organizer_attendee_statistics(INTEGER) TO your_app_user;

-- Show summary
SELECT 
    'Event Attendee Listing Table Created' as status,
    COUNT(*) as initial_records_count
FROM event_attendee_listing;
