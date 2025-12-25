# School Admin Dashboard Issue - Missing schoolId

## Problem
The school admin user `ar@ex.com` is seeing "Your dashboard is being configured" with no menu options.

## Root Cause
The user document is missing the `schoolId` field, which is required for school admins to access their dashboard.

## Solution

### Step 1: Add schoolId to User Document

1. **Go to Firebase Console**
   - https://console.firebase.google.com/project/eduprogress-app/firestore/databases/-default-/data

2. **Navigate to the user document for ar@ex.com**
   - Collection: `users`
   - Document ID: `8mIowvNn23dJBLSGdEKenSyLbHq1`

3. **Add the schoolId field**
   - Click "Add field"
   - Field name: `schoolId`
   - Type: `string`
   - Value: (the ID of the school this admin manages - you can find this in the `schools` collection)

4. **Save the changes**

### Step 2: Verify the School Exists

Make sure there's a school document in the `schools` collection that this admin should manage. The `schoolId` value should match the document ID of that school.

### Expected User Document Structure

```json
{
  "email": "ar@ex.com",
  "name": "Arshad",
  "role": ["school-admin"],  // ← Already fixed (array)
  "schoolId": "v4nszbWzkoyclNnARnPg",  // ← ADD THIS
  "uid": "8mIowvNn23dJBLSGdEKenSyLbHq1",
  "status": "active"
}
```

## After Fixing

Once you add the `schoolId` field:
1. Refresh the application
2. The sidebar menu should appear
3. The dashboard should show school statistics
4. All school management features will be accessible

## Why This Happens

The `MySchool.tsx` component checks for `currentUserData?.schoolId` (line 71-75). If it's missing:
- The error is set to "Could not determine your associated school"
- The dashboard doesn't render
- The menu items don't appear

The `schoolId` field links the admin user to their specific school in the database.
