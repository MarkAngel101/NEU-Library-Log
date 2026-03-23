# NEU Library Visitor Log

A secure, modern, and responsive visitor logging system for the NEU Library. Built with React, Tailwind CSS, and Supabase.

## 🚀 Live Deployment
[View Live App](https://neu-library-log-lemon.vercel.app/)

## ✨ Features
- **Google Authentication**: Secure login via Google OAuth.
- **Role-Based Access Control (RBAC)**:
  - **Regular User**: Log library visits with details (Name, College, Reason, Status).
  - **Admin**: Access a comprehensive dashboard with real-time statistics and filters.
- **Admin Dashboard**:
  - Statistics cards for Total Visitors, Colleges, Top Reasons, and Employee counts.
  - Interactive charts (Bar & Pie) using Recharts.
  - Dynamic filtering by Date Range, College, Reason, and Status.
  - CSV Export for visitor data.
- **Dark Mode**: Toggle between light and dark themes.
- **Responsive Design**: Fully functional on mobile and desktop.

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Motion
- **Charts**: Recharts
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth (Google OAuth)

## ⚙️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/neu-library-visitor-log.git
cd neu-library-visitor-log
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Database Setup
Run the following SQL in your Supabase SQL Editor to create the necessary table:

```sql
create table visitor_logs (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  college text not null,
  reason text not null,
  employee_status text not null,
  visit_date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security
alter table visitor_logs enable row level security;

-- Create policies
create policy "Allow public insert" on visitor_logs for insert with check (true);
create policy "Allow authenticated select" on visitor_logs for select using (auth.role() = 'authenticated');
```

### 5. Run the application
```bash
npm run dev
```

## 🔐 Admin Account
The system identifies the admin based on the email address.
- **Admin Email**: `jcesperanza@neu.edu.ph`
- **Test Account**: Use the email above to access admin features.

## 📝 License
This project is licensed under the Apache-2.0 License.
