-- Create attendees table
CREATE TABLE IF NOT EXISTS public.attendees (
    attendee_id SERIAL PRIMARY KEY,
    user_id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20),
    full_name character varying(200),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Check if table was created
\d attendees;
