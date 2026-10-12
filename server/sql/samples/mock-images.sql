-- SB Reliance – MOCK IMAGES (placeholder SVGs in server/uploads). Safe to re-run.
-- Import:  mysql -u root -p sbreliance < sql/samples/mock-images.sql
USE sbreliance;

UPDATE services SET image_url='/uploads/mock-svc-1.svg' WHERE title='ACMV System Installation';
UPDATE services SET image_url='/uploads/mock-svc-2.svg' WHERE title='Air-Condition Installation';
UPDATE services SET image_url='/uploads/mock-svc-3.svg' WHERE title='Electrical';
UPDATE services SET image_url='/uploads/mock-svc-4.svg' WHERE title='CCTV';
UPDATE services SET image_url='/uploads/mock-svc-5.svg' WHERE title='Ceiling Partition';
UPDATE services SET image_url='/uploads/mock-svc-6.svg' WHERE title='Painting';
UPDATE services SET image_url='/uploads/mock-svc-7.svg' WHERE title='Tiles';
UPDATE services SET image_url='/uploads/mock-svc-8.svg' WHERE title='General Building Contractor';

UPDATE posts SET image_url='/uploads/mock-post-1.svg' WHERE slug='how-often-service-air-conditioner';
UPDATE posts SET image_url='/uploads/mock-post-2.svg' WHERE slug='before-installing-cctv-office';
UPDATE posts SET image_url='/uploads/mock-post-3.svg' WHERE slug='ceiling-partition-vs-hacking';

INSERT INTO gallery (title, image_url) SELECT 'Split-unit aircon installation', '/uploads/mock-gallery-1.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-1.svg');
INSERT INTO gallery (title, image_url) SELECT 'CCTV camera installation', '/uploads/mock-gallery-2.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-2.svg');
INSERT INTO gallery (title, image_url) SELECT 'Office ceiling partition', '/uploads/mock-gallery-3.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-3.svg');
INSERT INTO gallery (title, image_url) SELECT 'Electrical DB board works', '/uploads/mock-gallery-4.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-4.svg');
INSERT INTO gallery (title, image_url) SELECT 'Bathroom tiling', '/uploads/mock-gallery-5.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-5.svg');
INSERT INTO gallery (title, image_url) SELECT 'Interior painting', '/uploads/mock-gallery-6.svg' FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM gallery WHERE image_url='/uploads/mock-gallery-6.svg');

-- Hero image (merges into saved settings, creates the row if missing)
INSERT INTO settings (id, data) VALUES (1, '{"hero_image":"/uploads/mock-hero.svg"}')
  ON DUPLICATE KEY UPDATE data = JSON_SET(data, '$.hero_image', '/uploads/mock-hero.svg');
