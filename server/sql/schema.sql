
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);
CREATE TABLE IF NOT EXISTS quotes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  whatsapp VARCHAR(40) NOT NULL,
  address VARCHAR(255) NOT NULL,
  house_type VARCHAR(80) NOT NULL,
  service_type VARCHAR(120) NOT NULL,
  addons JSON NULL,
  preferred_date DATE NULL,
  message TEXT NULL,
  status ENUM('new','contacted','scheduled','completed','cancelled') NOT NULL DEFAULT 'new',
  quoted_amount DECIMAL(10,2) NULL,
  notes TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content MEDIUMTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS testimonials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  location VARCHAR(120) NOT NULL,
  text TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  data MEDIUMTEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gallery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL DEFAULT '',
  image_url VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS team (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  role VARCHAR(150) NOT NULL,
  bio TEXT NULL,
  image_url VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS employees (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  id_number VARCHAR(20) NULL,
  pass_type VARCHAR(10) NOT NULL DEFAULT 'WP',
  date_of_birth CHAR(10) NULL,
  designation VARCHAR(120) NULL,
  join_date CHAR(10) NULL,
  basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  fixed_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  ot_rate DECIMAL(8,2) NULL,
  monthly_levy DECIMAL(10,2) NOT NULL DEFAULT 0,
  bank_name VARCHAR(80) NULL,
  bank_account VARCHAR(40) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  notes TEXT NULL
);

CREATE TABLE IF NOT EXISTS payroll_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  period CHAR(7) NOT NULL,
  employee_id INT NOT NULL,
  employee_name VARCHAR(150) NOT NULL,
  pass_type VARCHAR(10) NOT NULL,
  designation VARCHAR(120) NULL,
  basic_salary DECIMAL(10,2) NOT NULL DEFAULT 0,
  fixed_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_allowance DECIMAL(10,2) NOT NULL DEFAULT 0,
  ot_hours DECIMAL(6,2) NOT NULL DEFAULT 0,
  ot_rate DECIMAL(8,2) NOT NULL DEFAULT 0,
  ot_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  bonus DECIMAL(10,2) NOT NULL DEFAULT 0,
  unpaid_leave DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_deduction DECIMAL(10,2) NOT NULL DEFAULT 0,
  deduction_note VARCHAR(255) NULL,
  gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  cpf_employee DECIMAL(10,2) NOT NULL DEFAULT 0,
  cpf_employer DECIMAL(10,2) NOT NULL DEFAULT 0,
  cpf_manual TINYINT(1) NOT NULL DEFAULT 0,
  sdl DECIMAL(8,2) NOT NULL DEFAULT 0,
  levy DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  note VARCHAR(255) NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'draft',
  paid_on CHAR(10) NULL,
  payment_mode VARCHAR(40) NULL,
  UNIQUE KEY period_employee (period, employee_id)
);

-- Daily attendance (Admin > Payroll > Attendance). OT hours and unpaid days feed the monthly payroll.
CREATE TABLE IF NOT EXISTS attendance (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_id INT NOT NULL,
  work_date CHAR(10) NOT NULL,
  status VARCHAR(4) NOT NULL DEFAULT 'P',
  time_in CHAR(5) NULL,
  time_out CHAR(5) NULL,
  ot_hours DECIMAL(5,2) NOT NULL DEFAULT 0,
  note VARCHAR(120) NULL,
  UNIQUE KEY employee_day (employee_id, work_date)
);

-- Payroll rules that are not public (unlike settings): work week and normal hours per day
CREATE TABLE IF NOT EXISTS payroll_config (
  id INT PRIMARY KEY,
  data TEXT NOT NULL
);
