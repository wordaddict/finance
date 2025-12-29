# CCI Expense Management System

A comprehensive, production-ready expense management system for church operations built with Next.js 14, TypeScript, and PostgreSQL. This platform streamlines the entire expense request lifecycle from submission to payment, with robust approval workflows, reporting capabilities, and communication features.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [User Roles & Permissions](#user-roles--permissions)
- [Expense Request Workflow](#expense-request-workflow)
- [Event Expenses](#event-expenses)
- [Item-Level Approvals](#item-level-approvals)
- [Change Requests](#change-requests)
- [Expense Reports](#expense-reports)
- [Notes & Communication](#notes--communication)
- [File Attachments](#file-attachments)
- [Email Notifications](#email-notifications)
- [Dashboard & Analytics](#dashboard--analytics)
- [User Account Management](#user-account-management)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Deployment](#deployment)

## Overview

The CCI Expense Management System is designed to handle the complete expense management lifecycle for church operations across multiple campuses. It provides role-based access control, multi-stage approval workflows, comprehensive reporting, and real-time communication features.

## Key Features

### Core Functionality

- **Multi-Role User Management**: Three-tier role system (Admin, Campus Pastor, Leader) with granular permissions
- **Expense Request System**: Complete workflow from submission to payment with status tracking
- **Itemized Expenses**: Support for multiple items per expense with individual approvals
- **Event Expenses**: Special handling for event-related expenses with budget tracking
- **Change Requests**: Ability to request changes to approved expenses
- **Expense Reports**: Post-approval reporting with actual vs. approved amount tracking
- **Notes System**: Collaborative notes on expenses and reports
- **File Attachments**: Secure file uploads via Cloudinary with per-item attachments
- **Email Notifications**: Automated email notifications for all workflow events
- **Dashboard Analytics**: Real-time statistics and insights
- **CSV Export**: Data export capabilities for accounting and reporting
- **Account Management**: User approval workflow with email verification
- **Building Move Wish List**: Donor contribution system for church building projects

## User Roles & Permissions

### ADMIN
- **Full System Access**: Can view, approve, deny, and manage all expenses across all campuses
- **User Management**: Approve, deny, suspend, and reactivate user accounts
- **Payment Processing**: Mark expenses as paid, set payment dates, and track payment amounts
- **Account Tagging**: Assign expense types and accounts to expenses
- **Item Approvals**: Approve, deny, or request changes on individual expense items
- **Status Updates**: Update expense statuses and manage workflow transitions
- **Reports Management**: View and manage all expense reports
- **Dashboard Access**: Full analytics and statistics
- **CSV Export**: Export expense data for accounting purposes

### CAMPUS_PASTOR
- **Campus-Specific Access**: Can view and manage expenses for their assigned campus only
- **Expense Approvals**: Approve or deny expenses from their campus
- **Item Approvals**: Approve, deny, or request changes on expense items
- **Pastor Remarks**: Add remarks to expenses for their campus
- **Notes**: Add notes to expenses and reports
- **View Reports**: View expense reports for their campus
- **Dashboard Access**: View campus-specific statistics

### LEADER
- **Expense Submission**: Create and submit expense requests
- **Own Expense Management**: View and edit their own expenses (when status allows)
- **Change Requests**: Request changes to approved expenses
- **Report Creation**: Create expense reports for paid expenses
- **Notes**: Add notes to their expenses and reports
- **File Uploads**: Attach receipts and supporting documents
- **View Own Expenses**: Track status of their submitted expenses

## Expense Request Workflow

### Status Flow

1. **SUBMITTED** - Initial state when expense is created
   - Expense is visible to approvers
   - Can be edited by requester
   - Admins and Campus Pastors can approve/deny

2. **APPROVED** - Expense has been fully approved
   - All items approved
   - Ready for payment processing
   - Requester can request changes if needed

3. **DENIED** - Expense has been rejected
   - Includes denial reason
   - Cannot be edited or resubmitted

4. **CHANGE_REQUESTED** - Changes are required
   - Can be requested by approvers or requesters
   - Expense can be edited and resubmitted
   - Status resets to SUBMITTED after update

5. **PAID** - Expense has been marked as paid
   - Payment date and amount recorded
   - Can create expense reports
   - Tracks cumulative payment amounts

### Expense Request Features

- **Itemized Expenses**: Multiple items per request with individual descriptions, quantities, and prices
- **Admin Category**: Categorization for reporting and accounting
- **Team Assignment**: Expenses assigned to specific teams
- **Campus Assignment**: Expenses linked to specific campuses
- **Event Support**: Special fields for event-related expenses
- **File Attachments**: Required attachments per item (receipts, invoices, etc.)
- **Notes**: Collaborative notes throughout the workflow
- **Status History**: Complete audit trail of status changes

## Event Expenses

Special handling for expenses related to events:

- **Event Name**: Required field for event expenses
- **Event Date**: Date of the event
- **Full Event Budget**: Total budget allocated for the event
- **Budget Validation**: Sum of all items must equal the full event budget
- **Event Category**: Automatically categorized as "Special Events and Programs"

### Event Expense Rules

- If an expense has an event date, event name and full event budget are required
- The total of all expense items must exactly match the full event budget
- Visual indicators show the difference between items total and event budget
- Event expenses follow the same approval workflow as regular expenses

## Item-Level Approvals

### Granular Approval Control

- **Individual Item Approval**: Each item in an expense can be approved, denied, or marked for changes independently
- **Approved Amount Tracking**: Track approved amounts per item (useful for partial approvals)
- **Item Comments**: Approvers can add comments to individual items
- **Approval Status**: Items can have statuses: APPROVED, DENIED, PENDING, CHANGE_REQUESTED
- **Undo Approval**: Admins can undo item approvals if needed

### Item Approval Workflow

1. Expense is submitted with multiple items
2. Approvers review each item individually
3. Items can be:
   - **Approved**: Full amount or partial amount
   - **Denied**: With optional comment
   - **Change Requested**: Request modifications
4. Expense status updates based on item approvals:
   - All approved → APPROVED
   - All denied → DENIED
   - Changes requested → CHANGE_REQUESTED

## Change Requests

### Requesting Changes

- **From Requester**: Requesters can request changes to approved expenses to add more items
- **From Approver**: Approvers can request changes during the approval process
- **Status Transition**: Approved expenses move to CHANGE_REQUESTED status
- **Email Notifications**: Admins and Campus Pastors are notified of change requests
- **Item Preservation**: Existing items are preserved when adding new items

### Change Request Workflow

1. Requester clicks "Request Change" on an approved expense
2. Modal opens to add a comment explaining the change
3. Status changes to CHANGE_REQUESTED
4. Admins and Campus Pastors receive email notifications
5. Requester can edit the expense to add new items
6. Expense is resubmitted with both existing and new items
7. New items require approval

## Expense Reports

### Post-Approval Reporting

Expense reports are created after expenses are marked as paid to track actual spending:

- **Report Creation**: Create reports for paid expenses
- **Item Tracking**: Link report items to original expense items
- **Actual vs. Approved**: Track actual amounts spent vs. approved amounts
- **Refund Tracking**: Mark refund receipts separately
- **File Attachments**: Attach receipts and supporting documents per item
- **Notes**: Add notes to reports
- **Link to Expense**: Direct link back to original expense request

### Report Features

- **Approved Items**: Select which approved items to include in the report
- **Actual Amounts**: Enter actual amounts spent (may differ from approved)
- **Difference Calculation**: Automatic calculation of differences
- **Additional Payment**: Track if additional payment is needed
- **Refund Tracking**: Track if refund is required
- **Item Attachments**: Attach receipts per item
- **Refund Receipts**: Separate tracking for refund receipts

## Notes & Communication

### Notes System

- **Expense Notes**: Add notes to expense requests throughout the workflow
- **Report Notes**: Add notes to expense reports
- **Author Tracking**: Notes show author name, role, and timestamp
- **Color Coding**: Visual distinction by author role (Admin, Pastor, Requester)
- **Real-time Updates**: Notes appear immediately after adding
- **Permission-Based**: Only authorized users can add notes

### Pastor Remarks

- **Campus-Specific**: Campus Pastors can add remarks to expenses from their campus
- **One Remark Per Pastor**: Each pastor can have one remark per expense
- **Editable**: Remarks can be updated
- **Email Notifications**: Admins are notified when remarks are added

### Notes Features

- **Threaded Communication**: All notes visible in chronological order
- **Role-Based Display**: Color-coded by author role
- **Timestamps**: Full timestamp tracking
- **Link to Expense**: Report notes link back to original expense

## File Attachments

### Attachment System

- **Per-Item Attachments**: Each expense item can have multiple attachments
- **Required Attachments**: File uploads are required for each item
- **General Attachments**: Support for non-itemized expenses
- **File Types**: Supports JPG, PNG, PDF, Excel, CSV, ODS
- **File Size Limit**: Maximum 10MB per file
- **Cloudinary Integration**: Secure cloud storage via Cloudinary
- **View Attachments**: View attachments directly in the UI
- **Existing Attachments**: Previously uploaded files are preserved when editing

### Attachment Features

- **Receipt Upload**: Upload receipts, invoices, and supporting documents
- **Image Preview**: Image attachments show previews
- **Document Icons**: PDF and document files show appropriate icons
- **Download/View**: Click to view or download attachments
- **Attachment Management**: Remove attachments when editing expenses
- **Report Attachments**: Attach receipts to expense reports

## Email Notifications

### Automated Email Notifications

The system sends email notifications for various events:

#### Expense-Related Notifications

- **Expense Submitted**: Admins and Campus Pastors notified when new expenses are submitted
- **Expense Approved**: Requester notified when expense is approved
- **Expense Denied**: Requester notified with denial reason
- **Expense Updated**: Admins notified when expenses are updated
- **Change Requested**: Admins and Campus Pastors notified when changes are requested
- **Expense Paid**: Requester notified when expense is marked as paid

#### Report-Related Notifications

- **Report Created**: Admins notified when expense reports are created

#### User Account Notifications

- **Account Pending Approval**: Admins notified when new users register
- **Account Approved**: User notified when account is approved
- **Account Denied**: User notified if account registration is denied

#### Other Notifications

- **Pastor Remark Added**: Admins notified when pastors add remarks
- **Reminder Emails**: Periodic reminders for pending approvals

### Email Features

- **Rate Limiting**: Emails sent with rate limiting to avoid overwhelming email service
- **HTML Templates**: Professional HTML email templates
- **Plain Text Fallback**: Plain text versions for email clients
- **Action Links**: Direct links to relevant pages in emails
- **Error Handling**: Graceful error handling if email sending fails

## Dashboard & Analytics

### Dashboard Features

- **Real-Time Statistics**: Live updates of expense metrics
- **Status Breakdown**: Visual breakdown of expenses by status
- **Campus Overview**: Statistics per campus
- **Team Analytics**: Team-wise expense tracking
- **Time Period Filters**: Filter statistics by date ranges
- **Approval Metrics**: Track approval rates and times
- **Payment Tracking**: Monitor payment status

### Analytics Capabilities

- **Expense Trends**: Track expense trends over time
- **Category Analysis**: Analyze expenses by category
- **Approval Workflow**: Track items in each approval stage
- **Budget Tracking**: Monitor event budgets and spending

## Building Move Wish List

A simple, church-appropriate donor contribution system for building projects and special needs:

### Public Features

- **Browse Items**: Searchable, filterable list of needed items with images, descriptions, and prices
- **Item Details**: Detailed view with purchase links, progress tracking, and donation instructions
- **Donation Confirmation**: Secure form to confirm purchases and track contributions
- **Progress Tracking**: Real-time updates showing how many items still need donors
- **Shareable Links**: Easy sharing of specific items or the entire wish list

### Admin Features

- **Item Management**: Create, edit, and delete wish list items
- **Donation Tracking**: View all donation confirmations with donor details
- **Analytics Dashboard**: Track views, clicks, and conversion rates
- **Priority Management**: Set item priorities (High, Medium, Low) for display ordering
- **Category Organization**: Organize items by categories for easier browsing

### Key Features

- **No Payment Processing**: Links out to external retailers (Amazon, Home Depot, etc.)
- **Anonymous Donations**: Optional donor information to respect privacy
- **Rate Limiting**: Basic abuse prevention with IP-based rate limiting
- **Inventory Management**: Prevents over-donation with real-time stock tracking
- **Mobile-Friendly**: Responsive design optimized for mobile donation
- **Church-Appropriate**: Clean, professional design suitable for church websites

### Usage

#### Adding Items (Admin)

1. Navigate to `/admin/wishlist` (Admin only)
2. Click "Add New Item"
3. Fill in item details:
   - Title and description
   - Category and priority
   - Price (in cents)
   - Quantity needed
   - Purchase URL (Amazon, Home Depot, etc.)
   - Optional image URL
4. Mark as active to make it visible

#### Donation Process

1. Visitors browse `/dmv` to see all available items
2. Click any item to view details and purchase link
3. Purchase the item from the external retailer
4. Return to the site and click "I Gave This"
5. Fill out the confirmation form (optional donor info)
6. Receive thank you message with impact summary

#### Managing Confirmations (Admin)

1. Go to `/admin/wishlist`
2. Click "View" on any item to see confirmations
3. Review donor details and confirmation timestamps
4. Track progress toward fulfilling each item

### Technical Implementation

- **Database Tables**: `wishlist_items`, `wishlist_confirmations`
- **API Endpoints**: CRUD operations for items, confirmation submissions
- **Authentication**: Admin-only access to management features
- **Analytics**: Basic event tracking (views, clicks, submissions)
- **Validation**: Server-side validation with inventory checks
- **Security**: Rate limiting and input sanitization

### Seed Data

The system provides separate seed commands for different data types:

#### System Data (Users, Settings)
```bash
npm run db:seed
```
Creates default users, roles, and system settings.

#### DMV Building Wish List
```bash
npm run db:dmv-seed
```
Adds all 20 CCI DMV building move items with proper categories and priorities.

## User Account Management

### Account Registration

- **Self-Registration**: Users can register themselves
- **Email Verification**: Email verification required before approval
- **Pending Approval**: New accounts start with PENDING_APPROVAL status
- **Admin Notification**: Admins automatically notified of new registrations
- **Role Assignment**: Users select their role during registration
- **Campus Assignment**: Users select their campus during registration

### Account Statuses

- **ACTIVE**: Account is active and can log in
- **PENDING_APPROVAL**: Account is waiting for admin approval
- **SUSPENDED**: Account is temporarily suspended

### Account Management Features

- **Approve Accounts**: Admins can approve pending accounts
- **Deny Accounts**: Admins can deny account registrations with reason
- **Suspend Accounts**: Admins can suspend active accounts
- **Reactivate Accounts**: Admins can reactivate suspended accounts
- **Profile Management**: Users can update their profiles
- **Password Management**: Secure password handling with Argon2id

## Tech Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe development
- **TailwindCSS**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Backend
- **Next.js API Routes**: Serverless API endpoints
- **Prisma ORM**: Type-safe database access
- **PostgreSQL**: Relational database
- **Zod**: Schema validation

### Authentication & Security
- **Argon2id**: Password hashing algorithm
- **Session Cookies**: HTTP-only, secure cookies
- **CSRF Protection**: Cross-site request forgery protection
- **Role-Based Access Control**: Granular permission system

### Third-Party Services
- **Cloudinary**: File storage and image processing
- **Resend**: Email delivery service
- **Twilio**: SMS notifications (optional)

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Cloudinary account
- Resend account (for email notifications)
- Twilio account (optional, for SMS)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cci
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/cci_expense"
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   
   # Resend (Email)
   RESEND_API_KEY="your-resend-api-key"
   FROM_EMAIL="noreply@yourchurch.com"
   
   # Twilio (Optional - SMS)
   TWILIO_ACCOUNT_SID="your-twilio-account-sid"
   TWILIO_AUTH_TOKEN="your-twilio-auth-token"
   TWILIO_PHONE_NUMBER="+1234567890"
   
   # App Settings
   NEXT_PUBLIC_APP_URL="http://localhost:3000"
   
   # Optional: Disable email notifications for development
   DISABLE_EMAIL_NOTIFICATIONS="false"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npx prisma generate

   # Push schema to database
   npx prisma db push

   # Seed with system data (users, settings)
   npm run db:seed

   # Seed with DMV Building Wish List items
   npm run db:dmv-seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## API Documentation

### Authentication Endpoints

- `POST /api/register` - Register new user account
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `GET /api/verify` - Verify email address
- `POST /api/set-password` - Set password after verification

### Expense Endpoints

- `GET /api/expenses` - List expenses (with filters: status, team, campus, search)
- `POST /api/expenses/create` - Create new expense request
- `PUT /api/expenses/update` - Update existing expense request
- `POST /api/expenses/approve` - Approve expense request
- `POST /api/expenses/deny` - Deny expense request
- `POST /api/expenses/mark-paid` - Mark expense as paid
- `POST /api/expenses/request-change` - Request changes to approved expense
- `POST /api/expenses/update-status` - Update expense status (Admin only)
- `POST /api/expenses/update-type` - Update expense type/account (Admin only)
- `POST /api/expenses/update-account` - Update expense account (Admin only)
- `POST /api/expenses/undo-approval` - Undo expense approval (Admin only)
- `GET /api/expenses/export-csv` - Export expenses to CSV

### Expense Item Endpoints

- `POST /api/expense-items/approve` - Approve individual expense item
- `POST /api/expense-items/deny` - Deny individual expense item
- `POST /api/expense-items/undo-approval` - Undo item approval (Admin only)

### Expense Notes Endpoints

- `GET /api/expenses/notes?expenseId={id}` - Get notes for an expense
- `POST /api/expenses/notes` - Add note to expense

### Pastor Remarks Endpoints

- `POST /api/expenses/pastor-remark` - Add or update pastor remark

### Report Endpoints

- `GET /api/reports` - List expense reports (Admin only)
- `POST /api/reports/create` - Create expense report
- `GET /api/reports/notes?reportId={id}` - Get notes for a report
- `POST /api/reports/notes` - Add note to report

### User Management Endpoints

- `GET /api/users` - List users (Admin only)
- `POST /api/users/approve` - Approve pending user account
- `POST /api/users/deny` - Deny user account registration
- `POST /api/users/suspend` - Suspend user account
- `POST /api/users/reactivate` - Reactivate suspended account

### Profile Endpoints

- `GET /api/profile` - Get current user profile
- `POST /api/profile/update` - Update user profile

### File Upload Endpoints

- `POST /api/uploads/cloudinary-sign` - Get Cloudinary upload signature

### Dashboard Endpoints

- `GET /api/dashboard/stats` - Get dashboard statistics

### Building Wish List Endpoints

- `GET /api/dmv/wishlist` - Get all active wish list items
- `POST /api/dmv/wishlist/[id]/confirm` - Submit donation confirmation
- `GET /api/admin/wishlist` - Get all wish list items (Admin only)
- `POST /api/admin/wishlist` - Create new wish list item (Admin only)
- `PUT /api/admin/wishlist/[id]` - Update wish list item (Admin only)
- `DELETE /api/admin/wishlist/[id]` - Delete wish list item (Admin only)
- `GET /api/admin/wishlist/[id]/confirmations` - Get confirmations for item (Admin only)

## Deployment

### Environment Setup

Ensure all environment variables are set in your production environment:

```bash
DATABASE_URL="your-production-database-url"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
RESEND_API_KEY="your-resend-api-key"
FROM_EMAIL="noreply@yourchurch.com"
NEXT_PUBLIC_APP_URL="https://your-domain.com"
```

### Database Migration

```bash
# Generate Prisma client
npx prisma generate

# Push schema to production database
npx prisma db push

# Or use migrations for production
npx prisma migrate deploy

# Seed system data (users, settings)
npm run db:seed

# Seed DMV Building Wish List (optional)
npm run db:dmv-seed
```

### Build and Deploy

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── expenses/      # Expense-related endpoints
│   │   ├── reports/       # Report-related endpoints
│   │   ├── users/         # User management endpoints
│   │   └── ...
│   ├── dashboard/         # Dashboard page
│   ├── expenses/          # Expenses page
│   ├── reports/           # Reports page
│   ├── users/             # User management page
│   ├── profile/           # User profile page
│   ├── login/             # Login page
│   ├── register/          # Registration page
│   └── verify/            # Email verification page
├── components/            # React components
│   ├── ui/               # Reusable UI components
│   ├── expenses-list.tsx # Main expenses list component
│   ├── expense-form.tsx   # Expense creation/editing form
│   ├── report-form.tsx    # Expense report form
│   └── ...
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication logic
│   ├── rbac.ts          # Role-based access control
│   ├── db.ts            # Database client
│   ├── email.ts         # Email notification functions
│   ├── cloudinary.ts    # File upload handling
│   ├── constants.ts     # Application constants
│   └── utils.ts         # Utility functions
└── styles/              # Global styles
```

## Security Features

- **Password Hashing**: Argon2id algorithm for secure password storage
- **Session Management**: HTTP-only, secure cookies for session management
- **CSRF Protection**: Protection against cross-site request forgery
- **Input Validation**: Zod schemas for all API inputs
- **Role-Based Access Control**: Granular permissions based on user roles
- **SQL Injection Prevention**: Prisma ORM with parameterized queries
- **XSS Protection**: React's built-in XSS protection
- **File Upload Security**: File type and size validation

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or open an issue in the repository.

---

**Built with ❤️ for CCI Church Operations**
