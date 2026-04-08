# User Flow Diagrams & Architecture Guide

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BigCat Marketplace                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    Frontend (Next.js 16)                 │   │
│  │  ┌──────────────┬──────────────┬──────────────────────┐  │   │
│  │  │ Auth System  │ Buyer UI     │ Merchant Interface   │  │   │
│  │  │              │              │                      │  │   │
│  │  │ • Signup     │ • Products   │ • Store Setup        │  │   │
│  │  │ • Login      │ • Cart       │ • Dashboard          │  │   │
│  │  │ • Sessions   │ • Checkout   │ • Products Mgmt      │  │   │
│  │  │              │ • Orders     │ • Orders Mgmt        │  │   │
│  │  └──────────────┴──────────────┴──────────────────────┘  │   │
│  │                                                            │   │
│  │  ┌─────────────────────────────────────────────────────┐  │   │
│  │  │         Shared Components & Context                │  │   │
│  │  │  • Payment Method Selector  • Cart Context          │  │   │
│  │  │  • Currency Utilities        • Role Context         │  │   │
│  │  │  • Marketplace App           • Admin Access         │  │   │
│  │  └─────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │           Server Actions (lib/auth-actions.ts)           │   │
│  │   • User Authentication   • Session Management           │   │
│  │   • Order Creation        • Data Validation              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │          Supabase PostgreSQL Database                    │   │
│  │  ┌────────────────┬──────────────┬──────────────────┐    │   │
│  │  │  auth_users    │  products    │  orders          │    │   │
│  │  │                │              │                  │    │   │
│  │  │  • Users       │  • Items     │  • Transactions  │    │   │
│  │  │  • Merchants   │  • Pricing   │  • Payments      │    │   │
│  │  │  • Setup Data  │  • Inventory │  • Delivery      │    │   │
│  │  └────────────────┴──────────────┴──────────────────┘    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 👤 BUYER COMPLETE FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BUYER USER JOURNEY                              │
└─────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
   ┌─────────────────┐
   │ Visit Platform  │
   └────────┬────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Select "Buyer" Role  │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   SIGNUP FORM                            │
   │   ✓ Email: user@example.com              │
   │   ✓ Phone: +234 800 000 0000             │
   │   ✓ Password: (validated)                │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Account Created      │
   │ Role: "buyer"        │
   └────────┬─────────────┘
            │
            ▼
   ┌──────────────────────┐
   │ LOGIN                │
   │ Email & Password     │
   └────────┬─────────────┘
            │
            ▼
   ┌─────────────────────────────────────────┐
   │   BUYER DASHBOARD                       │
   │   ┌─────────────────────────────────┐   │
   │   │ Featured Products               │   │
   │   │ [Product 1] ₦5,000              │   │
   │   │ [Product 2] ₦12,500             │   │
   │   │ [Product 3] ₦8,750              │   │
   │   └─────────────────────────────────┘   │
   └────────┬─────────────────────────────────┘
            │
            ▼ (Click "Add to Cart")
   ┌─────────────────────────────────────────┐
   │ PRODUCT DETAILS PAGE                    │
   │ ┌───────────────────────────────────┐   │
   │ │ Price: ₦5,000                     │   │
   │ │ Description                       │   │
   │ │ Merchant: [Store Name]            │   │
   │ │                                   │   │
   │ │ [Add to Cart] ✓ Added             │   │
   │ └───────────────────────────────────┘   │
   └────────┬─────────────────────────────────┘
            │
            ▼ (View Cart)
   ┌─────────────────────────────────────────┐
   │   CART VIEW                             │
   │   ┌───────────────────────────────────┐ │
   │   │ Product 1              × 1  ₦5,000 │ │
   │   │ Product 2              × 2  ₦25,000│ │
   │   │                                   │ │
   │   │ Subtotal:               ₦30,000   │ │
   │   │ [Proceed to Checkout]             │ │
   │   └───────────────────────────────────┘ │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   CHECKOUT PAGE - STEP 1                 │
   │   Select Delivery Type                   │
   │   ○ Normal (3-5 days) - ₦500             │
   │   ◉ Express (1-2 days) - ₦2,000          │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   CHECKOUT PAGE - STEP 2                 │
   │   Enter Delivery Address                 │
   │   [________________]                     │
   │   [________________]                     │
   └────────┬─────────────────────────────────┘
            │
            ▼ ⭐ NEW FEATURE
   ┌──────────────────────────────────────────┐
   │   CHECKOUT PAGE - STEP 3                 │
   │   ⭐ SELECT PAYMENT METHOD ⭐            │
   │                                          │
   │   ◉ PalmPay Wallet  [RECOMMENDED]        │
   │     "Pay from PalmPay account"           │
   │                                          │
   │   ○ Bank Transfer                        │
   │     "Direct bank account funding"        │
   │                                          │
   │   ○ Credit/Debit Card                    │
   │     "Pay securely with card"             │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   ORDER SUMMARY                          │
   │   ┌────────────────────────────────────┐ │
   │   │ Product Total      ₦30,000         │ │
   │   │ Delivery Fee       ₦2,000          │ │
   │   │ ────────────────────────────────    │ │
   │   │ GRAND TOTAL        ₦32,000         │ │
   │   │                                    │ │
   │   │ Payment Method: PalmPay Wallet     │ │
   │   │ [Place Order]                      │ │
   │   └────────────────────────────────────┘ │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   ORDER CONFIRMATION                     │
   │   ✓ Order #ORD-2026-12345 Created       │
   │   ✓ Payment: PalmPay Wallet             │
   │   ✓ Amount: ₦32,000                     │
   │   ✓ Status: Pending Payment             │
   │   ✓ Delivery: Express (1-2 days)        │
   │                                          │
   │   [View Order] [Continue Shopping]      │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   ORDER TRACKING                         │
   │   Order #ORD-2026-12345                  │
   │   ┌────────────────────────────────────┐ │
   │   │ ✓ Pending  → Paid → Processing →  │ │
   │   │   Shipped → Delivered               │ │
   │   └────────────────────────────────────┘ │
   │   Current: Paid (₦32,000)               │
   │   Delivery: Arriving in 24 hours        │
   └────────┬─────────────────────────────────┘
            │
            ▼
          END
