# CCI Expense app

A production-ready expense management system for church operations built with Next.js 14, TypeScript, and PostgreSQL.

## Features

### Core Functionality
- **User Management**: Role-based access control (ADMIN, CAMPUS_PASTOR, LEADER)
- **Expense Requests**: Submit, approve, deny, and track expense requests
- **Team Management**: Organize users into teams for expense tracking
- **File Attachments**: Upload receipts via Cloudinary integration
- **Notifications**: Email and SMS notifications for status changes
- **Reporting**: CSV export and dashboard analytics

### User Roles
- **ADMIN**: Full system access, can approve/deny all requests, mark as paid
- **CAMPUS_PASTOR**: Can approve/deny requests, manage teams, view all expenses
- **LEADER**: Can submit expense requests, view their own requests

### Expense Workflow
1. **SUBMITTED**: Initial state when expense is created
2. **APPROVED**: Approved by campus pastor or admin
3. **DENIED**: Rejected with reason
4. **PAID**: Marked as paid by admin

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, Radix UI
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: Self-implemented with Argon2id + session cookies
- **File Storage**: Cloudinary
- **Email**: Resend
- **SMS**: Twilio
- **Charts**: Lightweight SVG/Canvas (no heavy chart libraries)

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Cloudinary account
- Resend account (optional)
- Twilio account (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd church-expense-mvp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/church_expense_mvp"
   
   # Auth (Custom implementation - no NextAuth needed)
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME="your-cloud-name"
   CLOUDINARY_API_KEY="your-api-key"
   CLOUDINARY_API_SECRET="your-api-secret"
   
   # Resend (optional)
   RESEND_API_KEY="your-resend-api-key"
   FROM_EMAIL="noreply@yourchurch.com"
   
   # Twilio (optional)
   TWILIO_ACCOUNT_SID="your-twilio-account-sid"
   TWILIO_AUTH_TOKEN="your-twilio-auth-token"
   TWILIO_PHONE_NUMBER="+1234567890"
   
   # App Settings
   NEXT_PUBLIC_APP_URL="https://your-domain.com"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # Seed with initial data
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Access the application**
   Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Users
After seeding, you can log in with these default accounts:
- **Admin**: admin@church.com / admin123
- **Pastor**: pastor@church.com / pastor123
- **Leader**: leader@church.com / leader123

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication routes
│   ├── api/               # API routes
│   ├── expenses/          # Expense management pages
│   └── teams/             # Team management pages
├── components/            # React components
│   └── ui/               # Reusable UI components
├── lib/                  # Utility libraries
│   ├── auth.ts          # Authentication logic
│   ├── rbac.ts          # Role-based access control
│   ├── cloudinary.ts    # File upload handling
│   ├── email.ts         # Email notifications
│   ├── sms.ts           # SMS notifications
│   └── csv.ts           # CSV export functionality
└── styles/              # Global styles
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/verify` - Verify email address
- `POST /api/auth/set-password` - Set password after verification
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Expenses
- `GET /api/expenses` - List expenses (with filters)
- `POST /api/expenses/create` - Create new expense request
- `POST /api/expenses/approve` - Approve expense request
- `POST /api/expenses/deny` - Deny expense request
- `POST /api/expenses/mark-paid` - Mark expense as paid
- `GET /api/expenses/export-csv` - Export expenses to CSV

### Teams
- `GET /api/teams` - List all teams
- `POST /api/teams` - Create new team
- `POST /api/teams/members` - Add member to team
- `DELETE /api/teams/members` - Remove member from team

### File Uploads
- `POST /api/uploads/cloudinary-sign` - Get Cloudinary upload signature

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

## Deployment

### Heroku Deployment

1. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

2. **Add PostgreSQL addon**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

3. **Set environment variables**
   ```bash
   heroku config:set DATABASE_URL="your-postgres-url"
   heroku config:set NEXT_PUBLIC_APP_URL="https://your-app.herokuapp.com"
   heroku config:set RESEND_API_KEY="your-resend-api-key"
   heroku config:set CLOUDINARY_CLOUD_NAME="your-cloud-name"
   heroku config:set CLOUDINARY_API_KEY="your-api-key"
   heroku config:set CLOUDINARY_API_SECRET="your-api-secret"
   # ... set other environment variables
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

5. **Run database migrations**
   ```bash
   heroku run npm run db:push
   heroku run npm run db:seed
   ```

### Scheduled Tasks

Set up Heroku Scheduler to run reminder notifications:

```bash
# Add to Heroku Scheduler
npm run reminders
```

Schedule to run daily at 9 AM.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with initial data
- `npm run reminders` - Send reminder notifications

### Database Management

```bash
# View database in Prisma Studio
npm run db:studio

# Reset database (careful!)
npx prisma db push --force-reset
npm run db:seed
```

## Security Features

- **CSRF Protection**: All state-changing operations require CSRF tokens
- **Password Hashing**: Argon2id for secure password storage
- **Session Management**: Secure HTTP-only cookies
- **Role-Based Access**: Granular permissions based on user roles
- **Input Validation**: Zod schemas for all API inputs

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
