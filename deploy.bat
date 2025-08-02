@echo off
echo Building LocalSocial for production deployment...

echo Step 1: Installing dependencies...
npm install

echo Step 2: Building application...
npm run build

echo Step 3: Deployment ready!
echo.
echo Next steps:
echo 1. Deploy to Vercel: npx vercel --prod
echo 2. Configure environment variables in Vercel dashboard
echo 3. Set up Supabase database using IMMEDIATE-SETUP-GUIDE.md
echo 4. Configure Stripe payments
echo.
echo Build output is in ./dist directory
echo Visit http://localhost:5175 to test locally

pause