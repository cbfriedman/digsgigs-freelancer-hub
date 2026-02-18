-- Seed countries (from regionOptions + ISO; ensures all countries used in app + full world coverage).
-- Regions (states/territories) for countries that have them in locationData.

INSERT INTO public.countries (code_alpha2, name) VALUES
  ('US','United States'),('CA','Canada'),('MX','Mexico'),
  ('AR','Argentina'),('BO','Bolivia'),('BR','Brazil'),('CL','Chile'),('CO','Colombia'),('CR','Costa Rica'),('CU','Cuba'),('DO','Dominican Republic'),('EC','Ecuador'),('SV','El Salvador'),('GT','Guatemala'),('HN','Honduras'),('JM','Jamaica'),('NI','Nicaragua'),('PA','Panama'),('PY','Paraguay'),('PE','Peru'),('PR','Puerto Rico'),('TT','Trinidad and Tobago'),('UY','Uruguay'),('VE','Venezuela'),
  ('AT','Austria'),('BE','Belgium'),('BG','Bulgaria'),('HR','Croatia'),('CZ','Czech Republic'),('DK','Denmark'),('EE','Estonia'),('FI','Finland'),('FR','France'),('DE','Germany'),('GR','Greece'),('HU','Hungary'),('IE','Ireland'),('IT','Italy'),('LV','Latvia'),('LT','Lithuania'),('NL','Netherlands'),('NO','Norway'),('PL','Poland'),('PT','Portugal'),('RO','Romania'),('RS','Serbia'),('SK','Slovakia'),('SI','Slovenia'),('ES','Spain'),('SE','Sweden'),('CH','Switzerland'),('UA','Ukraine'),('GB','United Kingdom'),
  ('DZ','Algeria'),('AO','Angola'),('BJ','Benin'),('BW','Botswana'),('CM','Cameroon'),('EG','Egypt'),('ET','Ethiopia'),('GH','Ghana'),('LY','Libya'),('MG','Madagascar'),('MA','Morocco'),('MZ','Mozambique'),('NA','Namibia'),('NG','Nigeria'),('RW','Rwanda'),('SN','Senegal'),('ZA','South Africa'),('TZ','Tanzania'),('TN','Tunisia'),('UG','Uganda'),('ZM','Zambia'),('ZW','Zimbabwe'),
  ('BD','Bangladesh'),('KH','Cambodia'),('CN','China'),('HK','Hong Kong'),('IN','India'),('ID','Indonesia'),('JP','Japan'),('KZ','Kazakhstan'),('KR','South Korea'),('MY','Malaysia'),('MN','Mongolia'),('MM','Myanmar'),('NP','Nepal'),('PK','Pakistan'),('PH','Philippines'),('SG','Singapore'),('LK','Sri Lanka'),('TW','Taiwan'),('TH','Thailand'),('UZ','Uzbekistan'),('VN','Vietnam'),
  ('BH','Bahrain'),('CY','Cyprus'),('IR','Iran'),('IQ','Iraq'),('IL','Israel'),('JO','Jordan'),('KW','Kuwait'),('LB','Lebanon'),('OM','Oman'),('QA','Qatar'),('SA','Saudi Arabia'),('SY','Syria'),('TR','Turkey'),('AE','United Arab Emirates'),('YE','Yemen'),
  ('AU','Australia'),('FJ','Fiji'),('GU','Guam'),('NZ','New Zealand'),('PG','Papua New Guinea'),('WS','Samoa'),
  ('AF','Afghanistan'),('AL','Albania'),('AD','Andorra'),('AM','Armenia'),('AZ','Azerbaijan'),('BS','Bahamas'),('BB','Barbados'),('BY','Belarus'),('BZ','Belize'),('BT','Bhutan'),('BA','Bosnia and Herzegovina'),('BN','Brunei Darussalam'),('BF','Burkina Faso'),('BI','Burundi'),('CV','Cabo Verde'),('KY','Cayman Islands'),('TD','Chad'),('KM','Comoros'),('CG','Congo'),('CD','Democratic Republic of the Congo'),('DJ','Djibouti'),('DM','Dominica'),('ER','Eritrea'),('SZ','Eswatini'),('GA','Gabon'),('GM','Gambia'),('GE','Georgia'),('GD','Grenada'),('GN','Guinea'),('GW','Guinea-Bissau'),('GY','Guyana'),('HT','Haiti'),('IS','Iceland'),('KE','Kenya'),('KG','Kyrgyzstan'),('LA','Lao People''s Democratic Republic'),('LS','Lesotho'),('LR','Liberia'),('LU','Luxembourg'),('MK','North Macedonia'),('MW','Malawi'),('MV','Maldives'),('ML','Mali'),('MT','Malta'),('MR','Mauritania'),('MU','Mauritius'),('FM','Micronesia'),('MD','Moldova'),('MC','Monaco'),('ME','Montenegro'),('NE','Niger'),('KP','North Korea'),('RU','Russia'),('SM','San Marino'),('ST','Sao Tome and Principe'),('SC','Seychelles'),('SL','Sierra Leone'),('SO','Somalia'),('SS','South Sudan'),('SD','Sudan'),('SR','Suriname'),('TJ','Tajikistan'),('TL','Timor-Leste'),('TG','Togo'),('TO','Tonga'),('TV','Tuvalu'),('TM','Turkmenistan'),('VU','Vanuatu'),('VA','Holy See'),('EH','Western Sahara')
