export const GROUPS = [
  { id: 'A', teams: [ ['MEX','México','🇲🇽'], ['RSA','Sudáfrica','🇿🇦'], ['KOR','Corea del Sur','🇰🇷'], ['CZE','Chequia','🇨🇿'] ] },
  { id: 'B', teams: [ ['CAN','Canadá','🇨🇦'], ['BIH','Bosnia y Herzegovina','🇧🇦'], ['QAT','Qatar','🇶🇦'], ['SUI','Suiza','🇨🇭'] ] },
  { id: 'C', teams: [ ['BRA','Brasil','🇧🇷'], ['MAR','Marruecos','🇲🇦'], ['HAI','Haití','🇭🇹'], ['SCO','Escocia','🏴'] ] },
  { id: 'D', teams: [ ['USA','Estados Unidos','🇺🇸'], ['PAR','Paraguay','🇵🇾'], ['AUS','Australia','🇦🇺'], ['TUR','Turquía','🇹🇷'] ] },
  { id: 'E', teams: [ ['GER','Alemania','🇩🇪'], ['CUW','Curazao','🇨🇼'], ['CIV','Costa de Marfil','🇨🇮'], ['ECU','Ecuador','🇪🇨'] ] },
  { id: 'F', teams: [ ['NED','Países Bajos','🇳🇱'], ['JPN','Japón','🇯🇵'], ['SWE','Suecia','🇸🇪'], ['TUN','Túnez','🇹🇳'] ] },
  { id: 'G', teams: [ ['BEL','Bélgica','🇧🇪'], ['EGY','Egipto','🇪🇬'], ['IRN','Irán','🇮🇷'], ['NZL','Nueva Zelanda','🇳🇿'] ] },
  { id: 'H', teams: [ ['ESP','España','🇪🇸'], ['CPV','Cabo Verde','🇨🇻'], ['KSA','Arabia Saudita','🇸🇦'], ['URU','Uruguay','🇺🇾'] ] },
  { id: 'I', teams: [ ['FRA','Francia','🇫🇷'], ['SEN','Senegal','🇸🇳'], ['IRQ','Irak','🇮🇶'], ['NOR','Noruega','🇳🇴'] ] },
  { id: 'J', teams: [ ['ARG','Argentina','🇦🇷'], ['ALG','Argelia','🇩🇿'], ['AUT','Austria','🇦🇹'], ['JOR','Jordania','🇯🇴'] ] },
  { id: 'K', teams: [ ['POR','Portugal','🇵🇹'], ['COD','RD Congo','🇨🇩'], ['UZB','Uzbekistán','🇺🇿'], ['COL','Colombia','🇨🇴'] ] },
  { id: 'L', teams: [ ['ENG','Inglaterra','🏴'], ['CRO','Croacia','🇭🇷'], ['GHA','Ghana','🇬🇭'], ['PAN','Panamá','🇵🇦'] ] },
];

export const buildGroupMatches = () => GROUPS.flatMap(group => {
  const [a,b,c,d] = group.teams;
  const pairings = [[a,b],[c,d],[a,c],[d,b],[d,a],[b,c]];
  return pairings.map((pair, index) => ({
    id: `${group.id}${index+1}`,
    groupId: group.id,
    round: 'GRUPOS',
    matchNo: `${group.id}-${index+1}`,
    home: pair[0][0],
    away: pair[1][0]
  }));
});

export const TEAMS = Object.fromEntries(GROUPS.flatMap(g => g.teams.map(([code,name,flag]) => [code, {code,name,flag,groupId:g.id}])));

export const ROUND_OF_32_TEMPLATE = [
  ['M73','1A','3C/E/F/H/I'], ['M74','2A','2B'], ['M75','1C','2F'], ['M76','1E','3A/B/C/D/F'],
  ['M77','1I','3C/D/F/G/H'], ['M78','2E','2I'], ['M79','1G','3A/E/H/I/J'], ['M80','2D','2G'],
  ['M81','1B','3D/E/F/I/J'], ['M82','1F','2C'], ['M83','1D','3B/E/F/I/J'], ['M84','1H','2J'],
  ['M85','1J','2H'], ['M86','1K','3D/E/I/J/L'], ['M87','2K','2L'], ['M88','1L','3E/H/I/J/K']
];


