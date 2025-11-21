-- Add 'admin' to user_app_role enum
ALTER TYPE user_app_role ADD VALUE IF NOT EXISTS 'admin';