-- SB Reliance Pte Ltd – MOCK DATA (all names, reviews and amounts are fictional)
-- Import:  mysql -u root -p sbreliance < sql/samples/mock-data.sql
-- Or paste into phpMyAdmin / MySQL Workbench. Run once (quotes and testimonials are not de-duplicated).
USE sbreliance;

-- OPTIONAL: replace the old painting-only services with the 8 SB Reliance services.
-- Uncomment these lines if your services table still has the old seed data.
-- DELETE FROM services;
-- INSERT INTO services (title, description, sort_order) VALUES
-- ('ACMV System Installation', 'Design-aligned installation of air-conditioning and mechanical ventilation systems for commercial and industrial buildings.', 1),
-- ('Air-Condition Installation', 'Supply and installation of split and multi-split air-conditioners for homes, shops and offices.', 2),
-- ('Electrical', 'Electrical wiring, distribution boards, lighting and power works for new fit-outs and renovations.', 3),
-- ('CCTV', 'CCTV camera supply, installation and cabling for homes, offices and commercial premises.', 4),
-- ('Ceiling Partition', 'Partitions and false ceilings that reshape the layout of offices, shops and homes.', 5),
-- ('Painting', 'Interior and exterior painting for residential and commercial spaces.', 6),
-- ('Tiles', 'Floor and wall tiling, including preparation and finishing.', 7),
-- ('General Building Contractor', 'Building and renovation works managed from planning to handover.', 8);