```

---

## 🏪 MERCHANT COMPLETE FLOW

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MERCHANT USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────────┘

    START
      │
      ▼
   ┌─────────────────┐
   │ Visit Platform  │
   └────────┬────────┘
            │
            ▼
   ┌──────────────────────┐
   │ Select "Merchant" Role
   └────────┬─────────────┘
            │
            ▼
   ┌─────────────────────────────────────────────┐
   │   MERCHANT SIGNUP FORM                      │
   │   ✓ Email: merchant@example.com             │
   │   ✓ Phone: +234 800 111 1111                │
   │   ✓ Password: (validated)                   │
   │   ✓ SMEDAN ID: SMED-2024-00123              │
   └────────┬────────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │ Account Created                          │
   │ Role: "merchant"                         │
   │ Status: setup_completed = false          │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │ LOGIN                                    │
   │ Email & Password                         │
   └────────┬─────────────────────────────────┘
            │
            ▼ (Redirected - Setup Required)
   ┌──────────────────────────────────────────┐
   │   🔧 STORE SETUP (Step 1/2)              │
   │   ┌───────────────────────────────────┐  │
   │   │ Store Name:                       │  │
   │   │ [My Electronics Store]            │  │
   │   │                                   │  │
   │   │ Description:                      │  │
   │   │ [We sell quality electronics...]  │  │
   │   │                                   │  │
   │   │ Category:                         │  │
   │   │ [Electronics ▼]                   │  │
   │   │                                   │  │
   │   │ Location:                         │  │
   │   │ [Lagos, Nigeria]                  │  │
   │   │                                   │  │
   │   │ [Save Setup] ✓ Completed         │  │
   │   └───────────────────────────────────┘  │
   └────────┬─────────────────────────────────┘
            │
            ▼ (Redirected - Settings Required)
   ┌──────────────────────────────────────────┐
   │   ⚙️  STORE SETTINGS (Step 2/2) ⭐ NEW   │
   │   ┌───────────────────────────────────┐  │
   │   │ 📋 STORE INFORMATION              │  │
   │   │ Store Email: merchant@example.com │  │
   │   │ Store Phone: +234 800 111 1111    │  │
   │   │ Website: www.example.com          │  │
   │   │                                   │  │
   │   │ 💳 PAYMENT INFORMATION            │  │
   │   │ Bank Account: [Account Name]      │  │
   │   │ Account #: [Account Number]       │  │
   │   │ Bank: [Zenith Bank ▼]             │  │
   │   │                                   │  │
   │   │ 📊 STORE POLICIES                │  │
   │   │ Min Order: ₦1,000                 │  │
   │   │ Commission: 5%                    │  │
   │   │                                   │  │
   │   │ [Save Settings] ✓ Completed      │  │
   │   └───────────────────────────────────┘  │
   └────────┬─────────────────────────────────┘
            │
            ▼
   ┌──────────────────────────────────────────┐
   │   MERCHANT DASHBOARD                     │
   │   ┌───────────────────────────────────┐  │
   │   │ 📊 STATS (All in Naira)           │  │
   │   │ Total Sales: ₦24,580 (+18.2%)     │  │
   │   │ Active Orders: 47 (+5)            │  │
   │   │ Token Balance: 2,450 (-120)       │  │
   │   │ Escrow: ₦3,240 (+₦840)            │  │
   │   └───────────────────────────────────┘  │
   │   ┌───────────────────────────────────┐  │
   │   │ ⚡ QUICK ACTIONS                  │  │
   │   │ [Add Product] [View Orders]       │  │
   │   │ [Analytics] [AI BizPilot]         │  │
   │   └───────────────────────────────────┘  │
   │   ┌───────────────────────────────────┐  │
   │   │ 🤖 AI BIZPILOT                    │  │
   │   │ "Your traffic is high but..."     │  │
   │   │ "Top seller trending high..."     │  │
   │   │ "Lagos customers have 40% ..."    │  │
   │   └───────────────────────────────────┘  │
   │   ┌───────────────────────────────────┐  │
   │   │ 📦 PRODUCTS                       │  │
   │   │ Item 1: ₦149.99 (234 stock)       │  │
   │   │ Item 2: ₦299.99 (89 stock)        │  │
   │   │ Item 3: ₦199.99 (12 stock)        │  │
   │   └───────────────────────────────────┘  │
   │   ┌───────────────────────────────────┐  │
   │   │ 📋 RECENT ORDERS                  │  │
   │   │ BC-3847: ₦149.99 (Pending)        │  │
   │   │ BC-3846: ₦299.99 (Shipped)        │  │
   │   │ BC-3845: ₦449.99 (Delivered)      │  │
   │   └───────────────────────────────────┘  │
   └────────┬─────────────────────────────────┘
            │
            ├─→ [Add Product] → Add Items with ₦ Pricing
            │
            ├─→ [View Orders] → Track Shipments
            │
            ├─→ [Analytics] → View Sales Report
            │
            └─→ [Settings] → Manage Store Config
                          → Update Payment Info
                          → Change Policies
                          → Logout
```

