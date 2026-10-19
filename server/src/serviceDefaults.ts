// Starting copy for the built-in services, keyed by their original titles.
// Used once: when a service has no slug yet (first start, or a database from before service pages),
// its empty slug / page text / FAQ / Google title / Google description are filled from here.
// Everything stays editable in Admin > Services.
// Page text: one paragraph per line, a line starting with "# " is a heading. FAQ: one per line, "Question | Answer".

export interface ServiceDefault {
  slug: string;
  seo_title: string;
  seo_description: string;
  content: string;
  faq: string;
  /** card text; set on the company's standard services (the business card list), used when one is added back */
  description?: string;
  /** an existing service whose title matches this already covers it, so it is not added again */
  covers?: RegExp;
}

const QUOTE_FAQ = 'How do I get a quotation? | Send us a WhatsApp message or the quote form with your address and the work you need. We arrange a site visit and send you a written quotation.';

export const SERVICE_DEFAULTS: Record<string, ServiceDefault> = {
  'ACMV System Installation': {
    description: 'Design-aligned installation of air-conditioning and mechanical ventilation systems for commercial and industrial buildings.',
    covers: /acmv|mechanical ventilation/i,
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
  'Aircon Ducting': {
    description: 'Aircon ducting for offices, shops and homes: supply and return air ducts, insulation, fan coil units and access panels.',
    covers: /air.?con|duct/i,
    slug: 'aircon-ducting-singapore',
    seo_title: 'Aircon Ducting Singapore – Office, Shop & Home | SB Reliance',
    seo_description: 'Aircon ducting in Singapore: supply and return air ducts, insulation, fan coil units and access panels for offices, shops and homes. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd carries out aircon ducting for offices, shops, commercial units and homes across Singapore: supply and return air ducts, insulation, fan coil unit connections and access panels, planned around your ceiling and layout.',
      '# What we handle',
      'Supply air and return air ducting, fresh-air and exhaust ducts, duct insulation, fan coil unit and diffuser connections, access panels for servicing, and fire-rated duct casing and bulkheads where the building requires them.',
      '# Ducting above false ceilings',
      'Most ducting runs above the false ceiling. We plan the duct routes with the ceiling, lighting and sprinkler positions so the finished ceiling stays neat, and we leave access panels where the units need servicing later.',
      '# How the job runs',
      'We visit the site, check the ceiling space and the cooling load with you and give you a written quotation for the exact scope. After installation we check airflow and insulation with you before handover.',
    ].join('\n'),
    faq: [
      'What is aircon ducting? | Ducting carries cooled air from the aircon unit to the rooms through ducts above the ceiling, and returns the air to the unit. It lets one unit serve several spaces with only the outlets visible.',
      'Do you do ducting for offices and shops? | Yes. We plan and install ducting for offices, shops and other commercial units, and we coordinate it with the ceiling and electrical works.',
      'Will I still be able to service the unit? | Yes. We leave access panels where the fan coil units and valves are, so servicing does not need the ceiling to be opened up.',
      'Do you insulate the ducts? | Yes. Ducts and pipes are insulated to prevent condensation and heat loss.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Electrical: {
    description: 'Electrical wiring, distribution boards, lighting and power works for new fit-outs and renovations.',
    covers: /electric/i,
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
    description: 'CCTV camera supply, installation and cabling for homes, offices and commercial premises.',
    covers: /cctv|camera/i,
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
    description: 'Partitions and false ceilings that reshape the layout of offices, shops and homes.',
    covers: /ceiling|partition/i,
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
    description: 'Interior and exterior painting for residential and commercial spaces.',
    covers: /paint/i,
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
    description: 'Floor and wall tiling, including preparation and finishing.',
    covers: /tile|tiling/i,
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
    description: 'Building and renovation works managed from planning to handover.',
    covers: /general building|building contractor/i,
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

// Services the company added in Admin. Only their empty page text / FAQ / Google title and description
// are filled from here (Admin > Services > "Add standard services and fill empty pages"); never added on their own.
export const EXTRA_DEFAULTS: Record<string, ServiceDefault> = {
  'Partition & False Ceiling': {
    slug: 'partition-and-false-ceiling',
    seo_title: 'Partition & False Ceiling Singapore – Office, Shop, Home | SB Reliance',
    seo_description: 'Partition walls and false ceilings in Singapore for offices, shops, HDB flats and condos. Site visit and written quotation before work starts.',
    content: [
      'SB Reliance Pte Ltd builds partition walls and false ceilings for offices, shops, HDB flats, condos and landed homes across Singapore.',
      '# What we handle',
      'Drywall and glass partitions, false ceilings, bulkheads and cove lighting recesses, with openings for lights, air-conditioning and access panels.',
      '# One team for the ceiling, lights and aircon',
      'Because we also do electrical and air-conditioning works, the ceiling, lighting points and aircon are planned and built together.',
      '# How the job runs',
      'We measure the site, agree the layout with you and give you a written quotation before work starts.',
    ].join('\n'),
    faq: [
      'Can you build partitions for an office or shop? | Yes. We build partitions and ceilings for offices, shops and other commercial units.',
      'Can you add cove lighting or downlights in the new ceiling? | Yes. Our electrical team installs the lighting as part of the same job.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Plastering: {
    slug: 'plastering',
    seo_title: 'Plastering Services Singapore – Walls & Ceilings | SB Reliance',
    seo_description: 'Wall and ceiling plastering and skim coating in Singapore for HDB, condo, landed and commercial units. Smooth surfaces ready for paint or tiles.',
    content: [
      'SB Reliance Pte Ltd plasters and skim coats walls and ceilings for homes, offices and shops across Singapore.',
      '# What we handle',
      'Repairing cracks and uneven areas, re-plastering after hacking or rewiring, and skim coating so the surface is smooth and ready for painting, tiling or wallpaper.',
      '# How the job runs',
      'We check the walls, agree the areas and finish with you and give you a written quotation before work starts. Painting and tiling can follow straight after, by the same team.',
    ].join('\n'),
    faq: [
      'Can you plaster after hacking or rewiring? | Yes. We patch and re-plaster the areas so the wall is ready for paint or tiles.',
      'Do you also paint after plastering? | Yes. We do painting and tiling too, so the wall is finished by one team.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Hacking: {
    slug: 'hacking',
    seo_title: 'Hacking Works Singapore – Walls, Tiles & Built-ins | SB Reliance',
    seo_description: 'Hacking of walls, floor and wall tiles and built-in carpentry in Singapore, with debris removal. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd carries out hacking works for homes, offices and shops across Singapore.',
      '# What we handle',
      'Hacking of non-structural walls, old floor and wall tiles, kitchen and bathroom fittings and built-in carpentry, with protection of the areas that stay and removal of the debris.',
      '# HDB and condo rules',
      'Some hacking works in HDB flats and condos need approval from HDB or the management first. We check what your unit needs with you before any work starts.',
      '# After hacking',
      'We can carry on with plastering, tiling, electrical and painting, so the space is finished by one team.',
    ].join('\n'),
    faq: [
      'Can any wall be hacked? | No. Structural walls cannot be removed. We check the wall and the rules for your unit before quoting.',
      'Do you remove the debris? | Yes. Debris removal is included in the quotation.',
      QUOTE_FAQ,
    ].join('\n'),
  },
  Renovation: {
    slug: 'renovation',
    seo_title: 'Renovation Contractor Singapore – HDB, Condo & Office | SB Reliance',
    seo_description: 'Home and office renovation in Singapore: hacking, plastering, tiling, ceiling, electrical, aircon and painting by one team. Site visit and written quotation.',
    content: [
      'SB Reliance Pte Ltd renovates HDB flats, condos, landed homes, offices and shops across Singapore, from planning to handover.',
      '# One contractor for the whole renovation',
      'Hacking, plastering, tiling, partitions and false ceilings, electrical, air-conditioning, CCTV and painting are carried out and coordinated by one team, so you have one point of contact.',
      '# How the job runs',
      'Site visit, a written quotation and timeline, the works on schedule, and a final inspection with you before handover.',
    ].join('\n'),
    faq: [
      'Do you handle complete renovations? | Yes. We coordinate hacking, tiling, ceiling, electrical, aircon and painting as one project.',
      'Do you renovate offices and shops? | Yes. We work on homes as well as offices, shops and other commercial units.',
      QUOTE_FAQ,
    ].join('\n'),
  },
};

const norm = (t: string) => t.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim();
/** Suggested page text for a service title (built-in or extra), if there is one. */
export function defaultsFor(title: string): ServiceDefault | undefined {
  const t = norm(title);
  for (const [k, v] of [...Object.entries(SERVICE_DEFAULTS), ...Object.entries(EXTRA_DEFAULTS)]) if (norm(k) === t) return v;
  return undefined;
}

export const slugify = (v: string) =>
  v.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 120);
