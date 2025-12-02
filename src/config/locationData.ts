// Comprehensive location data for state/province selection

export const US_STATES_AND_TERRITORIES = [
  // 50 States
  "Alabama", "Alaska", "Arizona", "Arkansas", "California",
  "Colorado", "Connecticut", "Delaware", "Florida", "Georgia",
  "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa",
  "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland",
  "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
  "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey",
  "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio",
  "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina",
  "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
  // Territories
  "Washington D.C.", "Puerto Rico", "Guam", "U.S. Virgin Islands", 
  "American Samoa", "Northern Mariana Islands"
];

export const CANADA_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Nova Scotia", "Ontario",
  "Prince Edward Island", "Quebec", "Saskatchewan",
  "Northwest Territories", "Nunavut", "Yukon"
];

export const UK_REGIONS = [
  "England", "Scotland", "Wales", "Northern Ireland"
];

export const AUSTRALIA_STATES = [
  "New South Wales", "Victoria", "Queensland", "Western Australia",
  "South Australia", "Tasmania", "Australian Capital Territory", "Northern Territory"
];

export const GERMANY_STATES = [
  "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern",
  "North Rhine-Westphalia", "Rhineland-Palatinate", "Saarland",
  "Saxony", "Saxony-Anhalt", "Schleswig-Holstein", "Thuringia"
];

export const FRANCE_REGIONS = [
  "Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Brittany",
  "Centre-Val de Loire", "Corsica", "Grand Est", "Hauts-de-France",
  "Île-de-France", "Normandy", "Nouvelle-Aquitaine", "Occitanie",
  "Pays de la Loire", "Provence-Alpes-Côte d'Azur",
  "French Guiana", "Guadeloupe", "Martinique", "Mayotte", "Réunion"
];

export const SPAIN_COMMUNITIES = [
  "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country",
  "Canary Islands", "Cantabria", "Castile and León", "Castile-La Mancha",
  "Catalonia", "Extremadura", "Galicia", "La Rioja", "Madrid",
  "Murcia", "Navarre", "Valencian Community"
];

export const ITALY_REGIONS = [
  "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria",
  "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio",
  "Liguria", "Lombardy", "Marche", "Molise", "Piedmont",
  "Sardinia", "Sicily", "Trentino-Alto Adige", "Tuscany", "Umbria", "Veneto"
];

export const MEXICO_STATES = [
  "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
  "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato",
  "Guerrero", "Hidalgo", "Jalisco", "México", "Mexico City", "Michoacán",
  "Morelos", "Nayarit", "Nuevo León", "Oaxaca", "Puebla", "Querétaro",
  "Quintana Roo", "San Luis Potosí", "Sinaloa", "Sonora", "Tabasco",
  "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas"
];

export const BRAZIL_STATES = [
  "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará",
  "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão",
  "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais", "Pará",
  "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro",
  "Rio Grande do Norte", "Rio Grande do Sul", "Rondônia", "Roraima",
  "Santa Catarina", "São Paulo", "Sergipe", "Tocantins"
];

export const getRegionsForCountry = (country: string): string[] => {
  switch (country) {
    case "United States":
      return US_STATES_AND_TERRITORIES;
    case "Canada":
      return CANADA_PROVINCES;
    case "United Kingdom":
      return UK_REGIONS;
    case "Australia":
      return AUSTRALIA_STATES;
    case "Germany":
      return GERMANY_STATES;
    case "France":
      return FRANCE_REGIONS;
    case "Spain":
      return SPAIN_COMMUNITIES;
    case "Italy":
      return ITALY_REGIONS;
    case "Mexico":
      return MEXICO_STATES;
    case "Brazil":
      return BRAZIL_STATES;
    default:
      return [];
  }
};

export const getRegionLabel = (country: string): string => {
  switch (country) {
    case "United States":
      return "State";
    case "Canada":
      return "Province/Territory";
    case "United Kingdom":
      return "Nation/Region";
    case "Australia":
      return "State/Territory";
    case "Germany":
      return "Bundesland";
    case "France":
      return "Region";
    case "Spain":
      return "Autonomous Community";
    case "Italy":
      return "Region";
    case "Mexico":
      return "State";
    case "Brazil":
      return "State";
    default:
      return "State/Province";
  }
};