---

## 🔐 ADMIN MULTI-LEVEL ACCESS

```
┌────────────────────────────────────────────────┐
│         ADMIN LEVEL AUTHENTICATION             │
└────────────────────────────────────────────────┘

         Visit Platform
                │
                ▼
         Click "Admin Access"
                │
                ▼
      ┌────────────────────────┐
      │ Enter Admin Code:       │
      │ [________________]      │
      │ [Verify]               │
      └────────┬───────────────┘
               │
       ┌───────┴─────────┬──────────────────┐
       │                 │                  │
       ▼                 ▼                  ▼
   SMEDAN_123      PALMPAY_012         BIGCAT_00
       │                 │                  │
       ▼                 ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ SMEDAN Admin │ │ PalmPay Admin│ │ BigCat Admin │
│              │ │              │ │              │
│• Merchants   │ │• Payments    │ │• All Users   │
│• Verification│ │• Transactions│ │• Orders      │
│• SMEDAN IDs  │ │• Escrow      │ │• Revenue     │
│• Approval    │ │• Settlements │ │• Analytics   │
└──────────────┘ └──────────────┘ └──────────────┘
```

---

## 💳 PAYMENT FLOW

```
┌────────────────────────────────────────────────────────────────┐
│            PAYMENT METHOD SELECTION & PROCESSING               │
└────────────────────────────────────────────────────────────────┘

    CHECKOUT PAGE
         │
         ▼
    ┌──────────────────────────────────────┐
    │ SELECT PAYMENT METHOD                │
    │                                      │
    │ ◉ PalmPay Wallet (Recommended)       │ ← DEFAULT
    │   • Fastest payment                  │
    │   • Instant confirmation             │
    │   • Mobile-first                     │
    │                                      │
    │ ○ Bank Transfer                      │
    │   • Traditional method               │
    │   • 1-2 hours processing             │
    │   • Account holder verification      │
    │                                      │
    │ ○ Credit/Debit Card                  │
    │   • Card payment option              │
    │   • Secure processing                │
    │   • International cards              │
    └────────┬─────────────────────────────┘
             │
             ▼
    Payment Method Selected → Stored in State
             │
             ▼
    [Place Order] Button
             │
             ▼
    ORDER CREATED
    ├─ order_id: UUID
    ├─ payment_method: 'palmpay' | 'bank' | 'card'
    ├─ amount: ₦ (in Naira)
    ├─ status: 'pending'
    └─ created_at: timestamp
             │
             ▼
    ┌─────────────────────────────────────┐
    │ Payment Processing (Implementation) │
    │ Based on selected method            │
    │                                     │
    │ If PalmPay:                         │
    │  → Call PalmPay API                 │
    │  → Initiate wallet transfer         │
    │  → Webhook confirmation             │
    │                                     │
    │ If Bank:                            │
    │  → Generate bank details            │
    │  → Wait for transfer                │
    │  → Manual confirmation              │
    │                                     │
    │ If Card:                            │
    │  → Tokenize card                    │
    │  → Process charge                   │
    │  → Payment gateway response         │
    └────────┬────────────────────────────┘
             │
             ▼
    Order Status Updated
    ├─ status: 'paid' ✓
    └─ payment_timestamp: confirmed
```

