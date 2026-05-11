-- SkillUp 1.0 — seed the 20 tracks.
-- Idempotent via ON CONFLICT (code) DO UPDATE so re-running keeps things in sync.
-- Mirrors src/content/tracks.ts.

set search_path = public;

insert into public.tracks (code, name, category, facilitator_name, glyph_key, description, capacity) values
  ('UXD', 'UI/UX Design',                              'digital',    'Ayomide Odewale',       'design',     'Design intuitive digital products. Learn user research, wireframing, and Figma fluency.', 20),
  ('PHO', 'Photography & Photo Editing',               'creative',   'Bro Ola',                'camera',     'Composition, lighting, and editing in Lightroom — from phone shots to portfolio pieces.', 20),
  ('VID', 'Videography & Video Editing',               'creative',   'Bro Matthew',            'video',      'Tell stories that move. Shooting fundamentals, editing in CapCut/Premiere, and reels that convert.', 20),
  ('GFX', 'Graphic Design',                            'creative',   'Joshomowole',            'palette',    'Posters, flyers, social media kits — design that earns clients in Lagos and beyond.', 20),
  ('CWD', 'Coding & Web Development',                  'digital',    'Dozie',                  'code',       'Build your first real website. HTML, CSS, and the JavaScript that powers modern apps.', 20),
  ('DMK', 'Digital Marketing & Social Media',          'digital',    'Mide / Emma',            'megaphone',  'Turn attention into income — content strategy, paid ads, analytics, and brand growth.', 20),
  ('CCB', 'Content Creation & Personal Branding',      'digital',    'Bro Idera Solomon',      'microphone', 'Show up consistently. Build the on-camera and writing skills that compound into a personal brand.', 20),
  ('DAT', 'Data Analysis',                             'digital',    'Bro Akintayo Akinyemi',  'chart',      'Read data, shape insights. Excel, SQL basics, and dashboards that drive decisions.', 20),
  ('GYP', 'Gypsum & Resin Arts',                       'vocational', 'Sis Victoria Odewale',   'sparkles',   'Cast, mould, and finish gypsum and resin pieces — décor and giftware that sells.', 20),
  ('SPM', 'Soap Making & Household Products',          'vocational', 'Mrs Balogun',            'droplet',    'Liquid soap, bar soap, detergents — formulate, brand, and price for a real market.', 20),
  ('BMK', 'Bead Making & Accessories',                 'vocational', 'Aramide',                'gem',        'Bridal beads, everyday accessories — patterns, finishing, and pricing for profit.', 20),
  ('CTR', 'Small Chops & Catering Basics',             'vocational', 'Mrs Godslove',           'fork',       'Run a small chops side hustle — recipes, packaging, costing, and customer flow.', 20),
  ('SHO', 'Shoe & Footwear Making',                    'vocational', 'Pelumee',                'footprint',  'Handcraft sandals, slides, and palm slippers. Tools, leatherwork, and finishing.', 20),
  ('VAS', 'Virtual Assistance',                        'digital',    null,                      'briefcase',  'Work remotely for global clients — calendar, inbox, CRM, and the soft skills that retain them.', 20),
  ('PCM', 'Perfume, Diffusers & Candle Making',        'vocational', null,                      'flame',      'Blend fragrances, pour candles, and craft reed diffusers — beautifully packaged.', 20),
  ('WIG', 'Wig Making & Hair Revamping',               'vocational', null,                      'scissors',   'Build wigs, revamp old hair, style for clients. A skill the Lagos market hires every weekend.', 20),
  ('FSH', 'Fashion Design & Tailoring',                'vocational', null,                      'needle',     'Sketch, cut, sew. Foundational tailoring skills that grow into a full atelier.', 20),
  ('SKN', 'Skincare & Cosmetics Formulation',          'vocational', null,                      'leaf',       'Formulate clean skincare and cosmetics — safe ingredients, batch testing, and brand basics.', 20),
  ('KNT', 'Knitting / Crocheting & Textile Crafts',    'vocational', null,                      'yarn',       'Crochet bags, knit tops, woven crafts — modern, sellable pieces from classic techniques.', 20),
  ('ADR', 'Kampala / Adire Fabric Dyeing',             'vocational', null,                      'brush',      'Tie-dye, stencil, and indigo techniques to produce Adire and Kampala fabrics for the runway.', 20)
on conflict (code) do update set
  name             = excluded.name,
  category         = excluded.category,
  facilitator_name = excluded.facilitator_name,
  glyph_key        = excluded.glyph_key,
  description      = excluded.description,
  capacity         = excluded.capacity;

-- Seed zone churches (placeholder — extend as the church publishes the official list).
insert into public.zone_churches (name, area) values
  ('Cement Missionary HQ',         'Cement, Lagos'),
  ('Foursquare Mafoluku',          'Mafoluku, Lagos'),
  ('Foursquare Oshodi',            'Oshodi, Lagos'),
  ('Foursquare Ilasamaja',         'Ilasamaja, Lagos'),
  ('Foursquare Isolo',             'Isolo, Lagos'),
  ('Foursquare Surulere',          'Surulere, Lagos'),
  ('Foursquare Yaba',              'Yaba, Lagos'),
  ('Foursquare Mushin',            'Mushin, Lagos')
on conflict (name) do nothing;
