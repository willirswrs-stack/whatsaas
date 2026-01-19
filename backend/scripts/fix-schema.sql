-- WhatSaas Database Schema Fix
-- Execute this script to ensure all tables and columns exist correctly

-- Fix tenant_settings table - add missing columns
DO $$
BEGIN
    -- Add gemini_key column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenant_settings' AND column_name = 'gemini_key') THEN
        ALTER TABLE tenant_settings ADD COLUMN gemini_key VARCHAR(255);
        RAISE NOTICE 'Added gemini_key column to tenant_settings';
    END IF;
    
    -- Add groq_key column if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tenant_settings' AND column_name = 'groq_key') THEN
        ALTER TABLE tenant_settings ADD COLUMN groq_key VARCHAR(255);
        RAISE NOTICE 'Added groq_key column to tenant_settings';
    END IF;
END $$;

-- Verify all critical tables exist
DO $$
DECLARE
    missing_tables TEXT := '';
    required_tables TEXT[] := ARRAY[
        'tenants',
        'users',
        'instances',
        'campaigns',
        'campaign_contacts',
        'contacts',
        'tags',
        'contact_tags',
        'custom_fields',
        'templates',
        'flows',
        'flow_executions',
        'flow_triggers',
        'flow_folders',
        'tenant_settings',
        'subscription_plans',
        'proxies',
        'segments',
        'waba_accounts'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY required_tables
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                       WHERE table_schema = 'public' AND table_name = t) THEN
            missing_tables := missing_tables || t || ', ';
        END IF;
    END LOOP;
    
    IF missing_tables != '' THEN
        RAISE WARNING 'Missing tables: %', missing_tables;
    ELSE
        RAISE NOTICE 'All required tables exist!';
    END IF;
END $$;

-- Fix any NULLable columns that should allow NULL
DO $$
BEGIN
    -- Fix contacts.phone to allow NULL (for imported contacts without phone)
    BEGIN
        ALTER TABLE contacts ALTER COLUMN phone DROP NOT NULL;
        RAISE NOTICE 'Made contacts.phone nullable';
    EXCEPTION WHEN OTHERS THEN
        -- Column might already be nullable
        NULL;
    END;
    
    -- Fix instances.instance_name to allow NULL
    BEGIN
        ALTER TABLE instances ALTER COLUMN instance_name DROP NOT NULL;
        RAISE NOTICE 'Made instances.instance_name nullable';
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- Report success
SELECT 'Schema fix completed successfully!' AS status;
