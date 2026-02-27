-- Regions (states/territories) for all countries that have them in dr5hn/countries-states-cities-database.
-- Skips countries already seeded in 20260230100016_locations_seed.sql.

-- Afghanistan (AF)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Badakhshan','Badghis','Baghlan','Balkh','Bamyan','Daykundi','Farah','Faryab','Ghazni','Ghōr','Helmand','Herat','Jowzjan','Kabul','Kandahar','Kapisa','Khost','Kunar','Kunduz Province','Laghman','Logar','Nangarhar','Nimruz','Nuristan','Paktia','Paktika','Panjshir','Parwan','Samangan','Sar-e Pol','Takhar','Urozgan','Wardak','Zabul']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AF' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Aland Islands (AX)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Brändö','Eckerö','Finström','Föglö','Geta','Hammarland','Jomala','Kökar','Kumlinge','Lemland','Lumparland','Mariehamn','Saltvik','Sottunga','Sund','Vårdö']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AX' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Albania (AL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Berat','Dibër','Durrës','Elbasan','Fier','Gjirokastër','Korçë','Kukës','Lezhë','Shkodër','Tirana','Vlorë']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Algeria (DZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adrar','Aïn Defla','Aïn Témouchent','Algiers','Annaba','Batna','Béchar','Béjaïa','Béni Abbès','Biskra','Blida','Bordj Baji Mokhtar','Bordj Bou Arréridj','Bouïra','Boumerdès','Chlef','Constantine','Djanet','Djelfa','El Bayadh','El M''ghair','El Menia','El Oued','El Tarf','Ghardaïa','Guelma','Illizi','In Guezzam','In Salah','Jijel','Khenchela','Laghouat','M''Sila','Mascara','Médéa','Mila','Mostaganem','Naama','Oran','Ouargla','Ouled Djellal','Oum El Bouaghi','Relizane','Saïda','Sétif','Sidi Bel Abbès','Skikda','Souk Ahras','Tamanghasset','Tébessa','Tiaret','Timimoun','Tindouf','Tipasa','Tissemsilt','Tizi Ouzou','Tlemcen','Touggourt']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'DZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- American Samoa (AS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Eastern','Manuʻa','Rose','Swains','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Andorra (AD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Andorra la Vella','Canillo','Encamp','Escaldes-Engordany','La Massana','Ordino','Sant Julià de Lòria']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Angola (AO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bengo','Benguela','Bié','Cabinda','Cuando Cubango','Cuanza','Cuanza Norte','Cunene','Huambo','Huíla','Luanda','Lunda Norte','Lunda Sul','Malanje','Moxico','Namibe','Uíge','Zaire']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Anguilla (AI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Blowing Point','East End','George Hill','Island Harbour','North Hill','North Side','Sandy Ground','Sandy Hill','South Hill','Stoney Ground','The Farrington','The Quarter','The Valley','West End']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Antigua and Barbuda (AG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Barbuda','Redonda','Saint George','Saint John','Saint Mary','Saint Paul','Saint Peter','Saint Philip']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Armenia (AM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aragatsotn','Ararat','Armavir','Gegharkunik','Kotayk','Lori','Shirak','Syunik','Tavush','Vayots Dzor','Yerevan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Aruba (AW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Noord','Oranjestad','Oranjestad East','Oranjestad West','Paradera','San Nicolaas Noord','San Nicolaas Zuid','Santa Cruz','Savaneta']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Azerbaijan (AZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Absheron','Agdam','Agdash','Aghjabadi','Agstafa','Agsu','Astara','Babek','Baku','Balakan','Barda','Beylagan','Bilasuvar','Dashkasan','Fizuli','Ganja','Gədəbəy','Gobustan','Goranboy','Goychay','Goygol','Hajigabul','Imishli','Ismailli','Jabrayil','Jalilabad','Julfa','Kalbajar','Kangarli','Khachmaz','Khankendi','Khizi','Khojali','Kurdamir','Lachin','Lankaran','Lankaran','Lerik','Martuni','Masally','Mingachevir','Naftalan','Nakhchivan','Nakhchivan','Neftchala','Oghuz','Ordubad','Qabala','Qakh','Qazakh','Quba','Qubadli','Qusar','Saatly','Sabirabad','Sadarak','Salyan','Samukh','Shabran','Shahbuz','Shaki','Shaki','Shamakhi','Shamkir','Sharur','Shirvan','Shusha','Siazan','Sumqayit','Tartar','Tovuz','Ujar','Yardymli','Yevlakh','Yevlakh','Zangilan','Zaqatala','Zardab']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bahrain (BH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Capital','Muharraq','Northern','Southern']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bangladesh (BD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bagerhat','Bandarban','Barguna','Barisal ','Barishal','Bhola','Bogura','Brahmanbaria','Chandpur','Chapai Nawabganj','Chattogram','Chittagong ','Chuadanga','Cox''s Bazar','Cumilla','Dhaka','Dhaka ','Dinajpur','Faridpur','Feni','Gaibandha','Gazipur','Gopalganj','Habiganj','Jamalpur','Jashore','Jhalakathi','Jhenaidah','Joypurhat','Khagrachhari','Khulna','Khulna ','Kishoreganj','Kurigram','Kushtia','Lakshmipur','Lalmonirhat','Madaripur','Magura','Manikganj','Meherpur','Moulvibazar','Munshiganj','Mymensingh','Mymensingh ','Naogaon','Narail','Narayanganj','Narsingdi','Natore','Netrakona','Nilphamari','Noakhali','Pabna','Panchagarh','Patuakhali','Pirojpur','Rajbari','Rajshahi','Rajshahi ','Rangamati','Rangpur ','Rangpur','Satkhira','Shariatpur','Sherpur','Sirajganj','Sunamganj','Sylhet ','Sylhet','Tangail','Thakurgaon']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Barbados (BB)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Christ Church','Saint Andrew','Saint George','Saint James','Saint John','Saint Joseph','Saint Lucy','Saint Michael','Saint Peter','Saint Philip','Saint Thomas']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BB' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Belarus (BY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Brest','Gomel','Grodno','Minsk','Minsk','Mogilev','Vitebsk']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Belize (BZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Belize','Cayo','Corozal','Orange Walk','Stann Creek','Toledo']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Benin (BJ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alibori','Atakora','Atlantique','Borgou','Collines','Donga','Kouffo','Littoral','Mono','Ouémé','Plateau','Zou']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BJ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bermuda (BM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Devonshire','Hamilton','Paget','Pembroke','Saint George''s','Sandys','Smith''s','Southampton','Warwick']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bhutan (BT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bumthang ','Chukha ','Dagana ','Gasa ','Haa ','Lhuntse ','Mongar ','Paro ','Pemagatshel ','Punakha ','Samdrup Jongkhar ','Samtse ','Sarpang ','Thimphu ','Trashi Yangtse	','Trashigang ','Trongsa ','Tsirang ','Wangdue Phodrang ','Zhemgang ']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bolivia (BO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Beni','Chuquisaca','Cochabamba','La Paz','Oruro','Pando','Potosí','Santa Cruz','Tarija']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bonaire, Sint Eustatius and Saba (BQ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bonaire','Saba','Sint Eustatius']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BQ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bosnia and Herzegovina (BA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Brčko','Federation of Bosnia and Herzegovina','Republika Srpska']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Botswana (BW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central','Chobe','Francistown','Gaborone','Ghanzi','Jwaneng','Kgalagadi','Kgatleng','Kweneng','Lobatse','North-East','North-West','Selibe Phikwe','South-East','Southern','Sowa Town']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Brunei (BN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Belait','Brunei-Muara','Temburong','Tutong']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Bulgaria (BG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Blagoevgrad','Burgas','Dobrich','Gabrovo','Haskovo','Kardzhali','Kyustendil','Lovech','Montana','Pazardzhik','Pernik','Pleven','Plovdiv','Razgrad','Ruse','Shumen','Silistra','Sliven','Smolyan','Sofia','Sofia City','Stara Zagora','Targovishte','Varna','Veliko Tarnovo','Vidin','Vratsa','Yambol']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Burkina Faso (BF)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Balé','Bam','Banwa','Bazèga','Boucle du Mouhoun','Bougouriba','Boulgou','Boulkiemde','Cascades','Centre','Centre-Est','Centre-Nord','Centre-Ouest','Centre-Sud','Comoé','Est','Ganzourgou','Gnagna','Gourma','Hauts-Bassins','Houet','Ioba','Kadiogo','Kénédougou','Komondjari','Kompienga','Kossi','Koulpélogo','Kouritenga','Kourwéogo','Léraba','Loroum','Mouhoun','Nahouri','Namentenga','Nayala','Nord','Noumbiel','Oubritenga','Oudalan','Passoré','Plateau-Central','Poni','Sahel','Sanguié','Sanmatenga','Séno','Sissili','Soum','Sourou','Sud-Ouest','Tapoa','Tuy','Yagha','Yatenga','Ziro','Zondoma','Zoundwéogo']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BF' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Burundi (BI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bubanza','Bujumbura Mairie','Bujumbura Rural','Bururi','Cankuzo','Cibitoke','Gitega','Karuzi','Kayanza','Kirundo','Makamba','Muramvya','Muyinga','Mwaro','Ngozi','Rumonge','Rutana','Ruyigi']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cambodia (KH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Banteay Meanchey','Battambang','Kampong Cham','Kampong Chhnang','Kampong Speu','Kampong Thom','Kampot','Kandal','Kep','Koh Kong','Kratie','Mondulkiri','Oddar Meanchey','Pailin','Phnom Penh','Preah Vihear','Prey Veng','Pursat','Ratanakiri','Siem Reap','Sihanoukville','Stung Treng','Svay Rieng','Takeo','Tboung Khmum']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cameroon (CM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adamawa','Centre','East','Far North','Littoral','North','Northwest','South','Southwest','West']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cape Verde (CV)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Barlavento Islands','Boa Vista','Brava','Maio','Mosteiros','Paul','Porto Novo','Praia','Ribeira Brava','Ribeira Grande','Ribeira Grande de Santiago','Sal','Santa Catarina','Santa Catarina do Fogo','Santa Cruz','São Domingos','São Filipe','São Lourenço dos Órgãos','São Miguel','São Salvador do Mundo','São Vicente','Sotavento Islands','Tarrafal','Tarrafal de São Nicolau']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CV' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cayman Islands (KY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Cayman Brac','Grand Cayman','Little Cayman']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Central African Republic (CF)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bamingui-Bangoran','Bangui','Basse-Kotto','Haut-Mbomou','Haute-Kotto','Kémo','Lobaye','Mambéré-Kadéï','Mbomou','Nana-Grébizi','Nana-Mambéré','Ombella-M''Poko','Ouaka','Ouham','Ouham-Pendé','Sangha-Mbaéré','Vakaga']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CF' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Chad (TD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bahr el Gazel','Batha','Borkou','Chari-Baguirmi','Ennedi-Est','Ennedi-Ouest','Guéra','Hadjer-Lamis','Kanem','Lac','Logone Occidental','Logone Oriental','Mandoul','Mayo-Kebbi Est','Mayo-Kebbi Ouest','Moyen-Chari','N''Djamena','Ouaddaï','Salamat','Sila','Tandjilé','Tibesti','Wadi Fira']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Chile (CL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aisén del General Carlos Ibañez del Campo','Antofagasta','Arica y Parinacota','Atacama','Biobío','Coquimbo','La Araucanía','Libertador General Bernardo O''Higgins','Los Lagos','Los Ríos','Magallanes y de la Antártica Chilena','Maule','Ñuble','Región Metropolitana de Santiago','Tarapacá','Valparaíso']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Colombia (CO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Amazonas','Antioquia','Arauca','Atlántico','Bogotá D.C.','Bolívar','Boyacá','Caldas','Caquetá','Casanare','Cauca','Cesar','Chocó','Córdoba','Cundinamarca','Guainía','Guaviare','Huila','La Guajira','Magdalena','Meta','Nariño','Norte de Santander','Putumayo','Quindío','Risaralda','San Andrés, Providencia y Santa Catalina','Santander','Sucre','Tolima','Valle del Cauca','Vaupés','Vichada']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Comoros (KM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anjouan','Grande Comore','Mohéli']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Congo (CG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bouenza','Brazzaville','Cuvette','Cuvette-Ouest','Kouilou','Lékoumou','Likouala','Niari','Plateaux','Pointe-Noire','Pool','Sangha']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Costa Rica (CR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alajuela','Cartago','Guanacaste','Heredia','Limón','Puntarenas','San José']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Croatia (HR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bjelovar-Bilogora','Brod-Posavina','Dubrovnik-Neretva','Istria','Karlovac','Koprivnica-Križevci','Krapina-Zagorje','Lika-Senj','Međimurje','Osijek-Baranja','Požega-Slavonia','Primorje-Gorski Kotar','Šibenik-Knin','Sisak-Moslavina','Split-Dalmatia','Varaždin','Virovitica-Podravina','Vukovar-Syrmia','Zadar','Zagreb']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'HR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cuba (CU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Artemisa','Camagüey','Ciego de Ávila','Cienfuegos','Granma','Guantánamo','Havana','Holguín','Isla de la Juventud','Las Tunas','Matanzas','Mayabeque','Pinar del Río','Sancti Spíritus','Santiago de Cuba','Villa Clara']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Cyprus (CY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Famagusta (Mağusa)','Kyrenia (Keryneia)','Larnaca (Larnaka)','Limassol (Leymasun)','Nicosia (Lefkoşa)','Paphos (Pafos)']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Czech Republic (CZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Benešov','Beroun','Blansko','Břeclav','Brno-město','Brno-venkov','Bruntál','Česká Lípa','České Budějovice','Český Krumlov','Cheb','Chomutov','Chrudim','Děčín','Domažlice','Frýdek-Místek','Havlíčkův Brod','Hodonín','Hradec Králové','Jablonec nad Nisou','Jeseník','Jičín','Jihlava','Jihočeský kraj','Jihomoravský kraj','Jindřichův Hradec','Karlovarský kraj','Karlovy Vary','Karviná','Kladno','Klatovy','Kolín','Kraj Vysočina','Královéhradecký kraj','Kroměříž','Kutná Hora','Liberec','Liberecký kraj','Litoměřice','Louny','Mělník','Mladá Boleslav','Moravskoslezský kraj','Most','Náchod','Nový Jičín','Nymburk','Olomouc','Olomoucký kraj','Opava','Ostrava-město','Pardubice','Pardubický kraj','Pelhřimov','Písek','Plzeň-jih','Plzeň-město','Plzeň-sever','Plzeňský kraj','Prachatice','Praha-východ','Praha-západ','Praha, Hlavní město','Přerov','Příbram','Prostějov','Rakovník','Rokycany','Rychnov nad Kněžnou','Semily','Sokolov','Strakonice','Středočeský kraj','Šumperk','Svitavy','Tábor','Tachov','Teplice','Třebíč','Trutnov','Uherské Hradiště','Ústecký kraj','Ústí nad Labem','Ústí nad Orlicí','Vsetín','Vyškov','Žďár nad Sázavou','Zlín','Zlínský kraj','Znojmo']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Democratic Republic of the Congo (CD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bas-Uélé','Équateur','Haut-Katanga','Haut-Lomami','Haut-Uélé','Ituri','Kasaï','Kasaï Central','Kasaï Oriental','Kinshasa','Kongo Central','Kwango','Kwilu','Lomami','Lualaba','Mai-Ndombe','Maniema','Mongala','Nord-Kivu','Nord-Ubangi','Sankuru','Sud-Kivu','Sud-Ubangi','Tanganyika','Tshopo','Tshuapa']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Denmark (DK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central Denmark','Denmark','North Denmark','Southern Denmark','Zealand']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'DK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Djibouti (DJ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ali Sabieh','Arta','Dikhil','Djibouti','Obock','Tadjourah']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'DJ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Dominica (DM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Saint Andrew','Saint David','Saint George','Saint John','Saint Joseph','Saint Luke','Saint Mark','Saint Patrick','Saint Paul','Saint Peter']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'DM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Dominican Republic (DO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Azua','Baoruco','Barahona','Cibao Nordeste','Cibao Noroeste','Cibao Norte','Cibao Sur','Dajabón','Distrito Nacional','Duarte','El Seibo','El Valle','Elías Piña','Enriquillo','Espaillat','Hato Mayor','Hermanas Mirabal','Higuamo','Independencia','La Altagracia','La Romana','La Vega','María Trinidad Sánchez','Monseñor Nouel','Monte Cristi','Monte Plata','Ozama','Pedernales','Peravia','Puerto Plata','Samaná','San Cristóbal','San José de Ocoa','San Juan','San Pedro de Macorís','Sánchez Ramírez','Santiago','Santiago Rodríguez','Santo Domingo','Valdesia','Valverde','Yuma']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'DO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Ecuador (EC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona-Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'EC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Egypt (EG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alexandria','Aswan','Asyut','Beheira','Beni Suef','Cairo','Dakahlia','Damietta','Faiyum','Gharbia','Giza','Ismailia','Kafr El-Sheikh','Luxor','Matrouh','Minya','Monufia','New Valley','North Sinai','Port Said','Qalyubia','Qena','Red Sea','Sharqia','Sohag','South Sinai','Suez']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'EG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- El Salvador (SV)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ahuachapán','Cabañas','Chalatenango','Cuscatlán','La Libertad','La Paz','La Unión ','Morazán','San Miguel','San Salvador','San Vicente','Santa Ana','Sonsonate','Usulután']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SV' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Equatorial Guinea (GQ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Annobón','Bioko Norte','Bioko Sur','Centro Sur','Djibloho','Insular','Kié-Ntem','Litoral','Río Muni','Wele-Nzas']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GQ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Eritrea (ER)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anseba','Debub','Gash-Barka','Maekel','Northern Red Sea','Southern Red Sea']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ER' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Estonia (EE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alutaguse','Anija','Antsla','Elva','Häädemeeste','Haapsalu','Haljala','Harju','Harku','Hiiu','Hiiumaa','Ida-Viru','Järva','Järva','Joelähtme','Jõgeva','Jõgeva','Jõhvi','Kadrina','Kambja','Kanepi','Kastre','Kehtna','Keila','Kihnu','Kiili','Kohila','Kohtla-Järve','Kose','Kuusalu','Lääne','Lääne-Harju','Lääne-Nigula','Lääne-Viru','Lääneranna','Loksa','Lüganuse','Luunja','Maardu','Märjamaa','Muhu','Mulgi','Mustvee','Narva','Narva-Jõesuu','Noo','Otepää','Paide','Pärnu','Pärnu','Peipsiääre','Põhja-Pärnu','Põhja-Sakala','Poltsamaa','Põlva','Põlva','Raasiku','Rae','Rakvere','Rakvere','Räpina','Rapla','Rapla','Rõuge','Ruhnu','Saarde','Saare','Saaremaa','Saku','Saue','Setomaa','Sillamäe','Tallinn','Tapa','Tartu','Tartu','Tartu','Toila','Tori','Tõrva','Türi','Väike-Maarja','Valga','Valga','Viimsi','Viljandi','Viljandi','Viljandi','Vinni','Viru-Nigula','Vormsi','Võru','Võru','Võru']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'EE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Eswatini (SZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Hhohho','Lubombo','Manzini','Shiselweni']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Ethiopia (ET)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Addis Ababa','Afar','Amhara','Benishangul-Gumuz','Dire Dawa','Gambela','Harari','Oromia','Sidama','Somali','Southern Nations, Nationalities, and Peoples','Southwest Ethiopia Peoples','Tigray']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ET' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Faroe Islands (FO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Eysturoy','Northern Isles','Sandoy','Streymoy','Suðuroy','Vágar']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'FO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Fiji Islands (FJ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ba','Bua','Cakaudrove','Central','Eastern','Kadavu','Lau','Lomaiviti','Macuata','Nadroga-Navosa','Naitasiri','Namosi','Northern','Ra','Rewa','Rotuma','Serua','Tailevu','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'FJ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Finland (FI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central Finland','Central Ostrobothnia','Finland Proper','Kainuu','Kymenlaakso','Lapland','North Karelia','Northern Ostrobothnia','Northern Savonia','Ostrobothnia','Päijänne Tavastia','Pirkanmaa','Satakunta','South Karelia','Southern Ostrobothnia','Southern Savonia','Tavastia Proper','Uusimaa']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'FI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- French Polynesia (PF)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Austral Islands','Leeward Islands','Marquesas Islands','Tuamotu-Gambier','Windward Islands']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PF' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Gabon (GA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Estuaire','Haut-Ogooué','Moyen-Ogooué','Ngounié','Nyanga','Ogooué-Ivindo','Ogooué-Lolo','Ogooué-Maritime','Woleu-Ntem']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Georgia (GE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abkhazia','Adjara','Guria','Imereti','Kakheti','Kvemo Kartli','Mtskheta-Mtianeti','Racha-Lechkhumi and Kvemo Svaneti','Samegrelo-Zemo Svaneti','Samtskhe-Javakheti','Shida Kartli','Tbilisi']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Ghana (GH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ahafo','Ashanti','Bono','Bono East','Central','Eastern','Greater Accra','North East','Northern','Oti','Savannah','Upper East','Upper West','Volta','Western','Western North']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Greece (GR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Achaea','Attica','Central Greece','Central Macedonia','Crete','East Attica','East Macedonia and Thrace','Epirus','Ionian Islands','North Aegean','Peloponnese','South Aegean','Thessaly','West Greece','West Macedonia']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Greenland (GL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Avannaata','Kujalleq','Qeqertalik','Qeqqata','Sermersooq']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Grenada (GD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Carriacou','Saint Andrew','Saint David','Saint George','Saint John','Saint Mark','Saint Patrick']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guadeloupe (GP)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Basse-Terre','Pointe-à-Pitre']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GP' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guam (GU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Agana Heights','Asan-Maina','Barrigada','Chalan Pago-Ordot','Dededo','Hågat','Hagåtña','Inarajan (Inalåhan)','Mangilao','Merizo (Malesso)','Mongmong-Toto-Maite','Piti','Santa Rita (Sånta Rita-Sumai)','Sinajana','Talofofo (Talo''fo''fo)','Tamuning','Umatac (Humåtak)','Yigo','Yona']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guatemala (GT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alta Verapaz ','Baja Verapaz ','Chimaltenango ','Chiquimula ','El Progreso ','Escuintla ','Guatemala ','Huehuetenango ','Izabal ','Jalapa ','Jutiapa ','Petén ','Quetzaltenango ','Quiché ','Retalhuleu ','Sacatepéquez ','San Marcos ','Santa Rosa ','Sololá ','Suchitepéquez ','Totonicapán ','Zacapa']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guernsey (GG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alderney','Castel','Forest','Sark','St Andrew','St Martin','St Peter Port','St Pierre du Bois','St Sampson','St Saviour','Torteval','Vale']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guinea (GN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Beyla','Boffa','Boké','Boké','Conakry','Coyah','Dabola','Dalaba','Dinguiraye','Dubréka','Faranah','Faranah','Forécariah','Fria','Gaoual','Guéckédou','Kankan','Kankan','Kérouané','Kindia','Kindia','Kissidougou','Koubia','Koundara','Kouroussa','Labé','Labé','Lélouma','Lola','Macenta','Mali','Mamou','Mamou','Mandiana','Nzérékoré','Nzérékoré','Pita','Siguiri','Télimélé','Tougué','Yomou']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guinea-Bissau (GW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bafatá','Biombo','Bissau','Bolama','Cacheu','Gabú','Leste','Norte','Oio','Quinara','Sul','Tombali']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Guyana (GY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Barima-Waini','Cuyuni-Mazaruni','Demerara-Mahaica','East Berbice-Corentyne','Essequibo Islands-West Demerara','Mahaica-Berbice','Pomeroon-Supenaam','Potaro-Siparuni','Upper Demerara-Berbice','Upper Takutu-Upper Essequibo']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Haiti (HT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Artibonite','Centre','Grand''Anse','Nippes','Nord','Nord-Est','Nord-Ouest','Ouest','Sud','Sud-Est']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'HT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Honduras (HN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Atlántida','Bay Islands','Choluteca','Colón','Comayagua','Copán','Cortés','El Paraíso','Francisco Morazán','Gracias a Dios','Intibucá','La Paz','Lempira','Ocotepeque','Olancho','Santa Bárbara','Valle','Yoro']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'HN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Hong Kong S.A.R. (HK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central and Western','Eastern','Islands','Kowloon City','Kwai Tsing','Kwun Tong','North','Sai Kung','Sha Tin','Sham Shui Po','Southern','Tai Po','Tsuen Wan','Tuen Mun','Wan Chai','Wong Tai Sin','Yau Tsim Mong','Yuen Long']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'HK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Hungary (HU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bács-Kiskun','Baranya','Békés','Békéscsaba','Borsod-Abaúj-Zemplén','Budapest','Csongrád County','Debrecen','Dunaújváros','Eger','Érd','Fejér County','Győr','Győr-Moson-Sopron County','Hajdú-Bihar County','Heves County','Hódmezővásárhely','Jász-Nagykun-Szolnok County','Kaposvár','Kecskemét','Komárom-Esztergom','Miskolc','Nagykanizsa','Nógrád County','Nyíregyháza','Pécs','Pest County','Salgótarján','Somogy County','Sopron','Szabolcs-Szatmár-Bereg County','Szeged','Székesfehérvár','Szekszárd','Szolnok','Szombathely','Tatabánya','Tolna County','Vas County','Veszprém','Veszprém County','Zala County','Zalaegerszeg']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'HU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Iceland (IS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Akranes','Akureyri','Árborg','Árneshreppur','Ásahreppur','Bláskógabyggð','Bolungarvík','Borgarbyggð','Capital','Dalabyggð','Dalvíkurbyggð','Eastern','Eyja- og Miklaholtshreppur','Eyjafjarðarsveit','Fjallabyggð','Fjarðabyggð','Fljótsdalshreppur','Flóahreppur','Garðabær','Grímsnes- og Grafningshreppur','Grindavík','Grundarfjörður','Grýtubakkahreppur','Hafnarfjörður','Hörðarsveit','Hornafjörður','Hrunamannahreppur','Húnabyggð','Húnaþing vestra','Hvalfjarðarsveit','Hveragerði','Ísafjörður','Kaldrananeshreppur','Kjósarhreppur','Kópavogur','Langanesbyggð','Mosfellsbær','Múlaþing','Mýrdalshreppur','Norðurþing','Northeastern','Northwestern','Ölfus','Rangárþing eystra','Rangárþing ytra','Reykhólahreppur','Reykjanesbær','Reykjavík','Seltjarnarnes','Skaftárhreppur','Skagabyggð','Skagafjörður','Skagaströnd','Skeiða- og Gnúpverjahreppur','Skorradalshreppur','Snæfellsbær','Southern','Southern Peninsula','Strandabyggð','Stykkishólmur','Súðavík','Suðurnesjabær','Svalbardsstrandarhreppur','Tálknafjarðarhreppur','Tjörneshreppur','Vestmannaeyjar','Vesturbyggð','Vogar','Vopnafjarðarhreppur','Western','Westfjords','Þingeyjarsveit']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'IS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Indonesia (ID)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aceh','Bali','Banten','Bengkulu','DI Yogyakarta','DKI Jakarta','Gorontalo','Jambi','Jawa','Jawa Barat','Jawa Tengah','Jawa Timur','Kalimantan','Kalimantan Barat','Kalimantan Selatan','Kalimantan Tengah','Kalimantan Timur','Kalimantan Utara','Kepulauan Bangka Belitung','Kepulauan Riau','Lampung','Maluku','Maluku','Maluku Utara','Nusa Tenggara','Nusa Tenggara Barat','Nusa Tenggara Timur','Papua','Papua','Papua Barat','Papua Barat Daya','Papua Pegunungan','Papua Selatan','Papua Tengah','Riau','Sulawesi','Sulawesi Barat','Sulawesi Selatan','Sulawesi Tengah','Sulawesi Tenggara','Sulawesi Utara','Sumatera','Sumatera Barat','Sumatera Selatan','Sumatera Utara']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ID' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Iran (IR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alborz','Ardabil','Bushehr','Chaharmahal and Bakhtiari','East Azerbaijan','Fars','Gilan','Golestan','Hamadan','Hormozgan','Ilam','Isfahan','Kerman','Kermanshah','Khuzestan','Kohgiluyeh and Boyer-Ahmad','Kurdistan','Lorestan','Markazi','Mazandaran','North Khorasan','Qazvin','Qom','Razavi Khorasan','Semnan','Sistan and Baluchestan','South Khorasan','Tehran','West Azarbaijan','Yazd','Zanjan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'IR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Iraq (IQ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Anbar','Al Muthanna','Al-Qādisiyyah','Babylon','Baghdad','Basra','Dhi Qar','Diyala','Dohuk','Erbil','Iqlim Kurdistan','Karbala','Kirkuk','Maysan','Najaf','Nineveh','Saladin','Sulaymaniyah','Wasit']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'IQ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Israel (IL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central','Haifa','Jerusalem','Northern','Southern','Tel Aviv']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'IL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Ivory Coast (CI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abidjan','Bas-Sassandra','Comoé','Denguélé','Gôh-Djiboua','Lacs','Lagunes','Montagnes','Sassandra-Marahoué','Savanes','Vallée du Bandama','Woroba','Yamoussoukro','Zanzan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'CI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Jamaica (JM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Clarendon','Hanover','Kingston','Manchester','Portland','Saint Andrew','Saint Ann','Saint Catherine','Saint Elizabeth','Saint James','Saint Mary','Saint Thomas','Trelawny','Westmoreland']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'JM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Jersey (JE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Grouville','St Brelade','St Clement','St Helier','St John','St Lawrence','St Martin','St Mary','St Ouen','St Peter','St Saviour','Trinity']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'JE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Jordan (JO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ajloun','Amman','Aqaba','Balqa','Irbid','Jerash','Karak','Ma''an','Madaba','Mafraq','Tafilah','Zarqa']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'JO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kazakhstan (KZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abai','Akmola','Aktobe','Almaty','Almaty','Astana','Atyrau','East Kazakhstan','Jambyl','Jetisu','Karaganda','Kostanay','Kyzylorda','Mangystau','North Kazakhstan','Pavlodar','Shymkent','Turkistan','Ulytau','West Kazakhstan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kenya (KE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Baringo','Bomet','Bungoma','Busia','Elgeyo-Marakwet','Embu','Garissa','Homa Bay','Isiolo','Kajiado','Kakamega','Kericho','Kiambu','Kilifi','Kirinyaga','Kisii','Kisumu','Kitui','Kwale','Laikipia','Lamu','Machakos','Makueni','Mandera','Marsabit','Meru','Migori','Mombasa','Murang''a','Nairobi City','Nakuru','Nandi','Narok','Nyamira','Nyandarua','Nyeri','Samburu','Siaya','Taita–Taveta','Tana River','Tharaka-Nithi','Trans Nzoia','Turkana','Uasin Gishu','Vihiga','Wajir','West Pokot']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kiribati (KI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Gilbert','Line','Phoenix']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kosovo (XK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ferizaj','Gjakove','Gjilan','Mitrovica','Peja','Pristina','Prizren']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'XK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kuwait (KW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Ahmadi','Al Asimah','Al Farwaniyah','Al Jahra','Hawalli','Mubarak Al-Kabeer']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Kyrgyzstan (KG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Batken','Bishkek','Chuy','Issyk-Kul','Jalal-Abad','Naryn','Osh','Osh','Talas']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Laos (LA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Attapeu','Bokeo','Bolikhamsai','Champasak','Houaphanh','Khammouane','Luang Namtha','Luang Prabang','Oudomxay','Phongsaly','Sainyabuli','Salavan','Savannakhet','Sekong','Vientiane','Vientiane','Xaisomboun','Xiangkhouang']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Latvia (LV)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ādaži','Aizkraukle','Alūksne','Augšdaugava','Balvi','Bauska','Cēsis','Daugavpils','Dienvidkurzemes','Dobele','Gulbene','Jēkabpils','Jelgava','Jelgava','Jūrmala','Ķekava','Krāslava','Kuldīga','Liepāja','Limbaži','Līvāni','Ludza','Madona','Mārupe','Ogre','Olaine','Preiļi','Rēzekne','Rēzekne','Riga','Ropaži','Salaspils','Saldus','Saulkrasti','Sigulda','Smiltene','Talsi','Tukums','Valka','Valmiera','Varakļāni','Ventspils','Ventspils']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LV' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Lebanon (LB)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Akkar','Baalbek-Hermel','Beirut','Beqaa','Mount Lebanon','Nabatieh','North','South']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LB' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Lesotho (LS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Berea','Butha-Buthe','Leribe','Mafeteng','Maseru','Mohale''s Hoek','Mokhotlong','Qacha''s Nek','Quthing','Thaba-Tseka']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Liberia (LR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bomi','Bong','Gbarpolu','Grand Bassa','Grand Cape Mount','Grand Gedeh','Grand Kru','Lofa','Margibi','Maryland','Montserrado','Nimba','River Cess','River Gee','Sinoe']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Libya (LY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Butnan','Al Wahat','Benghazi','Derna','Ghat','Jabal al Akhdar','Jabal al Gharbi','Jafara','Jufra','Kufra','Marj','Misrata','Murqub','Murzuq','Nalut','Nuqat al Khams','Sabha','Sirte','Tripoli','Wadi al Hayaa','Wadi al Shatii','Zawiya']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Liechtenstein (LI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Balzers','Eschen','Gamprin','Mauren','Planken','Ruggell','Schaan','Schellenberg','Triesen','Triesenberg','Vaduz']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Lithuania (LT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Akmenė','Alytus','Alytus','Alytus','Anykščiai','Birštonas','Biržai','Druskininkai','Elektrėnai','Ignalina','Jonava','Joniškis','Jurbarkas','Kaišiadorys','Kalvarija','Kaunas','Kaunas','Kaunas','Kazlų Rūda','Kėdainiai','Kelmė','Klaipėda','Klaipėda','Klaipėdos miestas','Kretinga','Kupiškis','Lazdijai','Marijampolė','Marijampolė','Mažeikiai','Molėtai','Neringa','Pagėgiai','Pakruojis','Palanga','Panevėžio miestas','Panevėžys','Panevėžys','Pasvalys','Plungė','Prienai','Radviliškis','Raseiniai','Rietavas','Rokiškis','Šakiai','Šalčininkai','Šiauliai','Šiauliai','Šiauliai','Šilalė ','Šilutė','Širvintos','Skuodas','Švenčionys','Tauragė','Tauragė','Telšiai','Telšiai','Trakai','Ukmergė','Utena','Utena','Varėna','Vilkaviškis','Vilnius','Vilnius','Vilnius','Visaginas','Zarasai']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Luxembourg (LU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Capellen','Clervaux','Diekirch','Echternach','Esch-sur-Alzette','Grevenmacher','Luxembourg ','Mersch','Redange','Remich','Vianden','Wiltz']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Madagascar (MG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Antananarivo','Antsiranana','Fianarantsoa','Mahajanga','Toamasina','Toliara']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Malawi (MW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Balaka','Blantyre','Central','Chikwawa','Chiradzulu','Chitipa','Dedza','Dowa','Karonga','Kasungu','Likoma','Lilongwe','Machinga','Mangochi','Mchinji','Mulanje','Mwanza','Mzimba','Neno','Nkhata Bay','Nkhotakota','Northern','Nsanje','Ntcheu','Ntchisi','Phalombe','Rumphi','Salima','Southern','Thyolo','Zomba']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Malaysia (MY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Johor','Kedah','Kelantan','Kuala Lumpur','Labuan','Malacca','Negeri Sembilan','Pahang','Penang','Perak','Perlis','Putrajaya','Sabah','Sarawak','Selangor','Terengganu']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Maldives (MV)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Addu','Alif Alif','Alif Dhaal','Baa','Dhaalu','Faafu','Gaafu Alif','Gaafu Dhaalu','Gnaviyani','Haa Alif','Haa Dhaalu','Kaafu','Laamu','Lhaviyani','Malé','Meemu','Noonu','Raa','Shaviyani','Thaa','Vaavu']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MV' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mali (ML)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bamako','Gao','Kayes','Kidal','Koulikoro','Ménaka','Mopti','Ségou','Sikasso','Taoudénit','Tombouctou']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ML' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Malta (MT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Attard','Balzan','Birgu','Birkirkara','Birżebbuġa','Cospicua','Dingli','Fgura','Floriana','Fontana','Għajnsielem','Għarb','Għargħur','Għasri','Għaxaq','Gudja','Gżira','Ħamrun','Iklin','Kalkara','Kerċem','Kirkop','Lija','Luqa','Marsa','Marsaskala','Marsaxlokk','Mdina','Mellieħa','Mġarr','Mosta','Mqabba','Msida','Mtarfa','Munxar','Nadur','Naxxar','Paola','Pembroke','Pietà','Qala','Qormi','Qrendi','Rabat','Safi','San Ġwann','San Lawrenz','Sannat','Santa Luċija','Santa Venera','Senglea','Siġġiewi','Sliema','St. Julian''s','St. Paul''s Bay','Swieqi','Ta'' Xbiex','Tarxien','Valletta','Victoria','Xagħra','Xewkija','Xgħajra','Żabbar','Żebbuġ Gozo','Żebbuġ Malta','Żejtun','Żurrieq']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Man (Isle of) (IM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ayre','Garff','Glenfaba','Michael','Middle','Rushen']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'IM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Marshall Islands (MH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ailinglaplap','Ailuk','Arno','Aur','Bikini & Kili','Ebon','Enewetak & Ujelang','Jabat','Jaluit','Kwajalein','Lae','Lib','Likiep','Majuro','Maloelap','Mejit','Mili','Namdrik','Namu','Ralik','Ratak','Rongelap','Ujae','Utrik','Wotho','Wotje']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Martinique (MQ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Fort-de-France','La Trinité','Le Marin','Saint-Pierre']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MQ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mauritania (MR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adrar','Assaba','Brakna','Dakhlet Nouadhibou','Gorgol','Guidimaka','Hodh Ech Chargui','Hodh El Gharbi','Inchiri','Nouakchott-Nord','Nouakchott-Ouest','Nouakchott-Sud','Tagant','Tiris Zemmour','Trarza']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mauritius (MU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Agalega Islands','Black River','Flacq','Grand Port','Moka','Pamplemousses','Plaines Wilhems','Port Louis','Rivière du Rempart','Rodrigues Island','Saint Brandon Islands','Savanne']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mayotte (YT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Acoua','Bandraboua','Bandrélé','Boueni','Chiconi','Chirongui','Dembeni','Dzaoudzi','Kani Keli','Koungou','M''Tsangamouji','Mamoudzou','Mtsamboro','Ouangani','Pamandzi','Sada','Tsingoni']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'YT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Micronesia (FM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Chuuk','Kosrae','Pohnpei','Yap']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'FM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Moldova (MD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anenii Noi','Bălți','Basarabeasca','Bender','Briceni','Cahul','Călărași','Cantemir','Căușeni','Chișinău','Cimișlia','Criuleni','Dondușeni','Drochia','Dubăsari','Edineț','Fălești','Florești','Gagauzia','Glodeni','Hîncești','Ialoveni','Leova','Nisporeni','Ocnița','Orhei','Rezina','Rîșcani','Sîngerei','Șoldănești','Soroca','Ștefan Vodă','Strășeni','Taraclia','Telenești','Transnistria','Ungheni']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Monaco (MC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Fontvieille','Jardin Exotique','La Colle','La Condamine','La Gare','La Source','Larvotto','Malbousquet','Monaco-Ville','Moneghetti','Monte-Carlo','Moulins','Port-Hercule','Saint-Roman','Sainte-Dévote','Spélugues','Vallon de la Rousse']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mongolia (MN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Arkhangai','Bayan-Ölgii','Bayankhongor','Bulgan','Darkhan-Uul','Dornod','Dornogovi','Dundgovi','Govi-Altai','Govisümber','Khentii','Khovd','Khövsgöl','Ömnögovi','Orkhon','Övörkhangai','Selenge','Sükhbaatar','Töv','Ulaanbaatar','Uvs','Zavkhan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Montenegro (ME)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Andrijevica','Bar','Berane','Bijelo Polje','Budva','Danilovgrad','Gusinje','Herceg-Novi','Kolašin','Kotor','Mojkovac','Nikšić','Old Royal Capital Cetinje','Petnjica','Plav','Pljevlja','Plužine','Podgorica','Rožaje','Šavnik','Tivat','Tuzi','Ulcinj','Žabljak','Zeta']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ME' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Montserrat (MS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Saint Anthony','Saint Georges','Saint Peter']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Morocco (MA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Agadir-Ida-Ou-Tanane','Al Haouz','Al Hoceïma','Aousserd (EH)','Assa-Zag (EH-partial)','Azilal','Béni Mellal','Béni Mellal-Khénifra','Benslimane','Berkane','Berrechid','Boujdour (EH)','Boulemane','Casablanca','Casablanca-Settat','Chefchaouen','Chichaoua','Chtouka-Ait Baha','Dakhla-Oued Ed-Dahab (EH)','Drâa-Tafilalet','Driouch','El Hajeb','El Jadida','El Kelâa des Sraghna','Errachidia','Es-Semara (EH-partial)','Essaouira','Fahs-Anjra','Fès','Fès-Meknès','Figuig','Fquih Ben Salah','Guelmim','Guelmim-Oued Noun (EH-partial)','Guercif','Ifrane','Inezgane-Ait Melloul','Jerada','Kénitra','Khémisset','Khénifra','Khouribga','L''Oriental','Laâyoune (EH)','Laâyoune-Sakia El Hamra (EH-partial)','Larache','M’diq-Fnideq','Marrakech','Marrakesh-Safi','Médiouna','Meknès','Midelt','Mohammadia','Moulay Yacoub','Nador','Nouaceur','Ouarzazate','Oued Ed-Dahab (EH)','Ouezzane','Oujda-Angad','Rabat','Rabat-Salé-Kénitra','Rehamna','Safi','Salé','Sefrou','Settat','Sidi Bennour','Sidi Ifni','Sidi Kacem','Sidi Slimane','Skhirate-Témara','Souss-Massa','Tan-Tan (EH-partial)','Tanger-Assilah','Tanger-Tétouan-Al Hoceïma','Taounate','Taourirt','Tarfaya (EH-partial)','Taroudannt','Tata','Taza','Tétouan','Tinghir','Tiznit','Youssoufia','Zagora']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Mozambique (MZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Cabo Delgado','Gaza','Inhambane','Manica','Maputo','Maputo','Nampula','Niassa','Sofala','Tete','Zambezia']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Myanmar (MM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ayeyarwady','Bago','Chin','Kachin','Kayah','Kayin','Magway','Mandalay','Mon State','Naypyidaw','Rakhine','Sagaing','Shan','Tanintharyi','Yangon']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Namibia (NA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Erongo','Hardap','Karas','Kavango East','Kavango West','Khomas','Kunene','Ohangwena','Omaheke','Omusati','Oshana','Oshikoto','Otjozondjupa','Zambezi']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Nauru (NR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aiwo','Anabar','Anetan','Anibare','Baiti','Boe','Buada','Denigomodu','Ewa','Ijuw','Meneng','Nibok','Uaboe','Yaren']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Nepal (NP)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bagmati','Gandaki','Karnali','Koshi','Lumbini','Madhesh','Sudurpashchim']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NP' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- New Caledonia (NC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Loyalty Islands Province','North Province','South Province']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Nicaragua (NI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Boaco','Carazo','Chinandega','Chontales','Estelí','Granada','Jinotega','León','Madriz','Managua','Masaya','Matagalpa','North Caribbean Coast','Nueva Segovia','Río San Juan','Rivas','South Caribbean Coast']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Niger (NE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Agadez','Diffa','Dosso','Maradi','Niamey','Tahoua','Tillabéri','Zinder']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Nigeria (NG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abia','Abuja Federal Capital Territory','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Niue (NU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alofi North','Alofi South','Avatele','Hakupu','Hikutavake','Lakepa','Liku','Makefu','Mutalau','Namukulu','Tamakautoga','Toi','Tuapa','Vaiea']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- North Korea (KP)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Chagang','Kaesong','Kangwon','Nampho','North Hamgyong','North Hwanghae','North Pyongan','Pyongyang','Rason','Ryanggang','South Hamgyong','South Hwanghae','South Pyongan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KP' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- North Macedonia (MK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aerodrom','Aračinovo','Berovo','Bitola','Bogdanci','Bogovinje','Bosilovo','Brvenica','Butel','Čair','Čaška','Centar','Centar Župa','Češinovo-Obleševo','Čučer-Sandevo','Debar','Debarca','Delčevo','Demir Hisar','Demir Kapija','Dojran','Dolneni','Gazi Baba','Gevgelija','Gjorče Petrov','Gostivar','Gradsko','Ilinden','Jegunovce','Karbinci','Karpoš','Kavadarci','Kičevo','Kisela Voda','Kočani','Konče','Kratovo','Kriva Palanka','Krivogaštani','Kruševo','Kumanovo','Lipkovo','Lozovo','Makedonska Kamenica','Makedonski Brod','Mavrovo and Rostuša','Mogila','Negotino','Novaci','Novo Selo','Ohrid','Pehčevo','Petrovec','Plasnica','Prilep','Probištip','Radoviš','Rankovce','Resen','Rosoman','Saraj','Sopište','Staro Nagoričane','Štip','Struga','Strumica','Studeničani','Šuto Orizari','Sveti Nikole','Tearce','Tetovo','Valandovo','Vasilevo','Veles','Vevčani','Vinica','Vrapčište','Zelenikovo','Želino','Zrnovci']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'MK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Norway (NO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Agder','Akershus','Buskerud','Finnmark','Innlandet','Jan Mayen','Møre og Romsdal','Nordland','Oslo','Østfold','Rogaland','Svalbard','Telemark','Troms','Trøndelag','Vestfold','Vestland']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'NO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Oman (OM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ad Dakhiliyah','Ad Dhahirah','Al Batinah North','Al Batinah South','Al Buraimi','Al Wusta','Ash Sharqiyah North','Ash Sharqiyah South','Dhofar','Musandam','Muscat']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'OM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Pakistan (PK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Azad Kashmir','Balochistan','Gilgit-Baltistan','Islamabad','Khyber Pakhtunkhwa','Punjab','Sindh']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Palau (PW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aimeliik','Airai','Angaur','Hatohobei','Kayangel','Koror','Melekeok','Ngaraard','Ngarchelong','Ngardmau','Ngatpang','Ngchesar','Ngeremlengui','Ngiwal','Peleliu','Sonsorol']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Palestinian Territory Occupied (PS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bethlehem','Deir El Balah','Gaza','Hebron','Jenin','Jericho ','Jerusalem (Quds)','Khan Yunis','Nablus','North Gaza','Qalqilya','Rafah','Ramallah','Salfit','Tubas','Tulkarm']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Panama (PA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bocas del Toro','Chiriquí Province','Coclé','Colón','Darién','Emberá-Wounaan Comarca','Guna','Herrera','Los Santos','Naso Tjër Di','Ngöbe-Buglé Comarca','Panamá','Panamá Oeste','Veraguas']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Papua New Guinea (PG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bougainville','Central','Chimbu','East New Britain','East Sepik','Eastern Highlands','Enga','Gulf','Hela','Jiwaka','Madang','Manus','Milne Bay','Morobe','New Ireland','Oro','Port Moresby','Sandaun','Southern Highlands','West New Britain','Western','Western Highlands']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Paraguay (PY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alto Paraguay','Alto Paraná','Amambay','Asuncion','Boquerón','Caaguazú','Caazapá','Canindeyú','Central','Concepción','Cordillera','Guairá','Itapúa','Misiones','Ñeembucú','Paraguarí','Presidente Hayes','San Pedro']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Peru (PE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Amazonas','Áncash','Apurímac','Arequipa','Ayacucho','Cajamarca','Callao','Cusco','Huancavelica','Huanuco','Ica','Junín','La Libertad','Lambayeque','Lima','Loreto','Madre de Dios','Moquegua','Municipalidad Metropolitana de Lima','Pasco','Piura','Puno','San Martín','Tacna','Tumbes','Ucayali']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Poland (PL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Greater Poland','Holy Cross','Kuyavia-Pomerania','Lesser Poland','Lower Silesia','Lublin','Lubusz','Łódź','Mazovia','Podlaskie','Pomerania','Silesia','Subcarpathia','Upper Silesia','Warmia-Masuria','West Pomerania']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Puerto Rico (PR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adjuntas','Aguada','Aguadilla','Aguas Buenas','Aibonito','Añasco','Arecibo','Arroyo','Barceloneta','Barranquitas','Bayamon','Cabo Rojo','Caguas','Camuy','Canóvanas','Carolina','Cataño','Cayey','Ceiba','Ciales','Cidra','Coamo','Comerío','Corozal','Culebra','Dorado','Fajardo','Florida','Guánica','Guayama','Guayanilla','Guaynabo','Gurabo','Hatillo','Hormigueros','Humacao','Isabela','Jayuya','Juana Díaz','Juncos','Lajas','Lares','Las Marías','Las Piedras','Loíza','Luquillo','Manatí','Maricao','Maunabo','Mayagüez','Moca','Morovis','Naguabo','Naranjito','Orocovis','Patillas','Peñuelas','Ponce','Quebradillas','Rincón','Río Grande','Sabana Grande','Salinas','San Germán','San Juan','San Lorenzo','San Sebastián','Santa Isabel','Toa Alta','Toa Baja','Trujillo Alto','Utuado','Vega Alta','Vega Baja','Vieques','Villalba','Yabucoa','Yauco']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'PR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Qatar (QA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Daayen','Al Khor','Al Rayyan','Al Wakrah','Al-Shahaniya','Doha','Madinat ash Shamal','Umm Salal']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'QA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Reunion (RE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Saint-Benoît','Saint-Denis','Saint-Paul','Saint-Pierre']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'RE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Romania (RO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alba','Arad','Arges','Bacău','Bihor','Bistrița-Năsăud','Botoșani','Braila','Brașov','Bucharest','Buzău','Călărași','Caraș-Severin','Cluj','Constanța','Covasna','Dâmbovița','Dolj','Galați','Giurgiu','Gorj','Harghita','Hunedoara','Ialomița','Iași','Ilfov','Maramureș','Mehedinți','Mureș','Neamț','Olt','Prahova','Sălaj','Satu Mare','Sibiu','Suceava','Teleorman','Timiș','Tulcea','Vâlcea','Vaslui','Vrancea']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'RO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Russia (RU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adygea','Altai','Altai','Amur','Arkhangelsk','Astrakhan','Bashkortostan','Belgorod','Bryansk','Buryatia','Chechen','Chelyabinsk','Chukotka','Chuvash','Dagestan','Ingushetia','Irkutsk','Ivanovo','Jewish','Kabardino-Balkar','Kaliningrad','Kalmykia','Kaluga','Kamchatka','Karachay-Cherkess','Karelia','Kemerovo','Khabarovsk','Khakassia','Khanty-Mansi','Kirov','Komi','Kostroma','Krasnodar','Krasnoyarsk','Kurgan','Kursk','Leningrad','Lipetsk','Magadan','Mari El','Mordovia','Moscow','Moscow','Murmansk','Nenets','Nizhny Novgorod','North Ossetia-Alania','Novgorod','Novosibirsk','Omsk','Orenburg','Oryol','Penza','Perm','Primorsky','Pskov','Rostov','Ryazan','Saint Petersburg','Sakha','Sakhalin','Samara','Saratov','Smolensk','Stavropol','Sverdlovsk','Tambov','Tatarstan','Tomsk','Tula','Tuva','Tver','Tyumen','Udmurt','Ulyanovsk','Vladimir','Volgograd Oblast','Vologda','Voronezh','Yamalo-Nenets','Yaroslavl','Zabaykalsky']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'RU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Rwanda (RW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Eastern','Kigali','Northern','Southern','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'RW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Saint Helena (SH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alarm Forest','Blue Hill','Half Tree Hollow','Jamestown','Levelwood','Longwood','Saint Paul''s','Sandy Bay']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Saint Kitts and Nevis (KN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Christ Church Nichola Town','Nevis','Saint Anne Sandy Point','Saint George Basseterre','Saint George Gingerland','Saint James Windward','Saint John Capisterre','Saint John Figtree','Saint Kitts','Saint Mary Cayon','Saint Paul Capisterre','Saint Paul Charlestown','Saint Peter Basseterre','Saint Thomas Lowland','Saint Thomas Middle Island','Trinity Palmetto Point']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Saint Lucia (LC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anse la Raye','Canaries','Castries','Choiseul','Dennery','Gros Islet','Laborie','Micoud','Soufrière','Vieux Fort']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Saint Vincent and the Grenadines (VC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Charlotte','Grenadines','Saint Andrew','Saint David','Saint George','Saint Patrick']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'VC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Samoa (WS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['A''ana','Aiga-i-le-Tai','Atua','Fa''asaleleaga','Gaga''emauga','Gaga''ifomauga','Palauli','Satupa''itea','Tuamasaga','Va''a-o-Fonoti','Vaisigano']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'WS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- San Marino (SM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Acquaviva','Borgo Maggiore','Chiesanuova','Domagnano','Faetano','Fiorentino','Montegiardino','San Marino','Serravalle']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Sao Tome and Principe (ST)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Água Grande','Cantagalo','Caué','Lemba','Lobata','Mé-Zóchi','Príncipe']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ST' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Saudi Arabia (SA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Bahah','Al Jawf','Al Madinah','Al-Qassim','Asir','Eastern Province','Ha''il','Jizan','Makkah','Najran','Northern Borders','Riyadh','Tabuk']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Senegal (SN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Dakar','Diourbel Region','Fatick','Kaffrine','Kaolack','Kédougou','Kolda','Louga','Matam','Saint-Louis','Sédhiou','Tambacounda Region','Thiès Region','Ziguinchor']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Serbia (RS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Belgrade','Bor','Braničevo','Central Banat','Jablanica','Kolubara','Kosovo','Kosovo-Metohija','Kosovo-Pomoravlje','Kosovska Mitrovica','Mačva','Moravica','Nišava','North Bačka','North Banat','Pčinja','Peć','Pirot','Podunavlje','Pomoravlje','Prizren','Rasina','Raška','South Bačka','South Banat','Srem','Šumadija','Toplica','Vojvodina','West Bačka','Zaječar','Zlatibor']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'RS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Seychelles (SC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Anse Boileau','Anse Etoile','Anse Royale','Anse-aux-Pins','Au Cap','Baie Lazare','Baie Sainte Anne','Beau Vallon','Bel Air','Bel Ombre','Cascade','Glacis','Grand''Anse Mahé','Grand''Anse Praslin','Ile Perseverance I','Ile Perseverance II','La Digue','La Rivière Anglaise','Les Mamelles','Mont Buxton','Mont Fleuri','Plaisance','Pointe La Rue','Port Glaud','Roche Caiman','Saint Louis','Takamaka']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Sierra Leone (SL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Eastern','North Western','Northern','Southern','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Singapore (SG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central Singapore','North East','North West','South East','South West']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Slovakia (SK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Banská Bystrica','Bratislava','Košice','Nitra','Prešov','Trenčín','Trnava','Žilina']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Slovenia (SI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ajdovščina','Ankaran','Apače','Beltinci','Benedikt','Bistrica ob Sotli','Bled','Bloke','Bohinj','Borovnica','Bovec','Braslovče','Brda','Brežice','Brezovica','Cankova','Celje','Cerklje na Gorenjskem','Cerknica','Cerkno','Cerkvenjak','Cirkulane','Črenšovci','Črna na Koroškem','Črnomelj','Destrnik','Divača','Dobje','Dobrepolje','Dobrna','Dobrova–Polhov Gradec','Dobrovnik','Dol pri Ljubljani','Dolenjske Toplice','Domžale','Dornava','Dravograd','Duplek','Gorenja Vas–Poljane','Gorišnica','Gorje','Gornja Radgona','Gornji Grad','Gornji Petrovci','Grad','Grosuplje','Hajdina','Hoče–Slivnica','Hodoš','Horjul','Hrastnik','Hrpelje–Kozina','Idrija','Ig','Ilirska Bistrica','Ivančna Gorica','Izola','Jesenice','Jezersko','Juršinci','Kamnik','Kanal ob Soči','Kidričevo','Kobarid','Kobilje','Kočevje','Komen','Komenda','Koper','Kostanjevica na Krki','Kostel','Kozje','Kranj','Kranjska Gora','Križevci','Krško','Kungota','Kuzma','Laško','Lenart','Lendava','Litija','Ljubljana','Ljubno','Ljutomer','Log–Dragomer','Logatec','Loška Dolina','Loški Potok','Lovrenc na Pohorju','Luče','Lukovica','Majšperk','Makole','Maribor','Markovci','Medvode','Mengeš','Metlika','Mežica','Miklavž na Dravskem Polju','Miren–Kostanjevica','Mirna','Mirna Peč','Mislinja','Mokronog–Trebelno','Moravče','Moravske Toplice','Mozirje','Murska Sobota','Muta','Naklo','Nazarje','Nova Gorica','Novo Mesto','Odranci','Oplotnica','Ormož','Osilnica','Pesnica','Piran','Pivka','Podčetrtek','Podlehnik','Podvelka','Poljčane','Polzela','Postojna','Prebold','Preddvor','Prevalje','Ptuj','Puconci','Rače–Fram','Radeče','Radenci','Radlje ob Dravi','Radovljica','Ravne na Koroškem','Razkrižje','Rečica ob Savinji','Renče–Vogrsko','Ribnica','Ribnica na Pohorju','Rogaška Slatina','Rogašovci','Rogatec','Ruše','Šalovci','Selnica ob Dravi','Semič','Šempeter–Vrtojba','Šenčur','Šentilj','Šentjernej','Šentjur','Šentrupert','Sevnica','Sežana','Škocjan','Škofja Loka','Škofljica','Slovenj Gradec','Slovenska Bistrica','Slovenske Konjice','Šmarje pri Jelšah','Šmarješke Toplice','Šmartno ob Paki','Šmartno pri Litiji','Sodražica','Solčava','Šoštanj','Središče ob Dravi','Starše','Štore','Straža','Sveta Ana','Sveta Trojica v Slovenskih Goricah','Sveti Andraž v Slovenskih Goricah','Sveti Jurij ob Ščavnici','Sveti Jurij v Slovenskih Goricah','Sveti Tomaž','Tabor','Tišina','Tolmin','Trbovlje','Trebnje','Trnovska Vas','Tržič','Trzin','Turnišče','Velenje','Velika Polana','Velike Lašče','Veržej','Videm','Vipava','Vitanje','Vodice','Vojnik','Vransko','Vrhnika','Vuzenica','Zagorje ob Savi','Žalec','Zavrč','Železniki','Žetale','Žiri','Žirovnica','Zreče','Žužemberk']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Solomon Islands (SB)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central','Choiseul','Guadalcanal','Honiara','Isabel','Makira-Ulawa','Malaita','Rennell and Bellona','Temotu','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SB' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Somalia (SO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Awdal','Bakool','Banaadir','Bari','Bay','Galguduud','Gedo','Hiran','Lower Juba','Lower Shebelle','Middle Juba','Middle Shebelle','Mudug','Nugal','Sanaag','Sool','Togdheer','Woqooyi Galbeed']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- South Korea (KR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Busan','Daegu','Daejeon','Gangwon','Gwangju','Gyeonggi','Incheon','Jeju','North Chungcheong','North Gyeongsang','North Jeolla','Sejong City','Seoul','South Chungcheong','South Gyeongsang','South Jeolla','Ulsan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'KR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- South Sudan (SS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central Equatoria','Eastern Equatoria','Jonglei State','Lakes','Northern Bahr el Ghazal','Unity','Upper Nile','Warrap','Western Bahr el Ghazal','Western Equatoria']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Sri Lanka (LK)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ampara','Anuradhapura','Badulla','Batticaloa','Central','Colombo','Eastern','Galle','Gampaha','Hambantota','Jaffna','Kalutara','Kandy','Kegalle','Kilinochchi','Kurunegala','Mannar','Matale','Matara','Monaragala','Mullaitivu','North Central','North Western','Northern','Nuwara Eliya','Polonnaruwa','Puttalam','Ratnapura','Sabaragamuwa','Southern','Trincomalee','Uva','Vavuniya','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'LK' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Sudan (SD)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al Jazirah','Al Qadarif','Blue Nile','Central Darfur','East Darfur','Kassala','Khartoum','North Darfur','North Kordofan','Northern','Red Sea','River Nile','Sennar','South Darfur','South Kordofan','West Darfur','West Kordofan','White Nile']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SD' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Suriname (SR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Brokopondo','Commewijne','Coronie','Marowijne','Nickerie','Para','Paramaribo','Saramacca','Sipaliwini','Wanica']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Sweden (SE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Blekinge','Dalarna','Gävleborg','Gotland','Halland','Jämtland','Jönköping','Kalmar','Kronoberg','Norrbotten','Örebro','Östergötland','Skåne','Södermanland','Stockholm','Uppsala','Värmland','Västerbotten','Västernorrland','Västmanland','Västra Götaland']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Syria (SY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Al-Hasakah','Al-Raqqah','Aleppo','As-Suwayda','Damascus','Daraa','Deir ez-Zor','Hama','Homs','Idlib','Latakia','Quneitra','Rif Dimashq','Tartus']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'SY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Taiwan (TW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Changhua','Chiayi','Chiayi County','Hsinchu','Hsinchu County','Hualien','Kaohsiung','Keelung','Kinmen','Lienchiang','Miaoli','Nantou','New Taipei','Penghu','Pingtung','Taichung','Tainan','Taipei','Taitung','Taoyuan','Yilan','Yunlin']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Tajikistan (TJ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Dushanbe','Gorno-Badakhshan','Khatlon','Nohiyahoi Tobei Jumhurí ','Sughd ']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TJ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Tanzania (TZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Arusha','Dar es Salaam','Dodoma','Geita','Iringa','Kagera','Katavi','Kigoma','Kilimanjaro','Lindi','Manyara','Mara','Mbeya','Morogoro','Mtwara','Mwanza','Njombe','Pemba North','Pemba South','Pwani','Rukwa','Ruvuma','Shinyanga','Simiyu','Singida','Songwe','Tabora','Tanga','Zanzibar North','Zanzibar South','Zanzibar West']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Thailand (TH)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Amnat Charoen','Ang Thong','Bangkok','Bueng Kan','Buri Ram','Chachoengsao','Chai Nat','Chaiyaphum','Chanthaburi','Chiang Mai','Chiang Rai','Chon Buri','Chumphon','Kalasin','Kamphaeng Phet','Kanchanaburi','Khon Kaen','Krabi','Lampang','Lamphun','Loei','Lop Buri','Mae Hong Son','Maha Sarakham','Mukdahan','Nakhon Nayok','Nakhon Pathom','Nakhon Phanom','Nakhon Ratchasima','Nakhon Sawan','Nakhon Si Thammarat','Nan','Narathiwat','Nong Bua Lam Phu','Nong Khai','Nonthaburi','Pathum Thani','Pattani','Pattaya','Phangnga','Phatthalung','Phayao','Phetchabun','Phetchaburi','Phichit','Phitsanulok','Phra Nakhon Si Ayutthaya','Phrae','Phuket','Prachin Buri','Prachuap Khiri Khan','Ranong','Ratchaburi','Rayong','Roi Et','Sa Kaeo','Sakon Nakhon','Samut Prakan','Samut Sakhon','Samut Songkhram','Saraburi','Satun','Si Sa Ket','Sing Buri','Songkhla','Sukhothai','Suphan Buri','Surat Thani','Surin','Tak','Trang','Trat','Ubon Ratchathani','Udon Thani','Uthai Thani','Uttaradit','Yala','Yasothon']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TH' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- The Bahamas (BS)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Acklins','Berry Islands','Bimini','Black Point','Cat Island','Central Abaco','Central Andros','Central Eleuthera','Crooked Island','East Grand Bahama','Exuma','Freeport','Grand Cay','Harbour Island','Hope Town','Inagua','Long Island','Mangrove Cay','Mayaguana','Moore''s Island','New Providence','North Abaco','North Andros','North Eleuthera','Ragged Island','Rum Cay','San Salvador Island','South Abaco','South Andros','South Eleuthera','Spanish Wells','West Grand Bahama']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'BS' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- The Gambia (GM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Banjul','Central River','Lower River','North Bank','Upper River','West Coast']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'GM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Timor-Leste (TL)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Aileu','Ainaro','Baucau','Bobonaro','Cova Lima','Dili','Ermera','Lautém','Liquiçá','Manatuto','Manufahi','Oecusse','Viqueque']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TL' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Togo (TG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Centrale','Kara','Maritime','Plateaux','Savanes']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Tonga (TO)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Haʻapai','ʻEua','Niuas','Tongatapu','Vavaʻu']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TO' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Trinidad and Tobago (TT)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Arima','Chaguanas','Couva-Tabaquite-Talparo','Diego Martin','Eastern Tobago','Penal-Debe','Point Fortin','Port of Spain','Princes Town','Rio Claro-Mayaro','San Fernando','San Juan-Laventille','Sangre Grande','Siparia','Tobago','Tunapuna-Piarco','Western Tobago']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TT' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Tunisia (TN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ariana','Béja','Ben Arous','Bizerte','Gabès','Gafsa','Jendouba','Kairouan','Kasserine','Kebili','Kef','Mahdia','Manouba','Medenine','Monastir','Nabeul','Sfax','Sidi Bouzid','Siliana','Sousse','Tataouine','Tozeur','Tunis','Zaghouan']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Turkey (TR)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Adana','Adıyaman','Afyonkarahisar','Ağrı','Aksaray','Amasya','Ankara','Antalya','Ardahan','Artvin','Aydın','Balıkesir','Bartın','Batman','Bayburt','Bilecik','Bingöl','Bitlis','Bolu','Burdur','Bursa','Çanakkale','Çankırı','Çorum','Denizli','Diyarbakır','Düzce','Edirne','Elazığ','Erzincan','Erzurum','Eskişehir','Gaziantep','Giresun','Gümüşhane','Hakkâri','Hatay','Iğdır','Isparta','İstanbul','İzmir','Kahramanmaraş','Karabük','Karaman','Kars','Kastamonu','Kayseri','Kilis','Kırıkkale','Kırklareli','Kırşehir','Kocaeli','Konya','Kütahya','Malatya','Manisa','Mardin','Mersin','Muğla','Muş','Nevşehir','Niğde','Ordu','Osmaniye','Rize','Sakarya','Samsun','Şanlıurfa','Siirt','Sinop','Sivas','Şırnak','Tekirdağ','Tokat','Trabzon','Tunceli','Uşak','Van','Yalova','Yozgat','Zonguldak']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TR' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Turkmenistan (TM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Ahal','Ashgabat','Balkan','Daşoguz','Lebap','Mary']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Turks and Caicos Islands (TC)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Grand Turk','Middle Caicos','North Caicos','Providenciales','Salt Cay','South Caicos']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TC' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Tuvalu (TV)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Funafuti','Nanumanga','Nanumea','Niutao Island Council','Nui','Nukufetau','Nukulaelae','Vaitupu']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'TV' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Uganda (UG)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abim','Adjumani','Agago','Alebtong','Amolatar','Amudat','Amuria','Amuru','Apac','Arua','Budaka','Bududa','Bugiri','Bugweri','Buhweju','Buikwe','Bukedea','Bukomansimbi','Bukwo','Bulambuli','Buliisa','Bundibugyo','Bunyangabu','Bushenyi','Busia','Butaleja','Butambala','Butebo','Buvuma','Buyende','Central','Dokolo','Eastern','Gomba','Gulu','Hoima','Ibanda','Iganga','Isingiro','Jinja','Kaabong','Kabale','Kabarole','Kaberamaido','Kagadi','Kakumiro','Kalaki','Kalangala','Kaliro','Kalungu','Kampala','Kamuli','Kamwenge','Kanungu','Kapchorwa','Kapelebyong','Karenga','Kasanda','Kasese','Katakwi','Kayunga','Kazo','Kibaale','Kiboga','Kibuku','Kikuube','Kiruhura','Kiryandongo','Kisoro','Kitagwenda','Kitgum','Koboko','Kole','Kotido','Kumi','Kwania','Kween','Kyankwanzi','Kyegegwa','Kyenjojo','Kyotera','Lamwo','Lira','Luuka','Luwero','Lwengo','Lyantonde','Madi-Okollo','Manafwa','Maracha','Masaka','Masindi','Mayuge','Mbale','Mbarara','Mitooma','Mityana','Moroto','Moyo','Mpigi','Mubende','Mukono','Nabilatuk','Nakapiripirit','Nakaseke','Nakasongola','Namayingo','Namisindwa','Namutumba','Napak','Nebbi','Ngora','Northern','Ntoroko','Ntungamo','Nwoya','Obongi','Omoro','Otuke','Oyam','Pader','Pakwach','Pallisa','Rakai','Rubanda','Rubirizi','Rukiga','Rukungiri','Rwampara','Sembabule','Serere','Sheema','Sironko','Soroti','Tororo','Wakiso','Western','Yumbe','Zombo']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'UG' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Ukraine (UA)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Autonomous Republic of Crimea','Cherkaska','Chernihivska','Chernivetska','Dnipropetrovska','Donetska','Ivano-Frankivska','Kharkivska','Khersonska','Khmelnytska','Kirovohradska','Kyiv','Kyivska','Luhanska','Lvivska','Mykolaivska','Odeska','Poltavska','Rivnenska','Sevastopol','Sumska','Ternopilska','Vinnytska','Volynska','Zakarpatska','Zaporizka','Zhytomyrska']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'UA' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- United Arab Emirates (AE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abu Dhabi','Ajman','Dubai','Fujairah','Ras Al Khaimah','Sharjah','Umm Al Quwain']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'AE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- United States Minor Outlying Islands (UM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Baker Island','Howland Island','Jarvis Island','Johnston Atoll','Kingman Reef','Midway Islands','Navassa Island','Palmyra Atoll','Wake Island']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'UM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Uruguay (UY)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Artigas','Canelones','Cerro Largo','Colonia','Durazno','Flores','Florida','Lavalleja','Maldonado','Montevideo','Paysandú','Río Negro','Rivera','Rocha','Salto','San José','Soriano','Tacuarembó','Treinta y Tres']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'UY' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Uzbekistan (UZ)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Andijan','Bukhara','Fergana','Jizzakh','Karakalpakstan','Namangan','Navoiy','Qashqadaryo','Samarqand','Sirdaryo','Surxondaryo','Tashkent','Tashkent','Xorazm']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'UZ' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Vanuatu (VU)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Malampa','Penama','Sanma','Shefa','Tafea','Torba']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'VU' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Venezuela (VE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Distrito Capital','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Venezuela','Yaracuy','Zulia']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'VE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Vietnam (VN)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['An Giang','Bắc Ninh','Cà Mau','Cần Thơ','Cao Bằng','Đà Nẵng','Đắk Lắk','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Nội','Hà Tĩnh','Hải Phòng','Hồ Chí Minh','Hưng Yên','Khánh Hòa','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Nghệ An','Ninh Bình','Phú Thọ','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sơn La','Tây Ninh','Thái Nguyên','Thanh Hóa','Thừa Thiên-Huế','Tuyên Quang','Vĩnh Long']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'VN' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Virgin Islands (US) (VI)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Saint Croix','Saint John','Saint Thomas']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'VI' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Wallis and Futuna Islands (WF)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Alo','Sigave','Uvea']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'WF' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Yemen (YE)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Abyan','Ad Dali''','Adan','Al Bayda''','Al Hudaydah','Al Jawf','Al Mahrah','Al Mahwit','Amanat Al Asimah','Amran','Dhamar','Hadhramaut','Hajjah','Ibb','Lahij','Ma''rib','Raymah','Saada','Sana''a','Shabwah','Socotra','Ta''izz']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'YE' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Zambia (ZM)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Central','Copperbelt','Eastern','Luapula','Lusaka','Muchinga','Northern','Northwestern','Southern','Western']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ZM' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);

-- Zimbabwe (ZW)
INSERT INTO public.regions (country_id, name, type)
SELECT id, unnest(ARRAY['Bulawayo','Harare','Manicaland','Mashonaland Central','Mashonaland East','Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands']), 'state'
FROM public.countries c WHERE c.code_alpha2 = 'ZW' AND NOT EXISTS (SELECT 1 FROM public.regions r WHERE r.country_id = c.id);
