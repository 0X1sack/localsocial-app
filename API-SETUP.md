# LocalSocial API Setup Guide

## 🔑 Social Media API Access Setup

### 1. Meta (Facebook/Instagram) API Setup

#### Step 1: Create Meta Developer Account
1. Go to https://developers.facebook.com
2. Click "Get Started" and create developer account
3. Verify your identity (phone number required)

#### Step 2: Create Facebook App
1. Go to "My Apps" → "Create App"
2. Select "Business" app type
3. Fill in app details:
   - App Name: "LocalSocial Scheduler"
   - App Contact Email: your-email@domain.com
   - Business Account: Create new or use existing

#### Step 3: Configure App Settings
1. Go to App Settings → Basic
2. Add App Domain: `localhost` (for development)
3. Add Privacy Policy URL: `https://your-domain.com/privacy`
4. Add Terms of Service URL: `https://your-domain.com/terms`

#### Step 4: Add Facebook Login Product
1. Go to Products → Add Product
2. Select "Facebook Login" → Set Up
3. Configure Valid OAuth Redirect URIs:
   - `http://localhost:5173/auth/callback`
   - `https://your-domain.com/auth/callback`

#### Step 5: Add Instagram Basic Display
1. Go to Products → Add Product
2. Select "Instagram Basic Display" → Set Up
3. Create Instagram App
4. Add Instagram Test Users (your Instagram account)

#### Step 6: Request Permissions (Production)
```javascript
// Required permissions for production:
const permissions = [
  'pages_show_list',           // Access user's pages
  'pages_read_engagement',     // Read page engagement
  'pages_manage_posts',        // Manage page posts
  'instagram_basic',           // Instagram basic access
  'instagram_content_publish', // Publish to Instagram
  'business_management'        // Business account access
]
```

### 2. Google Business Profile API Setup

#### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: "LocalSocial"
3. Enable billing (required but won't charge for free tier)

#### Step 2: Enable APIs
1. Go to APIs & Services → Library
2. Search and enable:
   - Google Business Profile API
   - Google My Business API (legacy)
   - Places API (for location data)

#### Step 3: Create Service Account
1. Go to APIs & Services → Credentials
2. Create Credentials → Service Account
3. Download JSON key file
4. Store securely (never commit to git)

#### Step 4: Set Up OAuth 2.0
1. Create OAuth 2.0 Client ID
2. Add authorized redirect URIs:
   - `http://localhost:5173/auth/google/callback`
   - `https://your-domain.com/auth/google/callback`

### 3. LinkedIn API Setup

#### Step 1: Create LinkedIn Page
1. Create a LinkedIn Company Page (required for API access)
2. Must have admin access to the page

#### Step 2: Create LinkedIn App
1. Go to https://developer.linkedin.com
2. Create App
3. Fill in app details:
   - App Name: "LocalSocial"
   - LinkedIn Page: Select your company page
   - App Logo: Upload 300x300 image

#### Step 3: Request API Access
1. Go to Products → Select products
2. Request access to:
   - Share on LinkedIn
   - Marketing Developer Platform (for analytics)

#### Step 4: Verify App
1. Complete app verification process
2. Wait for LinkedIn approval (can take 7-14 days)

## 🔐 Environment Variables Setup

Create `.env.local` file in your project root:

```bash
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Meta (Facebook/Instagram)
VITE_FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Business Profile
VITE_GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_SERVICE_ACCOUNT_JSON=path_to_service_account_json

# LinkedIn
VITE_LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# OpenAI (for content generation)
OPENAI_API_KEY=your_openai_api_key

# Cloudinary (for media storage)
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## 📊 API Rate Limits & Quotas

### Facebook/Instagram API
- **Rate Limit**: 200 calls per hour per user
- **Post Limit**: 50 posts per 24 hours per account
- **Cost**: Free for basic usage

### Google Business Profile API
- **Rate Limit**: 300 requests per minute
- **Edit Limit**: 10 edits per minute per location
- **Cost**: Free for standard usage

### LinkedIn API
- **Rate Limit**: 500 requests per day (free tier)
- **Post Limit**: No specific limit mentioned
- **Cost**: Free for basic posting

### OpenAI API
- **Free Tier**: $5 credit (limited time)
- **Rate Limit**: 3 requests per minute (free tier)
- **Cost**: ~$0.002 per 1K tokens

## 🚀 Development Workflow

### 1. Local Development Setup
```bash
# Clone and setup
git clone your-repo-url
cd localsocial-app
npm install

# Setup environment
cp .env.example .env.local
# Fill in your API credentials

# Start development server
npm run dev
```

### 2. Testing API Connections
```javascript
// Test Facebook API connection
const testFacebookAPI = async () => {
  const response = await fetch(
    `https://graph.facebook.com/me/accounts?access_token=${accessToken}`
  )
  const data = await response.json()
  console.log('Facebook Pages:', data)
}

// Test Google Business Profile API
const testGoogleAPI = async () => {
  const response = await fetch(
    'https://mybusiness.googleapis.com/v4/accounts',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  )
  const data = await response.json()
  console.log('Google Business Accounts:', data)
}
```

### 3. Production Deployment
1. **Vercel Deployment**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Never commit secrets to git

3. **Domain Setup**:
   - Configure custom domain in Vercel
   - Update OAuth redirect URIs in all API consoles

## 🔒 Security Best Practices

### 1. API Key Management
- Store all secrets in environment variables
- Use different keys for development/production
- Rotate keys regularly
- Never log API keys

### 2. Authentication Flow
```javascript
// Secure OAuth flow example
const handleSocialLogin = async (platform) => {
  // Generate state parameter for CSRF protection
  const state = generateRandomString(32)
  localStorage.setItem('oauth_state', state)
  
  // Redirect to OAuth provider
  const authUrl = `${OAUTH_BASE_URL}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&state=${state}&scope=${SCOPES}`
  window.location.href = authUrl
}
```

### 3. Data Privacy
- Implement proper data retention policies
- Allow users to delete their data
- Comply with GDPR/CCPA requirements
- Encrypt sensitive data at rest

## 🚨 Common Issues & Solutions

### Facebook API Issues
**Problem**: "This app is in development mode"
**Solution**: Submit app for review once ready for production

**Problem**: "Invalid OAuth access token"
**Solution**: Refresh token or re-authenticate user

### Google API Issues
**Problem**: "Quota exceeded"
**Solution**: Implement proper rate limiting and retry logic

**Problem**: "Access not configured"
**Solution**: Enable the specific API in Google Cloud Console

### LinkedIn API Issues
**Problem**: "Member does not have permission to post"
**Solution**: Ensure user has admin access to LinkedIn page

**Problem**: "Application not verified"
**Solution**: Complete LinkedIn app verification process

## 📈 Monitoring & Analytics

### 1. API Usage Tracking
```javascript
// Track API usage for rate limiting
const apiUsageTracker = {
  facebook: { requests: 0, resetTime: Date.now() + 3600000 },
  google: { requests: 0, resetTime: Date.now() + 60000 },
  linkedin: { requests: 0, resetTime: Date.now() + 86400000 }
}
```

### 2. Error Monitoring
- Use Sentry for error tracking
- Log API failures for debugging
- Set up alerts for high error rates

### 3. Performance Monitoring
- Monitor API response times
- Track successful post rates
- Alert on API downtime

This setup gives you everything needed to build LocalSocial with zero upfront costs using free tiers of all services.