export const PHASE32_OFFICIAL_MATCHES = [
  { id:'M73', matchNo:'16°-1', phase:'ROUND_OF_32', home:'RSA', away:'CAN', kickoff:'2026-06-28T16:00:00-07:00', venue:'Los Ángeles Stadium' },
  { id:'M74', matchNo:'16°-2', phase:'ROUND_OF_32', home:'BRA', away:'JPN', kickoff:'2026-06-29T14:00:00-05:00', venue:'Houston Stadium' },
  { id:'M75', matchNo:'16°-3', phase:'ROUND_OF_32', home:'GER', away:'PAR', kickoff:'2026-06-29T17:30:00-04:00', venue:'Boston Stadium' },
  { id:'M76', matchNo:'16°-4', phase:'ROUND_OF_32', home:'NED', away:'MAR', kickoff:'2026-06-29T22:00:00-06:00', venue:'Estadio Monterrey' },
  { id:'M77', matchNo:'16°-5', phase:'ROUND_OF_32', home:'FRA', away:'SWE', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M78', matchNo:'16°-6', phase:'ROUND_OF_32', home:'POR', away:'CRO', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M79', matchNo:'16°-7', phase:'ROUND_OF_32', home:'ESP', away:'AUT', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M80', matchNo:'16°-8', phase:'ROUND_OF_32', home:'USA', away:'BIH', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M81', matchNo:'16°-9', phase:'ROUND_OF_32', home:'BEL', away:'SEN', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M82', matchNo:'16°-10', phase:'ROUND_OF_32', home:'CIV', away:'NOR', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M83', matchNo:'16°-11', phase:'ROUND_OF_32', home:'MEX', away:'ECU', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M84', matchNo:'16°-12', phase:'ROUND_OF_32', home:'ENG', away:'COD', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M85', matchNo:'16°-13', phase:'ROUND_OF_32', home:'ARG', away:'CPV', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M86', matchNo:'16°-14', phase:'ROUND_OF_32', home:'AUS', away:'EGY', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M87', matchNo:'16°-15', phase:'ROUND_OF_32', home:'SUI', away:'ALG', kickoff:null, venue:'Sede FIFA por confirmar en app' },
  { id:'M88', matchNo:'16°-16', phase:'ROUND_OF_32', home:'COL', away:'GHA', kickoff:null, venue:'Sede FIFA por confirmar en app' }
];