---

## 🌐 COMPLETE NAIRA CURRENCY SYSTEM

```
┌──────────────────────────────────────────────┐
│         CURRENCY FORMATTING UTILITY           │
│              lib/currency-utils.ts            │
└──────────────────────────────────────────────┘

    formatNaira(amount: number) → string

         Input: 24580
             │
             ▼
    ┌──────────────────────────────────────┐
    │ Format with Thousand Separators       │
    │ Add Currency Symbol (₦)               │
    └──────────────────────────────────────┘
             │
             ▼
         Output: ₦24,580


    APPLIED ACROSS:
    ┌─────────────────────────────────────────┐
    │ BUYER INTERFACE                         │
    │ • Product Cards: ₦5,000                 │
    │ • Cart Items: ₦25,000                   │
    │ • Checkout Total: ₦32,500               │
    │ • Order Confirmation: ₦32,500           │
    │ • Order History: ₦12,500                │
    │                                         │
    │ MERCHANT INTERFACE                      │
    │ • Total Sales: ₦24,580                  │
    │ • Escrow Balance: ₦3,240                │
    │ • Product Prices: ₦149.99               │
    │ • Min Order: ₦1,000                     │
    │ • Minimum Order Commission              │
    │ • Delivery Fee: ₦500                    │
    │                                         │
    │ ADMIN INTERFACE                         │
    │ • Total Revenue: ₦1,245,800             │
    │ • Sales Breakdown: ₦...                 │
    │ • Payment Status: ₦...                  │
    └─────────────────────────────────────────┘
```

---

## 🔄 USER ROLE SWITCHING

```
┌───────────────────────────────────────────────┐
│           ROLE SELECTION LOGIC                │
└───────────────────────────────────────────────┘

    User Not Logged In
         │
         ▼
    ┌─────────────────────────────┐
    │   ONBOARDING SCREEN         │
    │                             │
    │ [Buyer]  [Merchant] [Admin] │
    └────┬───────┬────────┬───────┘
         │       │        │
         ▼       ▼        ▼
    BUYER   MERCHANT   ADMIN
     │         │        │
     ▼         ▼        ▼
  Signup    Signup    Code
   Form      Form     Entry
     │         │        │
     ▼         ▼        ▼
  Dashboard  Setup → Settings → Dashboard  → Dashboard


    CONTEXT STORAGE:
    ┌─────────────────────────────────────┐
    │  Role Context (lib/role-context.tsx)│
    │  ┌─────────────────────────────────┐│
    │  │ role: 'buyer'|'merchant'|'admin'││
    │  │ user: {                         ││
    │  │   userId: string                ││
    │  │   email: string                 ││
    │  │   phone: string                 ││
    │  │   role: string                  ││
    │  │   merchantProfile?: {...}       ││
    │  │ }                               ││
    │  │ setRole: function               ││
    │  │ setUser: function               ││
    │  │ logout: function                ││
    │  │ isLoading: boolean              ││
    │  └─────────────────────────────────┘│
    └─────────────────────────────────────┘
```

---

**Note**: All diagrams show current implementation. Payment gateway integrations are ready for connection.
