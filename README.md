<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/5b3c7609-abcf-428a-ab14-4d57e94a9933

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env.local`, then set the following values:
   - `GEMINI_API_KEY`
   - `APP_URL=http://localhost:3000`
   - `GOOGLE_CLIENT_ID`
   - `LOCAL_AUTH=true` (for local development when Google OAuth is not configured)
3. Run the app:
   `npm run dev`

### Local login fallback
If you do not have a working Google OAuth client configured yet, local development login is supported via `/auth/local` when `LOCAL_AUTH=true`. This lets you test login and user state without a real Google account.
