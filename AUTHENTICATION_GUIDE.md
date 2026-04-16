# BigCat Marketplace - Authentication System Documentation

## Overview

This document outlines the complete Supabase-based authentication system for the BigCat marketplace, supporting two distinct user roles: Buyers and Merchants.

## Architecture

### Database Schema

#### `auth_users` Table
Stores core user authentication data for all marketplace users.

```sql
- id (UUID): Primary key, auto-generated
- email (TEXT): Unique user email
- phone (TEXT): User phone number
- password_hash (TEXT): Bcrypt-hashed password
- role (TEXT): User role ('buyer' or 'merchant')
- created_at (TIMESTAMPTZ): Account creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp
```

**Indexes**: `email`, `role`

#### `merchant_profiles` Table
Extended profile information for merchant users.

```sql
- id (UUID): Primary key, auto-generated
- user_id (UUID): Foreign key to auth_users (unique, cascade delete)
- business_name (TEXT): Merchant business name
- smedan_id (TEXT): Unique SMEDAN ID for business registration
- created_at (TIMESTAMPTZ): Profile creation timestamp
- updated_at (TIMESTAMPTZ): Last update timestamp
```

**Indexes**: `user_id`, `smedan_id`

### File Structure

```
lib/
├── auth-actions.ts          # Server actions for authentication
├── role-context.tsx         # React context for user role & session
├── supabase/
│   ├── client.ts            # Supabase browser client
│   └── server.ts            # Supabase server client

components/
├── buyer-auth.tsx           # Buyer signup/login UI
├── merchant-auth.tsx        # Merchant signup/login UI
├── buyer-dashboard.tsx      # Buyer dashboard (protected)
├── merchant-dashboard.tsx   # Merchant dashboard (protected)
└── marketplace-app.tsx      # Main app router

scripts/
└── create-auth-schema.sql   # Database migration script
```

## Authentication Flow

### Buyer Signup
1. User enters email, phone, password
2. `buyerSignup()` validates inputs
3. Hashes password and creates `auth_users` record with `role: 'buyer'`
4. Session stored in context and localStorage
5. User redirected to buyer dashboard

### Merchant Signup
1. User enters email, phone, password, SMEDAN ID
2. `merchantSignup()` validates all inputs
3. Creates `auth_users` record with `role: 'merchant'`
4. Creates corresponding `merchant_profiles` record
5. Session stored in context and localStorage
6. User redirected to merchant setup/dashboard

### Login (Both Roles)
1. User enters email and password
2. `emailPasswordLogin()` finds user and verifies password
3. Fetches merchant profile if user is merchant
4. Returns user data and role
5. User redirected to appropriate dashboard

### Logout
1. `logout()` clears Supabase session
2. Clears localStorage session data
3. Resets context (role and user to null)
4. User redirected to auth/onboarding page

## API Functions

All authentication functions are server actions in `lib/auth-actions.ts`:

### `buyerSignup(email, phone, password)`
- **Input validation**: Email format, phone format, password strength
- **Returns**: `{ success: boolean, error?: string, data?: {...} }`
- **Side effects**: Creates user in database, revalidates cache

### `merchantSignup(email, phone, password, smedanId)`
- **Input validation**: All buyer validations + SMEDAN ID format
- **Returns**: `{ success: boolean, error?: string, data?: {...} }`
- **Side effects**: Creates user + merchant profile, revalidates cache

### `emailPasswordLogin(email, password)`
- **Input validation**: Email format, password presence
- **Returns**: `{ success: boolean, error?: string, data?: {...} }`
- **Side effects**: Revalidates cache on success

### `getCurrentUser()`
- **Returns**: Current authenticated user data from session
- **Returns**: `{ success: boolean, error?: string, data?: {...} }`

### `logout()`
- **Returns**: `{ success: boolean, error?: string }`
- **Side effects**: Clears session, revalidates cache

## Session Management

### Storage
- **LocalStorage**: Persists user session across page reloads
- **Context**: Provides real-time role and user data to components
- **Supabase**: Manages server-side authentication state

### Session Structure
```typescript
interface AuthSession {
  role: 'buyer' | 'merchant' | null
  user: {
    userId: string
    email: string
    phone?: string
    role: 'buyer' | 'merchant'
    merchantProfile?: {
      id: string
      business_name: string
      smedan_id: string
    }
  }
}
```

### Session Restoration
On app load, `RoleProvider` restores session from localStorage if available, ensuring user remains logged in across browser sessions.

## Input Validation

### Email
- Must match standard email regex pattern
- Maximum 255 characters

### Phone
- Minimum 10 digits (including country code)
- Supports various formats: `+234 800 000 0000`, `08000000000`, etc.

### Password
- Minimum 8 characters
- Must contain at least one uppercase letter
- Must contain at least one number

### SMEDAN ID (Merchants only)
- Alphanumeric, 5-20 characters
- Case-insensitive (converted to uppercase)

## Security Measures

