# Quick Fix: Refresh Authentication Token

## The Problem
Even though we've fixed the Firestore rules and the user's role is now correctly set as an array `["school-admin"]`, the browser is still using an **old authentication token** that was created before the role was fixed.

## The Solution

### Option 1: Log Out and Log Back In (Recommended)
1. Click the **Logout** button in the top right corner
2. Log back in with `ar@ex.com`
3. The new authentication token will include the updated role
4. The dashboard should now load properly

### Option 2: Clear Browser Cache
1. Press **Ctrl + Shift + Delete** (or Cmd + Shift + Delete on Mac)
2. Select "Cached images and files" and "Cookies and other site data"
3. Click "Clear data"
4. Refresh the page and log in again

### Option 3: Use Incognito/Private Window
1. Open a new **Incognito/Private window**
2. Navigate to your application
3. Log in with `ar@ex.com`
4. This will create a fresh authentication session

## Why This Happens
Firebase Authentication tokens contain user claims (like roles) that are set when the user logs in. When you change the role in Firestore, the existing token doesn't automatically update. The user needs to get a new token by logging in again.

## After Logging Back In
You should see:
- ✅ Sidebar menu with all school admin options
- ✅ Dashboard showing school statistics
- ✅ No "Missing or insufficient permissions" errors
- ✅ Full access to all school management features
