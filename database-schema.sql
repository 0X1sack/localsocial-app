-- LocalSocial Enhanced Database Schema for Supabase
-- Production-ready schema with comprehensive security and business logic
-- Run these commands in your Supabase SQL editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE plan_type AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing', 'incomplete');
CREATE TYPE platform_type AS ENUM ('facebook', 'instagram', 'linkedin', 'google_business', 'twitter');
CREATE TYPE post_status AS ENUM ('draft', 'scheduled', 'posting', 'posted', 'failed', 'cancelled');
CREATE TYPE account_status AS ENUM ('active', 'expired', 'error', 'revoked');

-- Organizations table (for multi-tenant business accounts)
CREATE TABLE organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  billing_email TEXT,
  plan plan_type DEFAULT 'free' NOT NULL,
  subscription_status subscription_status DEFAULT 'active',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  max_users INTEGER DEFAULT 1,
  max_social_accounts INTEGER DEFAULT 3,
  max_posts_per_month INTEGER DEFAULT 30,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhanced profiles table with organization relationship
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner', -- 'owner', 'admin', 'editor', 'viewer'
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE,
  onboarding_completed BOOLEAN DEFAULT false,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Business profiles for local businesses
CREATE TABLE business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  business_type TEXT, -- 'restaurant', 'salon', 'gym', 'retail', etc.
  industry TEXT,
  description TEXT,
  website_url TEXT,
  phone TEXT,
  email TEXT,
  address JSONB, -- {street, city, state, zip, country, lat, lng}
  business_hours JSONB, -- {monday: {open: "09:00", close: "17:00"}, ...}
  logo_url TEXT,
  brand_colors JSONB, -- {primary: "#color", secondary: "#color"}
  social_links JSONB, -- {website: "", facebook: "", instagram: ""}
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhanced social accounts with better security
CREATE TABLE social_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  business_profile_id UUID REFERENCES business_profiles ON DELETE CASCADE,
  platform platform_type NOT NULL,
  platform_account_id TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_username TEXT,
  profile_picture_url TEXT,
  follower_count INTEGER DEFAULT 0,
  -- Encrypted token storage
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  permissions TEXT[], -- Array of granted permissions
  status account_status DEFAULT 'active',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure unique platform accounts per organization
  UNIQUE(organization_id, platform, platform_account_id)
);

-- Post templates with categories and AI suggestions
CREATE TABLE post_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  category TEXT, -- 'promotion', 'event', 'holiday', 'educational', 'behind_scenes'
  industry TEXT[], -- Multiple industries this template applies to
  hashtags TEXT[],
  call_to_action TEXT,
  scheduling_suggestions JSONB, -- Best times, days to post
  performance_score DECIMAL(3,2), -- AI-calculated performance prediction
  is_public BOOLEAN DEFAULT false,
  is_ai_generated BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enhanced scheduled posts with advanced features
CREATE TABLE scheduled_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  business_profile_id UUID REFERENCES business_profiles ON DELETE CASCADE,
  template_id UUID REFERENCES post_templates ON DELETE SET NULL,
  social_account_ids UUID[] NOT NULL, -- Array of social account IDs for cross-posting
  
  -- Content
  content TEXT NOT NULL,
  media_urls TEXT[],
  hashtags TEXT[],
  mention_users TEXT[], -- @mentions
  location_name TEXT,
  location_coordinates POINT,
  link_url TEXT,
  call_to_action TEXT,
  
  -- Scheduling
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  auto_reschedule BOOLEAN DEFAULT false, -- Auto-reschedule if posting fails
  
  -- Status and results
  status post_status DEFAULT 'draft',
  posted_at TIMESTAMP WITH TIME ZONE,
  platform_posts JSONB, -- {platform: {post_id: "", url: "", status: ""}}
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  
  -- AI optimization
  optimal_time_suggested TIMESTAMP WITH TIME ZONE,
  engagement_prediction DECIMAL(5,2),
  ai_content_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Analytics and performance tracking