1. **Password Hashing**: Passwords hashed using SHA-256 (consider bcrypt in production)
2. **Input Sanitization**: All inputs validated and trimmed
3. **Email Uniqueness**: Enforced at database level
4. **SMEDAN ID Uniqueness**: Enforced at database level
5. **Cascade Delete**: Deleting user automatically deletes merchant profile
6. **Error Messages**: Generic messages prevent user enumeration attacks
7. **Server Actions**: All auth operations run server-side, never expose secrets

## Components

### BuyerAuth Component
- Toggle between signup and login modes
- Real-time form validation feedback
- Error message display
- Loading state during submission
- OAuth button placeholders (Google, Apple)

### MerchantAuth Component
- Same as BuyerAuth plus SMEDAN ID field
- Field only shown in signup mode
- Validates SMEDAN ID format

### RoleProvider Context
- Manages global auth state
- Persists session to localStorage
- Restores session on mount
- Exposes `useRole()` hook for components

## Usage Examples

### Signup (in component)
```typescript
import { buyerSignup } from '@/lib/auth-actions'
import { useRole } from '@/lib/role-context'

function SignupForm() {
  const { setRole, setUser } = useRole()

  const handleSignup = async (email, phone, password) => {
    const result = await buyerSignup(email, phone, password)
    
    if (result.success && result.data) {
      setUser({
        userId: result.data.userId,
        email: result.data.email,
        role: 'buyer'
      })
      setRole('buyer')
    }
  }
}
```

### Check Authentication (in component)
```typescript
function ProtectedComponent() {
  const { role, user, isLoading } = useRole()

  if (isLoading) return <LoadingSpinner />
  if (!role) return <Redirect to="/auth" />
  
  return <Dashboard user={user} role={role} />
}
```

### Logout (in component)
```typescript
import { logout } from '@/lib/auth-actions'
import { useRole } from '@/lib/role-context'

function Header() {
  const { setRole, setUser } = useRole()

  const handleLogout = async () => {
    await logout()
    setUser(null)
    setRole(null)
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

## Testing Scenarios

### Buyer Flow
1. ✅ Signup with valid credentials
2. ✅ Receive success message
3. ✅ Redirect to buyer dashboard
4. ✅ Session persists on page reload
5. ✅ Logout clears session
6. ✅ Attempt signup with existing email (should fail)
7. ✅ Attempt signup with weak password (should fail)

### Merchant Flow
1. ✅ Signup with valid credentials + SMEDAN ID
2. ✅ Merchant profile created automatically
3. ✅ Redirect to merchant dashboard
4. ✅ Session persists on page reload
5. ✅ Attempt signup with duplicate SMEDAN ID (should fail)
6. ✅ Invalid SMEDAN ID format rejected

### Login Flow
1. ✅ Login with correct credentials
2. ✅ Redirect to appropriate dashboard based on role
3. ✅ Invalid credentials show error
4. ✅ Both buyer and merchant can login

## Error Handling

All auth functions return consistent error responses:

```typescript
{
  success: false,
  error: "User-friendly error message"
}
```

Common errors:
- `"Invalid email address"` - Email format validation failed
- `"Invalid phone number"` - Phone format validation failed
- `"Password must be at least 8 characters"` - Password too short
- `"Email already registered"` - User with this email exists
- `"Invalid SMEDAN ID format"` - SMEDAN ID format incorrect
- `"SMEDAN ID already registered"` - SMEDAN ID taken
- `"Failed to create account"` - Database error
- `"Invalid email or password"` - Login credentials mismatch

## Future Enhancements

1. **OAuth2 Integration**
   - Google OAuth callback at `/api/auth/google/callback`
   - Apple OAuth callback at `/api/auth/apple/callback`
   - Role detection from OAuth profile data

2. **Email Verification**
   - Send verification link on signup
   - Require email verification before account activation

3. **Password Reset**
   - Forgot password flow with email token
   - Secure password reset page

4. **Two-Factor Authentication**
   - SMS or authenticator app support
   - Recovery codes

5. **Rate Limiting**
   - Prevent brute force attacks
   - Limit failed login attempts

6. **Session Expiration**
   - Automatic logout after inactivity
   - Token refresh mechanism

7. **Audit Logging**
   - Track login/signup/logout events
   - Monitor suspicious activity

## Environment Variables

Required Supabase environment variables:
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
POSTGRES_URL
```

These are automatically set when Supabase integration is configured.

## Support & Troubleshooting

### User can't sign up
- Check email format is valid
- Verify password meets requirements (8+ chars, 1 uppercase, 1 number)
- Ensure email isn't already registered

### Merchant signup fails
- Verify SMEDAN ID is 5-20 alphanumeric characters
- Check SMEDAN ID isn't already registered
- Ensure all other fields meet requirements

### Session persists incorrectly
- Clear browser localStorage manually
- Check browser localStorage is enabled
- Verify no browser extensions blocking storage

### Login shows "Invalid email or password"
- Double-check entered credentials
- Ensure account was created (signup completed)
- Verify correct email is used for signup vs login