ON CONFLICT (code_alpha2) DO NOTHING;

-- Regions (states/territories) for United States
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Washington D.C.','Puerto Rico','Guam','U.S. Virgin Islands','American Samoa','Northern Mariana Islands']), 'state'
FROM public.countries WHERE code_alpha2 = 'US';

-- Canada
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Nova Scotia','Ontario','Prince Edward Island','Quebec','Saskatchewan','Northwest Territories','Nunavut','Yukon']), 'province'
FROM public.countries WHERE code_alpha2 = 'CA';

-- United Kingdom
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['England','Scotland','Wales','Northern Ireland']), 'region'
FROM public.countries WHERE code_alpha2 = 'GB';

-- Australia
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['New South Wales','Victoria','Queensland','Western Australia','South Australia','Tasmania','Australian Capital Territory','Northern Territory']), 'state'
FROM public.countries WHERE code_alpha2 = 'AU';

-- Germany
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Baden-Württemberg','Bavaria','Berlin','Brandenburg','Bremen','Hamburg','Hesse','Lower Saxony','Mecklenburg-Vorpommern','North Rhine-Westphalia','Rhineland-Palatinate','Saarland','Saxony','Saxony-Anhalt','Schleswig-Holstein','Thuringia']), 'state'
FROM public.countries WHERE code_alpha2 = 'DE';

-- France
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Auvergne-Rhône-Alpes','Bourgogne-Franche-Comté','Brittany','Centre-Val de Loire','Corsica','Grand Est','Hauts-de-France','Île-de-France','Normandy','Nouvelle-Aquitaine','Occitanie','Pays de la Loire','Provence-Alpes-Côte d''Azur','French Guiana','Guadeloupe','Martinique','Mayotte','Réunion']), 'region'
FROM public.countries WHERE code_alpha2 = 'FR';

-- Spain
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Andalusia','Aragon','Asturias','Balearic Islands','Basque Country','Canary Islands','Cantabria','Castile and León','Castile-La Mancha','Catalonia','Extremadura','Galicia','La Rioja','Madrid','Murcia','Navarre','Valencian Community']), 'community'
FROM public.countries WHERE code_alpha2 = 'ES';

-- Italy
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abruzzo','Aosta Valley','Apulia','Basilicata','Calabria','Campania','Emilia-Romagna','Friuli-Venezia Giulia','Lazio','Liguria','Lombardy','Marche','Molise','Piedmont','Sardinia','Sicily','Trentino-Alto Adige','Tuscany','Umbria','Veneto']), 'region'
FROM public.countries WHERE code_alpha2 = 'IT';

-- Mexico
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Coahuila','Colima','Durango','Guanajuato','Guerrero','Hidalgo','Jalisco','México','Mexico City','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas']), 'state'
FROM public.countries WHERE code_alpha2 = 'MX';

-- Brazil
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Acre','Alagoas','Amapá','Amazonas','Bahia','Ceará','Distrito Federal','Espírito Santo','Goiás','Maranhão','Mato Grosso','Mato Grosso do Sul','Minas Gerais','Pará','Paraíba','Paraná','Pernambuco','Piauí','Rio de Janeiro','Rio Grande do Norte','Rio Grande do Sul','Rondônia','Roraima','Santa Catarina','São Paulo','Sergipe','Tocantins']), 'state'
FROM public.countries WHERE code_alpha2 = 'BR';

