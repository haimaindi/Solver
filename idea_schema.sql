
-- Idea Table
CREATE TABLE ideas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app_access(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    maturity TEXT CHECK (maturity IN ('Thin', 'Mature')),
    next_action TEXT CHECK (next_action IN ('Execute Now', 'Research', 'Plan')),
    is_archived BOOLEAN DEFAULT FALSE,
    remind_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own ideas"
ON ideas FOR ALL
USING (auth.uid() = user_id);
