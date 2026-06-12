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