-- ---------- Quote requests (mixed statuses) ----------
INSERT INTO quotes (name, whatsapp, address, house_type, service_type, addons, preferred_date, message, status, quoted_amount, notes, created_at) VALUES
('Daniel Koh',      '+65 9123 4501', 'Blk 215 Tampines St 23, Singapore 520215', 'HDB',  'Air-Condition Installation', '["Electrical"]',                 '2026-10-24', 'Need 3 split units installed in a 4-room flat.', 'new',       NULL,     NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
('Aisha Rahman',    '+65 9234 5602', '12 Jalan Kembangan, Singapore 419456',     'Landed','CCTV',                       '["Electrical"]',                 '2026-10-28', '6 cameras for front and back of the house.',       'new',       NULL,     NULL, DATE_SUB(NOW(), INTERVAL 2 DAY)),
('Tan Wei Ming',    '+65 9345 6703', '1 Raffles Link #05-02, Singapore 039393',  'Office','ACMV System Installation',   '["Electrical","Ceiling Partition"]', '2026-11-10', 'New office fit-out, about 2,500 sqft.',        'contacted', NULL,     'Called on Monday, site visit to be arranged.', DATE_SUB(NOW(), INTERVAL 4 DAY)),
('Priya Nair',      '+65 9456 7804', '88 Yishun Ave 5 #10-114, Singapore 760088','HDB',  'Painting',                    '["Tiles"]',                      '2026-11-02', 'Whole flat repaint, plus re-tile the kitchen floor.','contacted', NULL,     'Asked for photos of the walls.', DATE_SUB(NOW(), INTERVAL 5 DAY)),
('Lim Chee Keong',  '+65 9567 8905', '30 Woodlands Loop, Singapore 738318',      'Factory / Warehouse','ACMV System Installation','["Electrical"]',         '2026-11-15', 'Ventilation upgrade for a production floor.',     'scheduled', 48500.00, 'Site visit done. Works start mid-November.', DATE_SUB(NOW(), INTERVAL 9 DAY)),
('Fatimah Ismail',  '+65 9678 9006', 'Blk 402 Bedok North Ave 2, Singapore 460402','HDB','Ceiling Partition',          '["Painting","Electrical"]',      '2026-10-30', 'False ceiling in living room and one partition wall.','scheduled', 6200.00,  'Deposit received.', DATE_SUB(NOW(), INTERVAL 10 DAY)),
('Marcus Teo',      '+65 9789 0107', '7 Kallang Way #02-01, Singapore 349272',   'Retail Shop','Electrical',            '["CCTV"]',                       '2026-10-20', 'Rewiring and new DB for a small retail unit.',    'scheduled', 9800.00,  NULL, DATE_SUB(NOW(), INTERVAL 11 DAY)),
('Grace Ong',       '+65 9890 1208', '25 Jalan Jurong Kechil, Singapore 596147', 'Condo','Tiles',                       '["Painting"]',                   '2026-09-25', 'Bathroom and balcony retiling.',                  'completed', 7400.00,  'Handover signed.', DATE_SUB(NOW(), INTERVAL 21 DAY)),
('Ravi Chandran',   '+65 9901 2309', '19 Pasir Ris Drive 6, Singapore 519419',   'Landed','General Building Contractor','["Electrical","Painting","Tiles"]','2026-09-10', 'Rear extension and interior refresh.',          'completed', 86000.00, 'Completed on schedule.', DATE_SUB(NOW(), INTERVAL 35 DAY)),
('Sarah Lee',       '+65 9012 3410', 'Blk 118 Toa Payoh Lor 1, Singapore 310118','HDB',  'Air-Condition Installation',  '[]',                             '2026-09-18', 'Two bedroom units.',                              'completed', 3150.00,  NULL, DATE_SUB(NOW(), INTERVAL 28 DAY)),
('Kelvin Ng',       '+65 9123 5511', '60 Paya Lebar Rd #08-03, Singapore 409051','Office','CCTV',                       '["Electrical"]',                 NULL,         'Wanted a quote only, going with another vendor.', 'cancelled', NULL,     'Customer declined.', DATE_SUB(NOW(), INTERVAL 15 DAY)),
('Nur Aini',        '+65 9234 6612', '5 Sengkang East Way, Singapore 548970',    'Condo','Painting',                    '[]',                             '2026-11-05', 'Unit repaint before moving in.',                  'new',       NULL,     NULL, NOW());

-- ---------- Testimonials (sample text, replace with real reviews before going live) ----------
INSERT INTO testimonials (name, location, text) VALUES
('Daniel K.', 'Tampines', 'The aircon installation was neat and finished within the day. They explained the scope and price clearly before starting.'),
('Aisha R.',  'Kembangan', 'Our CCTV setup was well planned, cables were hidden properly and the team showed us how to use the app.'),
('Marcus T.', 'Kallang',   'Good communication throughout the electrical rewiring. Site was left clean and the work passed inspection.'),
('Grace O.',  'Jurong',    'Tiling and painting were coordinated by one team, which saved us a lot of back and forth.');

-- ---------- Blog posts ----------
INSERT IGNORE INTO posts (title, slug, excerpt, content) VALUES
('How often should an air-conditioner be serviced?', 'how-often-service-air-conditioner',
 'Regular servicing keeps cooling efficient and avoids breakdowns. Here is a simple schedule for homes and offices.',
 'Most homes benefit from a chemical or general service every three to six months, depending on usage. Offices and shops that run units all day should service more often.\n\nSigns your unit needs attention: weak cooling, water leaks, unusual noise, or a musty smell. Servicing the filters and coils early is cheaper than repairing a failed compressor.'),
('What to know before installing CCTV at your office', 'before-installing-cctv-office',
 'Camera count, placement, storage and cabling all affect the final cost. A short checklist before you request a quote.',
 'Start by listing the areas that need coverage: entrances, cash counters, storage rooms and carparks. Decide how many days of recording you need, because this drives storage size.\n\nAsk about cabling routes, night-vision range, remote viewing, and who will maintain the system after handover.'),
('Ceiling partition or hacking: which suits your layout?', 'ceiling-partition-vs-hacking',
 'Changing a layout does not always mean breaking walls. Compare the two approaches by cost, time and mess.',
 'Light partitions and false ceilings are faster, cleaner and easier to change later. Hacking is better when you need permanent structural changes or a fully open space.\n\nFor offices and retail units, a partition system often gets you operating sooner. A site visit will confirm what is possible in your unit.');
