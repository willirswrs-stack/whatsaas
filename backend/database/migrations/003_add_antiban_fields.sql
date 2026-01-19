-- Migration: Add Anti-Ban Fields
-- Date: 2026-01-11
-- Description: Add settings JSONB to campaigns and warmup fields to instances

-- Campaigns: Add settings column for anti-ban configuration
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN campaigns.settings IS 'Anti-ban settings: activeHoursStart, activeHoursEnd, greetingStyle, timezone, daysOfWeek';

-- Instances: Add warmup_enabled column
ALTER TABLE instances 
ADD COLUMN IF NOT EXISTS warmup_enabled BOOLEAN DEFAULT TRUE;

-- Campaign Contacts: Add timing metadata for analysis
ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

ALTER TABLE campaign_contacts 
ADD COLUMN IF NOT EXISTS timing_metadata JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN campaign_contacts.timing_metadata IS 'HBS timing data: typingDurationMs, delayBeforeSendMs, jitterAppliedMs, totalWaitMs, wpmUsed, warmupDay';

-- Create index for content hash (for duplicate detection)
CREATE INDEX IF NOT EXISTS idx_campaign_contacts_content_hash 
ON campaign_contacts(content_hash);

-- Create index for campaign status queries
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_status 
ON campaigns(tenant_id, status);

-- Create index for instance selection queries
CREATE INDEX IF NOT EXISTS idx_instances_tenant_status_warmup 
ON instances(tenant_id, status, warmup_enabled, daily_sent);