CREATE TABLE post_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scheduled_post_id UUID REFERENCES scheduled_posts ON DELETE CASCADE NOT NULL,
  social_account_id UUID REFERENCES social_accounts ON DELETE CASCADE NOT NULL,
  platform platform_type NOT NULL,
  platform_post_id TEXT NOT NULL,
  
  -- Engagement metrics
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  
  -- Calculated metrics
  engagement_rate DECIMAL(5,2) DEFAULT 0,
  click_through_rate DECIMAL(5,2) DEFAULT 0,
  save_rate DECIMAL(5,2) DEFAULT 0,
  
  -- Time-based analytics
  peak_engagement_hour INTEGER,
  total_video_views INTEGER DEFAULT 0,
  average_watch_time_seconds INTEGER DEFAULT 0,
  
  -- Last updated from platform API
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Content calendar and planning
CREATE TABLE content_calendar (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT, -- 'post', 'story', 'reel', 'campaign'
  category TEXT,
  target_platforms platform_type[],
  
  -- Scheduling
  planned_date DATE NOT NULL,
  planned_time TIME,
  
  -- Campaign tracking
  campaign_name TEXT,
  campaign_hashtag TEXT,
  budget_allocated DECIMAL(10,2),
  
  -- Status
  status TEXT DEFAULT 'planned', -- 'planned', 'in_progress', 'scheduled', 'completed', 'cancelled'
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- User activity and audit trail
CREATE TABLE activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  
  action TEXT NOT NULL, -- 'login', 'post_created', 'account_connected', etc.
  resource_type TEXT, -- 'post', 'social_account', 'user', etc.
  resource_id TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Billing and usage tracking
CREATE TABLE usage_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations ON DELETE CASCADE NOT NULL,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  posts_created INTEGER DEFAULT 0,
  posts_scheduled INTEGER DEFAULT 0,
  posts_published INTEGER DEFAULT 0,
  social_accounts_connected INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Ensure one record per organization per period
  UNIQUE(organization_id, period_start, period_end)
);

-- Notification preferences and alerts
CREATE TABLE notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  
  email_notifications JSONB DEFAULT '{
    "post_published": true,
    "post_failed": true,
    "account_disconnected": true,
    "weekly_report": true,
    "billing_updates": true
  }',
  
  push_notifications JSONB DEFAULT '{
    "post_published": false,
    "post_failed": true,
    "optimal_posting_time": true
  }',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- COMPREHENSIVE RLS POLICIES

-- Organizations policies
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = organizations.id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = organizations.id 
      AND profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin')
      AND profiles.is_active = true
    )
  );

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization" ON profiles
  FOR SELECT USING (
    -- Users can see their own profile
    auth.uid() = id
    OR
    -- Users can see other profiles in their organization
    EXISTS (
      SELECT 1 FROM profiles AS my_profile
      WHERE my_profile.id = auth.uid()
      AND my_profile.organization_id = profiles.organization_id
      AND my_profile.is_active = true
    )
  );

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update organization profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.organization_id = profiles.organization_id
      AND admin_profile.role IN ('owner', 'admin')
      AND admin_profile.is_active = true
    )
  );

-- Business profiles policies
CREATE POLICY "Users can view business profiles in their organization" ON business_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = business_profiles.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Editors can manage business profiles" ON business_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = business_profiles.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'editor')
      AND profiles.is_active = true
    )
  );

-- Social accounts policies
CREATE POLICY "Users can view social accounts in their organization" ON social_accounts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = social_accounts.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Editors can manage social accounts" ON social_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = social_accounts.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'editor')
      AND profiles.is_active = true
    )
  );

-- Scheduled posts policies  
CREATE POLICY "Users can view posts in their organization" ON scheduled_posts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = scheduled_posts.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Editors can manage posts" ON scheduled_posts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = scheduled_posts.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'editor')
      AND profiles.is_active = true
    )
  );

-- Post templates policies
CREATE POLICY "Users can view templates in their organization or public templates" ON post_templates
  FOR SELECT USING (
    is_public = true
    OR
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = post_templates.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

CREATE POLICY "Editors can manage organization templates" ON post_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = post_templates.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.role IN ('owner', 'admin', 'editor')
      AND profiles.is_active = true
    )
  );

