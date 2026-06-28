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


export const REAL_ROUND_OF_32_MATCHES = [
  { id:'R32-01', matchNo:'16°-01', phase:'ROUND_OF_32', home:'RSA', away:'CAN', date:'2026-06-28', time:'16:00', stadium:'Los Ángeles Stadium' },
  { id:'R32-02', matchNo:'16°-02', phase:'ROUND_OF_32', home:'BRA', away:'JPN', date:'2026-06-29', time:'14:00', stadium:'Houston Stadium' },
  { id:'R32-03', matchNo:'16°-03', phase:'ROUND_OF_32', home:'GER', away:'PAR', date:'2026-06-29', time:'17:30', stadium:'Boston Stadium' },
  { id:'R32-04', matchNo:'16°-04', phase:'ROUND_OF_32', home:'NED', away:'MAR', date:'2026-06-29', time:'22:00', stadium:'Estadio Monterrey' },
  { id:'R32-05', matchNo:'16°-05', phase:'ROUND_OF_32', home:'CIV', away:'NOR', date:'2026-06-30', time:'14:00', stadium:'Dallas Stadium' },
  { id:'R32-06', matchNo:'16°-06', phase:'ROUND_OF_32', home:'FRA', away:'SWE', date:'2026-06-30', time:'18:00', stadium:'New York New Jersey Stadium' },
  { id:'R32-07', matchNo:'16°-07', phase:'ROUND_OF_32', home:'MEX', away:'ECU', date:'2026-06-30', time:'22:00', stadium:'Estadio Ciudad de México' },
  { id:'R32-08', matchNo:'16°-08', phase:'ROUND_OF_32', home:'ENG', away:'COD', date:'2026-07-01', time:'13:00', stadium:'Atlanta Stadium' },
  { id:'R32-09', matchNo:'16°-09', phase:'ROUND_OF_32', home:'BEL', away:'SEN', date:'2026-07-01', time:'17:00', stadium:'Seattle Stadium' },
  { id:'R32-10', matchNo:'16°-10', phase:'ROUND_OF_32', home:'USA', away:'BIH', date:'2026-07-01', time:'21:00', stadium:'San Francisco Bay Area Stadium' },
  { id:'R32-11', matchNo:'16°-11', phase:'ROUND_OF_32', home:'ESP', away:'AUT', date:'2026-07-02', time:'16:00', stadium:'Los Ángeles Stadium' },
  { id:'R32-12', matchNo:'16°-12', phase:'ROUND_OF_32', home:'POR', away:'CRO', date:'2026-07-02', time:'20:00', stadium:'Toronto Stadium' },
  { id:'R32-13', matchNo:'16°-13', phase:'ROUND_OF_32', home:'SUI', away:'ALG', date:'2026-07-03', time:'17:00', stadium:'BC Place Vancouver' },
  { id:'R32-14', matchNo:'16°-14', phase:'ROUND_OF_32', home:'AUS', away:'EGY', date:'2026-07-03', time:'15:00', stadium:'Dallas Stadium' },
  { id:'R32-15', matchNo:'16°-15', phase:'ROUND_OF_32', home:'ARG', away:'CPV', date:'2026-07-03', time:'19:00', stadium:'Miami Stadium' },
  { id:'R32-16', matchNo:'16°-16', phase:'ROUND_OF_32', home:'COL', away:'GHA', date:'2026-07-03', time:'22:30', stadium:'Kansas City Stadium' }
];