// Llave oficial definida para Pronóstico 16° (no se recalcula desde grupos).
export const ROUND_OF_32_REAL_FIXTURES = [
  {
    "id": "R32-01",
    "matchNumber": 73,
    "home": {
      "code": "GER",
      "name": "Alemania",
      "flag": "🇩🇪"
    },
    "away": {
      "code": "PAR",
      "name": "Paraguay",
      "flag": "🇵🇾"
    },
    "date": "2026-06-29T17:30:00-04:00",
    "venue": "Boston Stadium"
  },
  {
    "id": "R32-02",
    "matchNumber": 74,
    "home": {
      "code": "FRA",
      "name": "Francia",
      "flag": "🇫🇷"
    },
    "away": {
      "code": "SWE",
      "name": "Suecia",
      "flag": "🇸🇪"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-03",
    "matchNumber": 75,
    "home": {
      "code": "RSA",
      "name": "Sudáfrica",
      "flag": "🇿🇦"
    },
    "away": {
      "code": "CAN",
      "name": "Canadá",
      "flag": "🇨🇦"
    },
    "date": "2026-06-28T16:00:00-07:00",
    "venue": "Los Ángeles Stadium"
  },
  {
    "id": "R32-04",
    "matchNumber": 76,
    "home": {
      "code": "NED",
      "name": "Países Bajos",
      "flag": "🇳🇱"
    },
    "away": {
      "code": "MAR",
      "name": "Marruecos",
      "flag": "🇲🇦"
    },
    "date": "2026-06-29T22:00:00-06:00",
    "venue": "Estadio Monterrey"
  },
  {
    "id": "R32-05",
    "matchNumber": 77,
    "home": {
      "code": "POR",
      "name": "Portugal",
      "flag": "🇵🇹"
    },
    "away": {
      "code": "CRO",
      "name": "Croacia",
      "flag": "🇭🇷"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-06",
    "matchNumber": 78,
    "home": {
      "code": "ESP",
      "name": "España",
      "flag": "🇪🇸"
    },
    "away": {
      "code": "AUT",
      "name": "Austria",
      "flag": "🇦🇹"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-07",
    "matchNumber": 79,
    "home": {
      "code": "USA",
      "name": "Estados Unidos",
      "flag": "🇺🇸"
    },
    "away": {
      "code": "BIH",
      "name": "Bosnia y Herzegovina",
      "flag": "🇧🇦"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-08",
    "matchNumber": 80,
    "home": {
      "code": "BEL",
      "name": "Bélgica",
      "flag": "🇧🇪"
    },
    "away": {
      "code": "SEN",
      "name": "Senegal",
      "flag": "🇸🇳"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-09",
    "matchNumber": 81,
    "home": {
      "code": "BRA",
      "name": "Brasil",
      "flag": "🇧🇷"
    },
    "away": {
      "code": "JPN",
      "name": "Japón",
      "flag": "🇯🇵"
    },
    "date": "2026-06-29T14:00:00-05:00",
    "venue": "Houston Stadium"
  },
  {
    "id": "R32-10",
    "matchNumber": 82,
    "home": {
      "code": "IRL",
      "name": "Irlanda",
      "flag": "🇮🇪"
    },
    "away": {
      "code": "NOR",
      "name": "Noruega",
      "flag": "🇳🇴"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-11",
    "matchNumber": 83,
    "home": {
      "code": "MEX",
      "name": "México",
      "flag": "🇲🇽"
    },
    "away": {
      "code": "ECU",
      "name": "Ecuador",
      "flag": "🇪🇨"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-12",
    "matchNumber": 84,
    "home": {
      "code": "ENG",
      "name": "Inglaterra",
      "flag": "🏴"
    },
    "away": {
      "code": "COD",
      "name": "RD Congo",
      "flag": "🇨🇩"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-13",
    "matchNumber": 85,
    "home": {
      "code": "ARG",
      "name": "Argentina",
      "flag": "🇦🇷"
    },
    "away": {
      "code": "CPV",
      "name": "Cabo Verde",
      "flag": "🇨🇻"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-14",
    "matchNumber": 86,
    "home": {
      "code": "AUS",
      "name": "Australia",
      "flag": "🇦🇺"
    },
    "away": {
      "code": "EGY",
      "name": "Egipto",
      "flag": "🇪🇬"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-15",
    "matchNumber": 87,
    "home": {
      "code": "SUI",
      "name": "Suiza",
      "flag": "🇨🇭"
    },
    "away": {
      "code": "ALG",
      "name": "Argelia",
      "flag": "🇩🇿"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  },
  {
    "id": "R32-16",
    "matchNumber": 88,
    "home": {
      "code": "COL",
      "name": "Colombia",
      "flag": "🇨🇴"
    },
    "away": {
      "code": "GHA",
      "name": "Ghana",
      "flag": "🇬🇭"
    },
    "date": null,
    "venue": "Horario FIFA por confirmar en app"
  }
];


export function buildRealRoundOf32() {
  return ROUND_OF_32_REAL_FIXTURES.map((match) => ({
    ...match,
    stage: 'round-of-32',
    label: `16°-${String(match.id).replace('R32-', '')}`,
    homeCode: match.home.code,
    awayCode: match.away.code,
    homeName: match.home.name,
    awayName: match.away.name,
    homeFlag: match.home.flag,
    awayFlag: match.away.flag,
  }));
}
