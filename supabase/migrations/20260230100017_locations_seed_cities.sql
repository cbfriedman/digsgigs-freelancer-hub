-- Seed cities: US (per state/territory), plus a few for countries without regions.
-- Enables Diggers to select state and city after country.

-- US cities (one or two per state/territory)
WITH us_cities(region_name, city_name) AS (VALUES
  ('Alabama','Birmingham'),('Alabama','Montgomery'),
  ('Alaska','Anchorage'),('Alaska','Fairbanks'),
  ('Arizona','Phoenix'),('Arizona','Tucson'),
  ('Arkansas','Little Rock'),('Arkansas','Fayetteville'),
  ('California','Los Angeles'),('California','San Francisco'),('California','San Diego'),
  ('Colorado','Denver'),('Colorado','Colorado Springs'),
  ('Connecticut','Hartford'),('Connecticut','New Haven'),
  ('Delaware','Wilmington'),('Delaware','Dover'),
  ('Florida','Miami'),('Florida','Orlando'),('Florida','Jacksonville'),
  ('Georgia','Atlanta'),('Georgia','Savannah'),
  ('Hawaii','Honolulu'),('Hawaii','Pearl City'),
  ('Idaho','Boise'),('Idaho','Meridian'),
  ('Illinois','Chicago'),('Illinois','Springfield'),
  ('Indiana','Indianapolis'),('Indiana','Fort Wayne'),
  ('Iowa','Des Moines'),('Iowa','Cedar Rapids'),
  ('Kansas','Wichita'),('Kansas','Kansas City'),
  ('Kentucky','Louisville'),('Kentucky','Lexington'),
  ('Louisiana','New Orleans'),('Louisiana','Baton Rouge'),
  ('Maine','Portland'),('Maine','Augusta'),
  ('Maryland','Baltimore'),('Maryland','Rockville'),
  ('Massachusetts','Boston'),('Massachusetts','Cambridge'),
  ('Michigan','Detroit'),('Michigan','Grand Rapids'),
  ('Minnesota','Minneapolis'),('Minnesota','Saint Paul'),
  ('Mississippi','Jackson'),('Mississippi','Gulfport'),
  ('Missouri','Kansas City'),('Missouri','Saint Louis'),
  ('Montana','Billings'),('Montana','Missoula'),
  ('Nebraska','Omaha'),('Nebraska','Lincoln'),
  ('Nevada','Las Vegas'),('Nevada','Reno'),
  ('New Hampshire','Manchester'),('New Hampshire','Nashua'),
  ('New Jersey','Newark'),('New Jersey','Jersey City'),
  ('New Mexico','Albuquerque'),('New Mexico','Santa Fe'),
  ('New York','New York'),('New York','Buffalo'),('New York','Rochester'),
  ('North Carolina','Charlotte'),('North Carolina','Raleigh'),
  ('North Dakota','Fargo'),('North Dakota','Bismarck'),
  ('Ohio','Columbus'),('Ohio','Cleveland'),('Ohio','Cincinnati'),
  ('Oklahoma','Oklahoma City'),('Oklahoma','Tulsa'),
  ('Oregon','Portland'),('Oregon','Eugene'),
  ('Pennsylvania','Philadelphia'),('Pennsylvania','Pittsburgh'),
  ('Rhode Island','Providence'),('Rhode Island','Warwick'),
  ('South Carolina','Charleston'),('South Carolina','Columbia'),
  ('South Dakota','Sioux Falls'),('South Dakota','Rapid City'),
  ('Tennessee','Nashville'),('Tennessee','Memphis'),
  ('Texas','Houston'),('Texas','Dallas'),('Texas','Austin'),('Texas','San Antonio'),
  ('Utah','Salt Lake City'),('Utah','Provo'),
  ('Vermont','Burlington'),('Vermont','Montpelier'),
  ('Virginia','Virginia Beach'),('Virginia','Richmond'),('Virginia','Arlington'),
  ('Washington','Seattle'),('Washington','Spokane'),('Washington','Tacoma'),
  ('West Virginia','Charleston'),('West Virginia','Huntington'),
  ('Wisconsin','Milwaukee'),('Wisconsin','Madison'),
  ('Wyoming','Cheyenne'),('Wyoming','Casper'),
  ('Washington D.C.','Washington'),
  ('Puerto Rico','San Juan'),('Puerto Rico','Ponce'),
  ('Guam','Hagåtña'),('U.S. Virgin Islands','Charlotte Amalie'),
  ('American Samoa','Pago Pago'),('Northern Mariana Islands','Saipan')
)
INSERT INTO public.cities (country_id, region_id, name)
SELECT c.id, r.id, us.city_name
FROM us_cities us
JOIN public.countries c ON c.code_alpha2 = 'US'
JOIN public.regions r ON r.country_id = c.id AND r.name = us.region_name;