-- Analytics policies
CREATE POLICY "Users can view analytics for their organization" ON post_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM scheduled_posts
      JOIN profiles ON profiles.organization_id = scheduled_posts.organization_id
      WHERE scheduled_posts.id = post_analytics.scheduled_post_id
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- Activity logs policies
CREATE POLICY "Users can view activity logs for their organization" ON activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.organization_id = activity_logs.organization_id 
      AND profiles.id = auth.uid()
      AND profiles.is_active = true
    )
  );

-- Notification settings policies
CREATE POLICY "Users can manage their own notification settings" ON notification_settings
  FOR ALL USING (auth.uid() = user_id);

-- FUNCTIONS AND TRIGGERS

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to create organization and profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_org_id UUID;
    business_name TEXT;
BEGIN
    -- Extract business name from user metadata or use email domain
    business_name := COALESCE(
        NEW.raw_user_meta_data->>'business_name',
        SPLIT_PART(NEW.email, '@', 1)
    );
    
    -- Create organization
    INSERT INTO organizations (name, slug, billing_email, max_users)
    VALUES (
        business_name,
        LOWER(REPLACE(business_name, ' ', '-')) || '-' || EXTRACT(epoch FROM NOW())::TEXT,
        NEW.email,
        1
    )
    RETURNING id INTO new_org_id;
    
    -- Create profile
    INSERT INTO profiles (
        id, 
        organization_id, 
        email, 
        full_name, 
        role
    )
    VALUES (
        NEW.id,
        new_org_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        'owner'
    );
    
    -- Create notification settings
    INSERT INTO notification_settings (user_id)
    VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to encrypt sensitive tokens
