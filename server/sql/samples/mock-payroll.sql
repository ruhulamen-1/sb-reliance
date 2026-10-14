-- SB Reliance – DUMMY PAYROLL DATA: 20 fictional employees for testing Admin > Payroll.
-- All names, dates and amounts are made up. No NRIC/FIN or bank details are included.
-- Needs the latest version deployed first (the payroll tables and columns are created when the app starts).
-- Import: phpMyAdmin > your database > Import > choose this file > Import
--         (or: mysql -u USER -p DATABASE < mock-payroll.sql)
-- Remove later (also removes their attendance and payroll lines):
--   DELETE FROM attendance WHERE employee_id IN (SELECT id FROM employees WHERE notes = 'DUMMY DATA');
--   DELETE FROM payroll_items WHERE employee_id IN (SELECT id FROM employees WHERE notes = 'DUMMY DATA');
--   DELETE FROM employees WHERE notes = 'DUMMY DATA';

INSERT INTO employees (name, pass_type, date_of_birth, designation, join_date, pay_basis, daily_rate, transport, basic_salary, fixed_allowance, ot_rate, monthly_levy, active, notes) VALUES
-- Work Permit: daily-rated like the company payslip (days x rate, Sunday/PH x2, transport $150); no CPF, levy paid by the company
('Md Karim Hossain',      'WP',    '1992-03-14', 'Aircon Technician',      '2023-02-01', 'daily', 34.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Rafiqul Islam',         'WP',    '1989-07-22', 'Electrician',            '2022-06-15', 'daily', 36.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Shahin Alam',           'WP',    '1995-11-05', 'General Worker',         '2024-01-10', 'daily', 28.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Jahid Hasan',           'WP',    '1997-01-30', 'Painter',                '2024-04-01', 'daily', 30.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Mizanur Rahman',        'WP',    '1990-09-18', 'Tiler',                  '2021-09-01', 'daily', 32.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Sumon Mia',             'WP',    '1998-05-02', 'Helper',                 '2025-03-01', 'daily', 26.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Arjun Selvam',          'WP',    '1993-12-11', 'Ceiling & Partition Installer', '2022-11-01', 'daily', 32.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Ravi Kumar Murugan',    'WP',    '1991-04-25', 'CCTV Technician',        '2023-07-17', 'daily', 35.00, 150.00, 0.00, 0.00, 6.50, 650.00, 1, 'DUMMY DATA'),
('Liu Jianguo',           'WP',    '1986-08-08', 'Plasterer',              '2020-05-04', 'daily', 36.00, 150.00, 0.00, 0.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Kyaw Zin Htet',         'WP',    '1996-02-19', 'General Worker',         '2025-06-02', 'daily', 27.00, 150.00, 0.00, 0.00, NULL, 650.00, 0, 'DUMMY DATA'),
-- S Pass (no CPF; levy paid by the company)
('Nazmul Ahsan',          'SPASS', '1988-10-03', 'Site Supervisor',        '2021-03-01', 'monthly', 0.00, 0.00, 3300.00, 300.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Prakash Natarajan',     'SPASS', '1985-06-27', 'ACMV Supervisor',        '2020-08-03', 'monthly', 0.00, 0.00, 3600.00, 300.00, NULL, 650.00, 1, 'DUMMY DATA'),
('Wang Xiaoming',         'SPASS', '1990-01-15', 'Electrical Supervisor',  '2022-02-14', 'monthly', 0.00, 0.00, 3400.00, 250.00, NULL, 650.00, 1, 'DUMMY DATA'),
-- Employment Pass (no CPF, no levy)
('Anisur Rahman Chowdhury','EP',   '1982-12-20', 'Project Manager',        '2019-10-01', 'monthly', 0.00, 0.00, 6200.00, 500.00, NULL, 0.00, 1, 'DUMMY DATA'),
-- Singapore Citizens (CPF by age)
('Tan Wei Ming',          'SC',    '1979-04-09', 'Operations Manager',     '2018-01-02', 'monthly', 0.00, 0.00, 5200.00, 300.00, NULL, 0.00, 1, 'DUMMY DATA'),
('Siti Nurhaliza Binte Ahmad','SC','1994-08-30', 'Admin Executive',        '2023-05-15', 'monthly', 0.00, 0.00, 2900.00, 100.00, NULL, 0.00, 1, 'DUMMY DATA'),
('Lim Ah Kow',            'SC',    '1966-02-11', 'Driver',                 '2017-07-01', 'monthly', 0.00, 0.00, 2600.00, 200.00, NULL, 0.00, 1, 'DUMMY DATA'),
('Muhammad Faizal Bin Osman','SC', '1970-11-02', 'Safety Coordinator',     '2020-09-01', 'monthly', 0.00, 0.00, 3800.00, 200.00, NULL, 0.00, 1, 'DUMMY DATA'),
-- Permanent Residents
('Chen Li Hua',           'PR3',   '1987-03-03', 'Accounts Executive',     '2021-04-01', 'monthly', 0.00, 0.00, 3500.00, 150.00, NULL, 0.00, 1, 'DUMMY DATA'),
('Rajesh Pillai',         'PR12',  '1993-07-07', 'Estimator',              '2025-08-01', 'monthly', 0.00, 0.00, 3200.00, 150.00, NULL, 0.00, 1, 'DUMMY DATA');
