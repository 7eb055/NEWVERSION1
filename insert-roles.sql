-- Event Management System - Role Data Setup
-- Run this after creating the main database schema

-- Insert basic roles (using INSERT ... ON CONFLICT for PostgreSQL)
INSERT INTO Roles (role_name) VALUES 
('admin'),
('organizer'),
('attendee'),
('vendor'),
('speaker')
ON CONFLICT (role_name) DO NOTHING;

-- Alternative approach if the above doesn't work (check if role exists first):
-- INSERT INTO Roles (role_name)
-- SELECT 'admin'
-- WHERE NOT EXISTS (SELECT 1 FROM Roles WHERE role_name = 'admin');

-- Verify the roles were inserted
SELECT * FROM Roles ORDER BY role_name;
