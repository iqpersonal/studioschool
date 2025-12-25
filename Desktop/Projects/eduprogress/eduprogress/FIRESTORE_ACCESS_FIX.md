# Fixing "Failed to Load" Errors After Security Rules Deployment

## Problem
After deploying Firestore security rules, you're seeing "failed to load staff statistics" and other data loading errors. This is because the new security rules require users to have proper roles assigned.

## Solution: Add Super Admin Role to Your User

### Option 1: Via Firebase Console (Recommended)

1. **Open Firebase Console**
   - Go to https://console.firebase.google.com/project/eduprogress-app/firestore/databases/-default-/data

2. **Navigate to Users Collection**
   - Click on the `users` collection in the left sidebar

3. **Find Your User Document**
   - Look for your user document (it will have your UID as the document ID)
   - If you don't see any users, you may need to create one

4. **Add/Update the Role Field**
   - Click on your user document
   - Look for the `role` field
   - **IMPORTANT**: The `role` field must be an **array** containing the string `"super-admin"`
   - If the field doesn't exist or is wrong, edit it to be: `["super-admin"]`

5. **Save and Refresh**
   - Save the changes
   - Refresh your application (localhost:5173)
   - The data should now load successfully

### Option 2: Temporarily Relax Rules (For Testing Only)

If you need immediate access while setting up roles, you can temporarily modify the rules:

**Edit `firestore.rules`** - Add this at the top of the collection rules section (line 38):

```javascript
// TEMPORARY: Allow all authenticated users full access
// TODO: Remove this after setting up proper roles
match /{document=**} {
  allow read, write: if isAuthenticated();
}
```

Then redeploy:
```bash
firebase deploy --only firestore:rules
```

**⚠️ WARNING**: This removes all security! Only use for testing and remove immediately after setting up roles.

### Verify Your Role is Set Correctly

The `role` field in your user document should look like this:

```json
{
  "uid": "your-user-id",
  "email": "your-email@example.com",
  "name": "Your Name",
  "role": ["super-admin"],  // ← Must be an array!
  "status": "active"
}
```

## Common Mistakes

1. **Role is a string instead of array**: `"role": "super-admin"` ❌
   - Should be: `"role": ["super-admin"]` ✅

2. **Wrong role name**: `"role": ["admin"]` ❌
   - Should be: `"role": ["super-admin"]` ✅

3. **No user document exists**: Create one with your UID from Firebase Authentication

## After Fixing

Once you've added the `super-admin` role to your user:
1. Refresh the application
2. All data should load successfully
3. You'll have full access to all features
