-- SB Reliance – REAL ACMV PHOTOS (server/uploads/acmv-*.jpg). Safe to re-run.
-- Import:  mysql -u root -p sbreliance < sql/samples/real-images.sql
USE sbreliance;

UPDATE services SET image_url='/uploads/acmv-3.jpg' WHERE title='ACMV System Installation';
UPDATE services SET image_url='/uploads/acmv-5.jpg' WHERE title='Air-Condition Installation';

-- remove the placeholder gallery items from mock-images.sql
DELETE FROM gallery WHERE image_url LIKE '/uploads/mock-gallery-%';

INSERT INTO gallery (title, image_url) SELECT 'Rooftop condenser unit inspection', '/uploads/acmv-1.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-1.jpg');
INSERT INTO gallery (title, image_url) SELECT 'Exposed ductwork and diffusers', '/uploads/acmv-2.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-2.jpg');
INSERT INTO gallery (title, image_url) SELECT 'Ceiling ductwork installation', '/uploads/acmv-3.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-3.jpg');
INSERT INTO gallery (title, image_url) SELECT 'Outdoor unit installation team', '/uploads/acmv-5.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-5.jpg');
INSERT INTO gallery (title, image_url) SELECT 'Rooftop condenser units on site', '/uploads/acmv-6.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-6.jpg');
INSERT INTO gallery (title, image_url) SELECT 'VRF outdoor units monitoring', '/uploads/acmv-7.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-7.jpg');
INSERT INTO gallery (title, image_url) SELECT 'Refrigerant piping and ducting at site', '/uploads/acmv-8.jpg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/acmv-8.jpg');
