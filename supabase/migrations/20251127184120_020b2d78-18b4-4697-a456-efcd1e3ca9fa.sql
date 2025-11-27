-- Add semi-exclusive support to lead_exclusivity_queue
ALTER TABLE lead_exclusivity_queue
ADD COLUMN exclusivity_type TEXT DEFAULT 'exclusive' CHECK (exclusivity_type IN ('exclusive', 'semi-exclusive')),
ADD COLUMN semi_exclusive_count INTEGER DEFAULT 0,
ADD COLUMN semi_exclusive_max INTEGER DEFAULT 4,
ADD COLUMN semi_exclusive_expires_at TIMESTAMPTZ;

-- Add exclusivity_type to lead_purchases
ALTER TABLE lead_purchases
ADD COLUMN exclusivity_type TEXT DEFAULT 'non-exclusive' CHECK (exclusivity_type IN ('non-exclusive', 'semi-exclusive', 'exclusive'));

-- Create index for semi-exclusive expiration queries
CREATE INDEX idx_lead_exclusivity_queue_semi_expiration 
ON lead_exclusivity_queue(exclusivity_type, semi_exclusive_expires_at) 
WHERE exclusivity_type = 'semi-exclusive' AND status = 'active';

-- Add comment for documentation
COMMENT ON COLUMN lead_exclusivity_queue.exclusivity_type IS 'Type of exclusivity: exclusive (24hr single digger) or semi-exclusive (up to 4 diggers, 24hr window)';
COMMENT ON COLUMN lead_exclusivity_queue.semi_exclusive_count IS 'Number of diggers who have purchased this semi-exclusive lead';
COMMENT ON COLUMN lead_exclusivity_queue.semi_exclusive_max IS 'Maximum number of diggers allowed for semi-exclusive (default 4)';
COMMENT ON COLUMN lead_exclusivity_queue.semi_exclusive_expires_at IS 'When the semi-exclusive window expires (24 hours from creation)';
COMMENT ON COLUMN lead_purchases.exclusivity_type IS 'Type of lead purchased: non-exclusive, semi-exclusive, or exclusive';