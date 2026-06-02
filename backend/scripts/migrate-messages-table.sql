-- Migration: Create messages table for Chat Inbox
-- Run this against your PostgreSQL database

CREATE TABLE IF NOT EXISTS messages (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   VARCHAR NOT NULL,
    instance_id VARCHAR,
    instance_name VARCHAR,
    contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
    remote_jid  VARCHAR NOT NULL,
    remote_phone VARCHAR,
    remote_name VARCHAR,
    wamid       VARCHAR UNIQUE,
    direction   VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type        VARCHAR(20) NOT NULL DEFAULT 'text',
    content     TEXT,
    media_url   VARCHAR,
    media_mime  VARCHAR,
    status      VARCHAR(20) NOT NULL DEFAULT 'received',
    campaign_id UUID,
    is_group    BOOLEAN NOT NULL DEFAULT false,
    group_name  VARCHAR,
    raw_payload JSONB,
    expires_at  TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_tenant_jid_created
    ON messages(tenant_id, remote_jid, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_tenant_instance_created
    ON messages(tenant_id, instance_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_contact
    ON messages(contact_id);

CREATE INDEX IF NOT EXISTS idx_messages_expires_at
    ON messages(expires_at)
    WHERE expires_at IS NOT NULL;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS messages_updated_at ON messages;
CREATE TRIGGER messages_updated_at
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_messages_updated_at();

-- Set 90-day expiry on existing rows (if any)
UPDATE messages SET expires_at = created_at + INTERVAL '90 days' WHERE expires_at IS NULL;