-- India
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Puducherry']), 'state'
FROM public.countries WHERE code_alpha2 = 'IN';

-- Japan
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Hokkaido','Aomori','Iwate','Miyagi','Akita','Yamagata','Fukushima','Ibaraki','Tochigi','Gunma','Saitama','Chiba','Tokyo','Kanagawa','Niigata','Toyama','Ishikawa','Fukui','Yamanashi','Nagano','Gifu','Shizuoka','Aichi','Mie','Shiga','Kyoto','Osaka','Hyogo','Nara','Wakayama','Tottori','Shimane','Okayama','Hiroshima','Yamaguchi','Tokushima','Kagawa','Ehime','Kochi','Fukuoka','Saga','Nagasaki','Kumamoto','Oita','Miyazaki','Kagoshima','Okinawa']), 'prefecture'
FROM public.countries WHERE code_alpha2 = 'JP';

-- China
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anhui','Beijing','Chongqing','Fujian','Gansu','Guangdong','Guangxi','Guizhou','Hainan','Hebei','Heilongjiang','Henan','Hong Kong','Hubei','Hunan','Inner Mongolia','Jiangsu','Jiangxi','Jilin','Liaoning','Macau','Ningxia','Qinghai','Shaanxi','Shandong','Shanghai','Shanxi','Sichuan','Taiwan','Tianjin','Tibet','Xinjiang','Yunnan','Zhejiang']), 'province'
FROM public.countries WHERE code_alpha2 = 'CN';

-- Netherlands
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Drenthe','Flevoland','Friesland','Gelderland','Groningen','Limburg','North Brabant','North Holland','Overijssel','South Holland','Utrecht','Zeeland']), 'province'
FROM public.countries WHERE code_alpha2 = 'NL';

-- Belgium
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Brussels-Capital Region','Flemish Region','Walloon Region']), 'region'
FROM public.countries WHERE code_alpha2 = 'BE';

-- Switzerland
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aargau','Appenzell Ausserrhoden','Appenzell Innerrhoden','Basel-Landschaft','Basel-Stadt','Bern','Fribourg','Geneva','Glarus','Graubünden','Jura','Lucerne','Neuchâtel','Nidwalden','Obwalden','Schaffhausen','Schwyz','Solothurn','St. Gallen','Thurgau','Ticino','Uri','Valais','Vaud','Zug','Zürich']), 'canton'
FROM public.countries WHERE code_alpha2 = 'CH';

-- Austria
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Burgenland','Carinthia','Lower Austria','Upper Austria','Salzburg','Styria','Tyrol','Vorarlberg','Vienna']), 'state'
FROM public.countries WHERE code_alpha2 = 'AT';

-- Portugal
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aveiro','Beja','Braga','Bragança','Castelo Branco','Coimbra','Évora','Faro','Guarda','Leiria','Lisbon','Portalegre','Porto','Santarém','Setúbal','Viana do Castelo','Vila Real','Viseu','Azores','Madeira']), 'district'
FROM public.countries WHERE code_alpha2 = 'PT';

-- Ireland
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Connacht','Leinster','Munster','Ulster']), 'province'
FROM public.countries WHERE code_alpha2 = 'IE';

-- Argentina
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Buenos Aires','Catamarca','Chaco','Chubut','Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe','Santiago del Estero','Tierra del Fuego','Tucumán','Ciudad Autónoma de Buenos Aires']), 'province'
FROM public.countries WHERE code_alpha2 = 'AR';

-- South Africa
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','Northern Cape','North West','Western Cape']), 'province'
FROM public.countries WHERE code_alpha2 = 'ZA';

-- New Zealand
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Northland','Auckland','Waikato','Bay of Plenty','Gisborne','Hawke''s Bay','Taranaki','Manawatū-Whanganui','Wellington','Tasman','Nelson','Marlborough','West Coast','Canterbury','Otago','Southland']), 'region'
FROM public.countries WHERE code_alpha2 = 'NZ';

-- Philippines
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Metro Manila','Cordillera','Ilocos Region','Cagayan Valley','Central Luzon','Calabarzon','Mimaropa','Bicol Region','Western Visayas','Central Visayas','Eastern Visayas','Zamboanga Peninsula','Northern Mindanao','Davao Region','Soccsksargen','Caraga','Bangsamoro']), 'region'
FROM public.countries WHERE code_alpha2 = 'PH';
