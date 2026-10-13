// Starting copy for the built-in services, keyed by their original titles.
// Used once: when a service has no slug yet (first start, or a database from before service pages),
// its empty slug / page text / FAQ / Google title / Google description are filled from here.
// Everything stays editable in Admin > Services.
// Page text: one paragraph per line, a line starting with "# " is a heading. FAQ: one per line, "Question | Answer".

export interface ServiceDefault { slug: string; seo_title: string; seo_description: string; content: string; faq: string }

const QUOTE_FAQ = 'How do I get a quotation? | Send us a WhatsApp message or the quote form with your address and the work you need. We arrange a site visit and send you a written quotation.';

export const SERVICE_DEFAULTS: Record<string, ServiceDefault> = {
  'ACMV System Installation': {
    slug: 'acmv-installation-singapore',
    seo_title: 'ACMV Installation Singapore – Commercial & Industrial | SB Reliance',
    seo_description: 'ACMV and mechanical ventilation installation for offices, shops, factories and warehouses in Singapore. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd installs air-conditioning and mechanical ventilation (ACMV) systems for offices, retail units, factories, warehouses and other commercial and industrial buildings across Singapore.',
      '# What we handle',
      'Installation of air-conditioning units, ducting, fresh-air and exhaust fans, piping, drainage and the related electrical works, carried out to the approved layout for your building.',
      '# How the job runs',
      'We visit the site, go through the drawings or your requirements and agree the scope with you. You receive a written quotation and timeline before any work starts, and we test the system with you before handover.',
    ].join('\n'),
    faq: [
      'Do you work on commercial and industrial buildings? | Yes. ACMV works are mainly for offices, shops, factories, warehouses and other commercial and industrial premises in Singapore.',
      'Can you combine ACMV with electrical and ceiling works? | Yes. We also do electrical, ceiling partition and finishing works, so one contractor can handle the whole fit-out.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  'Air-Condition Installation': {
    slug: 'aircon-installation-singapore',
    seo_title: 'Aircon Installation Singapore – HDB, Condo & Office | SB Reliance',
    seo_description: 'Aircon installation in Singapore for HDB flats, condos, landed homes, shops and offices. Split and multi-split systems. WhatsApp for a quote.',
    content: [
      'SB Reliance Pte Ltd supplies and installs air-conditioners for HDB flats, condominiums, landed homes, shops and offices across Singapore.',
      '# Systems we install',
      'Wall-mounted single split units and multi-split systems (System 1, 2, 3 and 4), including copper piping, trunking, drainage and the electrical connection to each unit.',
      '# How the job runs',
      'We visit your home or premises, check where the indoor and outdoor units can go and give you a written quotation for the exact scope. After installation we test every unit with you and hand over only when it is cooling properly.',
    ].join('\n'),
    faq: [
      'Do you install aircon in HDB flats and condos? | Yes. We install split and multi-split systems in HDB flats, condos, landed homes and commercial units across Singapore.',
      'Can you replace my old aircon system? | Yes. We remove the old units and install the new system, reusing or replacing piping and trunking as your site needs.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Electrical: {
    slug: 'electrical-contractor-singapore',
    seo_title: 'Electrical Contractor Singapore – Wiring & DB Works | SB Reliance',
    seo_description: 'Electrical wiring, distribution boards, lighting and power points for homes, offices and shops in Singapore. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd carries out electrical works for homes, offices, shops and commercial premises across Singapore.',
      '# What we handle',
      'New wiring and rewiring, distribution boards, lighting, power points, isolators for air-conditioners and other appliances, and electrical works for renovations and new fit-outs.',
      '# How the job runs',
      'We check the site, agree the scope and give you a written quotation before work starts. Works are tested before handover.',
    ].join('\n'),
    faq: [
      'Do you do electrical works for renovations? | Yes. We handle wiring, lighting and power points for home renovations and office or shop fit-outs.',
      'Can you add power points or lighting to an existing unit? | Yes. Tell us what you need and we will check the site and quote for it.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  CCTV: {
    slug: 'cctv-installation-singapore',
    seo_title: 'CCTV Installation Singapore – Home, Office & Shop | SB Reliance',
    seo_description: 'CCTV camera supply and installation in Singapore for homes, offices, shops and warehouses, including cabling and recorder setup.',
    content: [
      'SB Reliance Pte Ltd supplies and installs CCTV systems for homes, offices, shops, warehouses and other commercial premises across Singapore.',
      '# What we handle',
      'Camera supply and mounting, cabling, recorder setup and viewing on your phone, planned around the areas you want to cover.',
      '# How the job runs',
      'We visit the site, agree the camera positions with you and give you a written quotation. After installation we check every camera with you before handover.',
    ].join('\n'),
    faq: [
      'Can I view the cameras on my phone? | Yes. We set up the recorder so you can view the cameras on your phone.',
      'Do you install CCTV for homes as well as businesses? | Yes. We install CCTV for HDB flats, condos, landed homes, offices, shops and warehouses.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  'Ceiling Partition': {
    slug: 'ceiling-partition-singapore',
    seo_title: 'Ceiling & Partition Works Singapore – Office, Shop, Home | SB Reliance',
    seo_description: 'False ceiling and partition works in Singapore for offices, shops and homes. Plan the layout, get a written quotation and one contractor to finish.',
    content: [
      'SB Reliance Pte Ltd builds partitions and false ceilings that reshape the layout of offices, shops and homes across Singapore.',
      '# What we handle',
      'Partition walls, false ceilings and bulkheads, with openings for lighting, air-conditioning and access panels coordinated with our electrical and air-con works.',
      '# How the job runs',
      'We measure the site, agree the layout with you and give you a written quotation before work starts.',
    ].join('\n'),
    faq: [
      'Can you do partitions for an office or shop fit-out? | Yes. We build partitions and ceilings for offices, shops and other commercial units.',
      'Can you also do the lighting and aircon in the new ceiling? | Yes. We do electrical and air-conditioning works too, so the ceiling, lighting and aircon are handled by one team.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Painting: {
    slug: 'painting-services-singapore',
    seo_title: 'Painting Services Singapore – HDB, Condo & Office | SB Reliance',
    seo_description: 'Interior and exterior painting in Singapore for HDB flats, condos, landed homes, offices and shops. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd paints homes, offices and commercial spaces across Singapore, inside and out.',
      '# What we handle',
      'Surface preparation, patching and painting of walls, ceilings, doors and grilles, with furniture and floors protected while we work.',
      '# How the job runs',
      'We check the areas to be painted, agree the scope and colours with you and give you a written quotation before work starts.',
    ].join('\n'),
    faq: [
      'Do you paint HDB flats and condos? | Yes. We paint HDB flats, condos, landed homes, offices and shops.',
      'Do you do the preparation work before painting? | Yes. Patching and surface preparation are part of the job and are included in the quotation.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Tiles: {
    slug: 'tiling-services-singapore',
    seo_title: 'Tiling Services Singapore – Floor & Wall Tiles | SB Reliance',
    seo_description: 'Floor and wall tiling in Singapore for homes, kitchens, bathrooms, offices and shops, including preparation and finishing.',
    content: [
      'SB Reliance Pte Ltd lays floor and wall tiles for homes, kitchens, bathrooms, offices and shops across Singapore.',
      '# What we handle',
      'Removal of old tiles where needed, screeding and surface preparation, tile laying, grouting and finishing.',
      '# How the job runs',
      'We measure the area, agree the tiles and layout with you and give you a written quotation before work starts.',
    ].join('\n'),
    faq: [
      'Can you retile a kitchen or bathroom? | Yes. We remove the old tiles where needed, prepare the surface and lay the new tiles.',
      'Do you supply the tiles? | Tell us what you have in mind. We can work with tiles you choose or include them in the quotation.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  'General Building Contractor': {
    slug: 'general-building-contractor-singapore',
    seo_title: 'General Building Contractor Singapore – Renovation & Fit-out | SB Reliance',
    seo_description: 'General building and renovation contractor in Singapore. Air-con, electrical, ceiling, painting and tiling managed by one team from site visit to handover.',
    content: [
      'SB Reliance Pte Ltd manages building and renovation works for homes, offices and commercial premises across Singapore, from planning to handover.',
      '# One contractor for the whole job',
      'Air-conditioning, electrical, CCTV, ceiling and partition, painting and tiling works are coordinated by one team, so you have one point of contact.',
      '# How the job runs',
      'Site visit, a written quotation and timeline, the works on schedule, and a final inspection with you before handover.',
    ].join('\n'),
    faq: [
      'Do you handle complete renovations? | Yes. We coordinate air-con, electrical, ceiling, painting, tiling and other building works as one project.',
      'Do you work on commercial premises? | Yes. We work on homes, offices, shops and industrial premises across Singapore.',
      QUOTE_FAQ,
    ].join('\n'),
  },
};

export const slugify = (v: string) =>
  v.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