-- Canada: one or two cities per province/territory
WITH ca_cities(region_name, city_name) AS (VALUES
  ('Alberta','Calgary'),('Alberta','Edmonton'),
  ('British Columbia','Vancouver'),('British Columbia','Victoria'),
  ('Manitoba','Winnipeg'),('Manitoba','Brandon'),
  ('New Brunswick','Moncton'),('New Brunswick','Saint John'),
  ('Newfoundland and Labrador','St. John''s'),('Newfoundland and Labrador','Mount Pearl'),
  ('Nova Scotia','Halifax'),('Nova Scotia','Dartmouth'),
  ('Ontario','Toronto'),('Ontario','Ottawa'),('Ontario','Mississauga'),
  ('Prince Edward Island','Charlottetown'),('Quebec','Montreal'),('Quebec','Quebec City'),
  ('Saskatchewan','Saskatoon'),('Saskatchewan','Regina'),
  ('Northwest Territories','Yellowknife'),('Nunavut','Iqaluit'),('Yukon','Whitehorse')
)
INSERT INTO public.cities (country_id, region_id, name)
SELECT c.id, r.id, ca.city_name
FROM ca_cities ca
JOIN public.countries c ON c.code_alpha2 = 'CA'
JOIN public.regions r ON r.country_id = c.id AND r.name = ca.region_name;

-- United Kingdom: cities per nation
WITH gb_cities(region_name, city_name) AS (VALUES
  ('England','London'),('England','Manchester'),('England','Birmingham'),('England','Leeds'),
  ('Scotland','Edinburgh'),('Scotland','Glasgow'),('Scotland','Aberdeen'),
  ('Wales','Cardiff'),('Wales','Swansea'),('Northern Ireland','Belfast'),('Northern Ireland','Derry')
)
INSERT INTO public.cities (country_id, region_id, name)
SELECT c.id, r.id, gb.city_name
FROM gb_cities gb
JOIN public.countries c ON c.code_alpha2 = 'GB'
JOIN public.regions r ON r.country_id = c.id AND r.name = gb.region_name;

-- Australia: cities per state/territory
WITH au_cities(region_name, city_name) AS (VALUES
  ('New South Wales','Sydney'),('New South Wales','Newcastle'),('Victoria','Melbourne'),('Victoria','Geelong'),
  ('Queensland','Brisbane'),('Queensland','Gold Coast'),('Western Australia','Perth'),('South Australia','Adelaide'),
  ('Tasmania','Hobart'),('Australian Capital Territory','Canberra'),('Northern Territory','Darwin')
)
INSERT INTO public.cities (country_id, region_id, name)
SELECT c.id, r.id, au.city_name
FROM au_cities au
JOIN public.countries c ON c.code_alpha2 = 'AU'
JOIN public.regions r ON r.country_id = c.id AND r.name = au.region_name;

-- Countries with no regions: add major cities with region_id null
INSERT INTO public.cities (country_id, region_id, name)
SELECT id, NULL, unnest(ARRAY['Singapore'])
FROM public.countries WHERE code_alpha2 = 'SG';

INSERT INTO public.cities (country_id, region_id, name)
SELECT id, NULL, unnest(ARRAY['Luxembourg City','Esch-sur-Alzette'])
FROM public.countries WHERE code_alpha2 = 'LU';

INSERT INTO public.cities (country_id, region_id, name)
SELECT id, NULL, unnest(ARRAY['Valletta','Sliema','Birkirkara'])
FROM public.countries WHERE code_alpha2 = 'MT';