CREATE OR REPLACE FUNCTION encrypt_token(token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(
        pgp_sym_encrypt(token, current_setting('app.jwt_secret', true)),
        'base64'
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to decrypt sensitive tokens
CREATE OR REPLACE FUNCTION decrypt_token(encrypted_token TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(
        decode(encrypted_token, 'base64'),
        current_setting('app.jwt_secret', true)
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_activity(
    org_id UUID,
    action_name TEXT,
    resource_type_name TEXT DEFAULT NULL,
    resource_id_value TEXT DEFAULT NULL,
    activity_details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO activity_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        details
    )
    VALUES (
        org_id,
        auth.uid(),
        action_name,
        resource_type_name,
        resource_id_value,
        activity_details
    );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- CREATE TRIGGERS

-- Updated at triggers
CREATE TRIGGER handle_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_business_profiles_updated_at BEFORE UPDATE ON business_profiles
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_social_accounts_updated_at BEFORE UPDATE ON social_accounts
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_post_templates_updated_at BEFORE UPDATE ON post_templates
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_scheduled_posts_updated_at BEFORE UPDATE ON scheduled_posts
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TRIGGER handle_notification_settings_updated_at BEFORE UPDATE ON notification_settings
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- New user signup trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- CREATE INDEXES FOR PERFORMANCE

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- Profiles indexes
CREATE INDEX idx_profiles_organization_id ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Social accounts indexes
CREATE INDEX idx_social_accounts_org_platform ON social_accounts(organization_id, platform);
CREATE INDEX idx_social_accounts_user_id ON social_accounts(user_id);
CREATE INDEX idx_social_accounts_status ON social_accounts(status);

-- Scheduled posts indexes
CREATE INDEX idx_scheduled_posts_organization_id ON scheduled_posts(organization_id);
CREATE INDEX idx_scheduled_posts_user_id ON scheduled_posts(user_id);
CREATE INDEX idx_scheduled_posts_scheduled_for ON scheduled_posts(scheduled_for);
CREATE INDEX idx_scheduled_posts_status ON scheduled_posts(status);
CREATE INDEX idx_scheduled_posts_status_scheduled_for ON scheduled_posts(status, scheduled_for);

-- Analytics indexes
CREATE INDEX idx_post_analytics_scheduled_post_id ON post_analytics(scheduled_post_id);
CREATE INDEX idx_post_analytics_platform ON post_analytics(platform);

-- Activity logs indexes
CREATE INDEX idx_activity_logs_organization_id ON activity_logs(organization_id);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Content calendar indexes
CREATE INDEX idx_content_calendar_organization_id ON content_calendar(organization_id);
CREATE INDEX idx_content_calendar_planned_date ON content_calendar(planned_date);

-- INSERT DEFAULT DATA

-- Insert public post templates for common use cases
INSERT INTO post_templates (
    organization_id, 
    user_id, 
    name, 
    content, 
    category, 
    industry, 
    hashtags, 
    is_public,
    performance_score
) VALUES
-- Restaurant templates
(
    NULL,
    NULL,
    'Daily Special Announcement',
    'Today''s special is absolutely delicious! Come in and try our [DISH NAME] - made fresh with locally sourced ingredients. Available while supplies last! 🍽️✨',
    'promotion',
    ARRAY['restaurant', 'food'],
    ARRAY['#dailyspecial', '#fresh', '#local', '#delicious', '#restaurant'],
    true,
    8.5
),
(
    NULL,
    NULL,
    'Happy Hour Promotion',
    'Happy Hour is here! 🍻 Join us from [TIME] for discounted drinks and appetizers. Perfect for unwinding after a long day! #HappyHour #Cheers',
    'promotion',
    ARRAY['restaurant', 'bar'],
    ARRAY['#happyhour', '#drinks', '#specials', '#afterwork', '#cheers'],
    true,
    7.8
),

-- Salon/Beauty templates
(
    NULL,
    NULL,
    'Appointment Reminder',
    'Don''t forget to book your appointment! Our talented stylists are ready to help you look and feel amazing. Call us or book online today! 💇‍♀️✨',
    'general',
    ARRAY['salon', 'beauty', 'spa'],
    ARRAY['#booking', '#appointment', '#beauty', '#selfcare', '#salon'],
    true,
    7.2
),
(
    NULL,
    NULL,
    'New Service Launch',
    'Exciting news! We''re now offering [NEW SERVICE]. Book your appointment today and be among the first to experience this amazing new treatment! 🌟',
    'announcement',
    ARRAY['salon', 'beauty', 'spa'],
    ARRAY['#newservice', '#launch', '#beauty', '#treatment', '#exciting'],
    true,
    8.1
),

-- Fitness/Gym templates
(
    NULL,
    NULL,
    'Workout Motivation',
    'Monday motivation! 💪 Remember, every workout counts. Whether it''s 10 minutes or an hour, you''re investing in your health. Let''s crush this week together!',
    'motivational',
    ARRAY['fitness', 'gym', 'health'],
    ARRAY['#mondaymotivation', '#fitness', '#workout', '#health', '#motivation'],
    true,
    8.7
),
(
    NULL,
    NULL,
    'Class Schedule Update',
    'New class schedule is live! 📅 Check out our exciting lineup of classes this week. From yoga to HIIT, we have something for everyone. Reserve your spot now!',
    'announcement',
    ARRAY['fitness', 'gym', 'studio'],
    ARRAY['#classschedule', '#fitness', '#yoga', '#hiit', '#workout'],
    true,
    7.5
),

-- Retail templates
(
    NULL,
    NULL,
    'New Arrival Announcement',
    'New arrivals are here! 🛍️ Check out our latest collection featuring [PRODUCT TYPE]. Perfect for [SEASON/OCCASION]. Visit us in-store or shop online!',
    'product',
    ARRAY['retail', 'fashion', 'boutique'],
    ARRAY['#newarrivals', '#shopping', '#fashion', '#style', '#collection'],
    true,
    8.0
),
(
    NULL,
    NULL,
    'Weekend Sale',
    'Weekend Sale Alert! 🏷️ Enjoy [DISCOUNT]% off select items this weekend only. Don''t miss out on these amazing deals. Shop now while supplies last!',
    'promotion',
    ARRAY['retail', 'fashion', 'boutique'],
    ARRAY['#weekendsale', '#discount', '#deals', '#shopping', '#sale'],
    true,
    8.9
),

-- General business templates
(
    NULL,
    NULL,
    'Thank You Customers',
    'We''re grateful for each and every one of our amazing customers! 🙏 Your support means the world to us and drives us to keep improving. Thank you for being part of our journey!',
    'gratitude',
    ARRAY['general'],
    ARRAY['#thankyou', '#grateful', '#customers', '#appreciation', '#community'],
    true,
    7.9
),
(
    NULL,
    NULL,
    'Behind the Scenes',
    'Take a peek behind the scenes! 👀 Here''s what goes into making [PRODUCT/SERVICE] special. We love sharing our process with you! What would you like to see more of?',
    'behind_scenes',
    ARRAY['general'],
    ARRAY['#behindthescenes', '#process', '#transparency', '#team', '#business'],
    true,
    8.3
),
(
    NULL,
    NULL,
    'Community Involvement',
    'Proud to support our local community! 🤝 We recently [COMMUNITY ACTION]. It''s important to us to give back to the community that supports us every day.',
    'community',
    ARRAY['general'],
    ARRAY['#community', '#giveback', '#local', '#support', '#proud'],
    true,
    8.6
),
(
    NULL,
    NULL,
    'Holiday Greetings',
    'Wishing everyone a wonderful [HOLIDAY]! 🎉 Thank you for your continued support throughout the year. We look forward to serving you in the days ahead!',
    'holiday',
    ARRAY['general'],
    ARRAY['#holiday', '#wishes', '#gratitude', '#celebration', '#community'],
    true,
    7.7
);

-- Create a view for dashboard analytics
CREATE VIEW dashboard_analytics AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    
    -- Post metrics
    COUNT(DISTINCT sp.id) as total_posts,
    COUNT(DISTINCT CASE WHEN sp.status = 'posted' THEN sp.id END) as published_posts,
    COUNT(DISTINCT CASE WHEN sp.status = 'scheduled' THEN sp.id END) as scheduled_posts,
    COUNT(DISTINCT CASE WHEN sp.status = 'failed' THEN sp.id END) as failed_posts,
    
    -- Social account metrics
    COUNT(DISTINCT sa.id) as connected_accounts,
    COUNT(DISTINCT CASE WHEN sa.status = 'active' THEN sa.id END) as active_accounts,
    
    -- Engagement metrics (last 30 days)
    COALESCE(AVG(pa.engagement_rate), 0) as avg_engagement_rate,
    COALESCE(SUM(pa.likes), 0) as total_likes,
    COALESCE(SUM(pa.comments), 0) as total_comments,
    COALESCE(SUM(pa.shares), 0) as total_shares,
    COALESCE(SUM(pa.reach), 0) as total_reach
    
FROM organizations o
LEFT JOIN scheduled_posts sp ON o.id = sp.organization_id 
    AND sp.created_at >= NOW() - INTERVAL '30 days'
LEFT JOIN social_accounts sa ON o.id = sa.organization_id
LEFT JOIN post_analytics pa ON sp.id = pa.scheduled_post_id 
    AND pa.created_at >= NOW() - INTERVAL '30 days'
GROUP BY o.id, o.name;

-- Grant appropriate permissions
GRANT SELECT ON dashboard_analytics TO authenticated;

-- Final setup message
DO $$
BEGIN
    RAISE NOTICE 'LocalSocial database schema has been successfully created!';
    RAISE NOTICE 'Key features include:';
    RAISE NOTICE '- Multi-tenant organization structure';
    RAISE NOTICE '- Comprehensive Row Level Security (RLS)';
    RAISE NOTICE '- Encrypted token storage for social accounts';
    RAISE NOTICE '- Advanced analytics and performance tracking';
    RAISE NOTICE '- Audit trails and activity logging';
    RAISE NOTICE '- Public post templates for quick start';
    RAISE NOTICE '- Optimized indexes for performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test user registration and authentication';
    RAISE NOTICE '2. Configure social media API credentials';
    RAISE NOTICE '3. Set up Stripe for billing (if using paid plans)';
    RAISE NOTICE '4. Customize post templates for your target industries';
END $$;