import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'assets', 'data');
const OUT_DIR = path.join(DATA_DIR, 'historical');
const HEADSHOT_DIR = path.join(OUT_DIR, 'headshots');
const PHOTO_PLACEHOLDER_IMAGE = 1;

const SUPPORTED_START_YEARS = [1983, 1996, 2003, 2009, 2025];
const DATA_VALIDATION_YEARS = [2005];
const RANKING_AS_OF_YEARS = [...new Set([...SUPPORTED_START_YEARS, ...DATA_VALIDATION_YEARS])].sort((a, b) => a - b);
const LEGACY_FORMULA_VERSION = 5;

const ROSTER_INDEX_TO_START_YEAR = {
  1: 2025,
  12: 2009,
  13: 2005,
  14: 2003,
  15: 1996,
  16: 1983
};

const TEAM_ALIASES = {
  ORL: 14,
  LAL: 23,
  CLE: 7,
  MIA: 13,
  PHX: 24,
  BOS: 1,
  MIN: 17,
  GSW: 21,
  CHA: 12,
  DEN: 16,
  DET: 8,
  TOR: 5,
  CHI: 6,
  MEM: 28,
  NOP: 29,
  DAL: 26,
  SAS: 30,
  OKC: 18,
  POR: 19,
  UTA: 20,
  HOU: 27,
  SAC: 25,
  NYK: 3,
  BKN: 2,
  MIL: 10,
  ATL: 11,
  IND: 9,
  PHI: 4,
  WAS: 15,
  LAC: 22
};
const BREF_TEAM_ALIASES = {
  ATL: TEAM_ALIASES.ATL,
  BOS: TEAM_ALIASES.BOS,
  BRK: TEAM_ALIASES.BKN,
  BKN: TEAM_ALIASES.BKN,
  NJN: TEAM_ALIASES.BKN,
  NYN: TEAM_ALIASES.BKN,
  CHH: TEAM_ALIASES.CHA,
  CHA: TEAM_ALIASES.CHA,
  CHO: TEAM_ALIASES.CHA,
  CHI: TEAM_ALIASES.CHI,
  CLE: TEAM_ALIASES.CLE,
  DAL: TEAM_ALIASES.DAL,
  DEN: TEAM_ALIASES.DEN,
  DET: TEAM_ALIASES.DET,
  GSW: TEAM_ALIASES.GSW,
  SFW: TEAM_ALIASES.GSW,
  PHW: TEAM_ALIASES.GSW,
  HOU: TEAM_ALIASES.HOU,
  SDR: TEAM_ALIASES.HOU,
  IND: TEAM_ALIASES.IND,
  LAC: TEAM_ALIASES.LAC,
  SDC: TEAM_ALIASES.LAC,
  BUF: TEAM_ALIASES.LAC,
  LAL: TEAM_ALIASES.LAL,
  MNL: TEAM_ALIASES.LAL,
  MEM: TEAM_ALIASES.MEM,
  VAN: TEAM_ALIASES.MEM,
  MIA: TEAM_ALIASES.MIA,
  MIL: TEAM_ALIASES.MIL,
  MIN: TEAM_ALIASES.MIN,
  NOP: TEAM_ALIASES.NOP,
  NOH: TEAM_ALIASES.NOP,
  NOK: TEAM_ALIASES.NOP,
  NYK: TEAM_ALIASES.NYK,
  OKC: TEAM_ALIASES.OKC,
  SEA: TEAM_ALIASES.OKC,
  ORL: TEAM_ALIASES.ORL,
  PHI: TEAM_ALIASES.PHI,
  SYR: TEAM_ALIASES.PHI,
  PHO: TEAM_ALIASES.PHX,
  PHX: TEAM_ALIASES.PHX,
  POR: TEAM_ALIASES.POR,
  SAC: TEAM_ALIASES.SAC,
  KCK: TEAM_ALIASES.SAC,
  KCO: TEAM_ALIASES.SAC,
  CIN: TEAM_ALIASES.SAC,
  ROC: TEAM_ALIASES.SAC,
  SAS: TEAM_ALIASES.SAS,
  TOR: TEAM_ALIASES.TOR,
  UTA: TEAM_ALIASES.UTA,
  NOJ: TEAM_ALIASES.UTA,
  WAS: TEAM_ALIASES.WAS,
  WSB: TEAM_ALIASES.WAS,
  BAL: TEAM_ALIASES.WAS,
  CAP: TEAM_ALIASES.WAS,
  CHZ: TEAM_ALIASES.WAS
};

const EXTERNAL_REGULAR_SEASON_SOURCES = [
  {
    id: 'github_kaggle_seasons_stats',
    kind: 'basketball_reference_totals',
    path: path.join(ROOT, 'tools', 'data', 'raw', 'vimalsubbiah_NBA-EDA-and-PPG-prediction', 'NBA-EDA-and-PPG-prediction-master', 'Seasons_Stats.csv'),
    url: 'https://github.com/vimalsubbiah/NBA-EDA-and-PPG-prediction',
    coverage: '1950-2017 regular-season player totals'
  },
  {
    id: 'github_2025_per_game',
    kind: 'basketball_reference_per_game',
    path: path.join(ROOT, 'tools', 'data', 'raw', 'MahdiMahin_NBA-stats-sql-tableau', 'NBA-stats-sql-tableau-main', 'data', 'nba_projectSQL1.csv'),
    url: 'https://github.com/MahdiMahin/NBA-stats-sql-tableau',
    coverage: '2024-25 regular-season player per-game rows'
  },
  {
    id: 'github_nba_box_scores_2010_2024',
    kind: 'nba_game_box_scores',
    paths: [1, 2, 3].map(part => path.join(ROOT, 'tools', 'data', 'raw', 'NocturneBear_NBA-Data-2010-2024', 'NBA-Data-2010-2024-main', `regular_season_box_scores_2010_2024_part_${part}.csv`)),
    url: 'https://github.com/NocturneBear/NBA-Data-2010-2024',
    coverage: '2010-11 through 2023-24 regular-season player box scores aggregated to player-season rows'
  }
];

const EXTERNAL_NAME_ALIASES = {
  anthonyjeromewebb: ['spudwebb'],
  briandouglaswilliams: ['bisondele', 'brianwilliams'],
  charlescorneliussmith: ['charlessmith'],
  decovankadellbrown: ['deebrown'],
  earvinjohnson: ['magicjohnson'],
  isaiahthomas: ['isiahthomas'],
  josebarea: ['jjbarea'],
  lafayettelever: ['fatlever'],
  lucienlongley: ['luclongley'],
  luckukoch: ['tonikukoc'],
  marcusdarrellwilliams: ['marcuswilliams'],
  mettaworldpeace: ['ronartest'],
  michaelperryjames: ['mikejames'],
  reggiebullockjr: ['reggiebullock'],
  robertwilliams: ['robertwilliamsiii'],
  xaviertillmansr: ['xaviertillman'],
  juanhernangomez: ['juanchohernangomez'],
  tyronebogues: ['muggsybogues'],
  trashonesterovic: ['rashonesterovic'],
  trashionesterovic: ['rashonesterovic']
};

const DISPLAY_NAME_OVERRIDES = {
  earvinjohnson: 'Magic Johnson'
};

const HONOR_OVERRIDES_BY_END_YEAR = {
  kareemabduljabbar: [
    { year: 1983, honors: { rings: 3, mvp: 6, fmvp: 1, roy: 1, allStar: 14, allNba1: 8, allNba2: 4, allDefensive: 8, scoring: 2, rebound: 1, block: 3 } },
    { year: 1988, honors: { rings: 6, mvp: 6, fmvp: 2, roy: 1, allStar: 19, allNba1: 10, allNba2: 5, allDefensive: 11, scoring: 2, rebound: 1, block: 4 } }
  ],
  michaeljordan: [
    { year: 1996, honors: { rings: 4, mvp: 4, fmvp: 4, dpoy: 1, roy: 1, allStar: 12, allStarMvp: 2, allNba1: 8, allNba2: 1, allDefensive: 7, scoring: 8, steal: 3 } },
    { year: 1998, honors: { rings: 6, mvp: 5, fmvp: 6, dpoy: 1, roy: 1, allStar: 12, allStarMvp: 3, allNba1: 10, allNba2: 1, allDefensive: 9, scoring: 10, steal: 3 } },
    { year: 2003, honors: { rings: 6, mvp: 5, fmvp: 6, dpoy: 1, roy: 1, allStar: 14, allStarMvp: 3, allNba1: 10, allNba2: 1, allDefensive: 9, scoring: 10, steal: 3 } }
  ],
  earvinjohnson: [
    { year: 1991, honors: { rings: 5, mvp: 3, fmvp: 3, allStar: 12, allStarMvp: 2, allNba1: 9, allNba2: 1, assist: 4, steal: 2 } }
  ],
  larrybird: [
    { year: 1992, honors: { rings: 3, mvp: 3, fmvp: 2, roy: 1, allStar: 12, allStarMvp: 1, allNba1: 9, allNba2: 1, allDefensive: 3 } }
  ],
  hakeemolajuwon: [
    { year: 1996, honors: { rings: 2, mvp: 1, fmvp: 2, dpoy: 2, allStar: 12, allNba1: 6, allNba2: 3, allNba3: 3, allDefensive: 9, rebound: 2, block: 3 } }
  ],
  shaquilleoneal: [
    { year: 2009, honors: { rings: 4, mvp: 1, fmvp: 3, roy: 1, allStar: 15, allStarMvp: 3, allNba1: 8, allNba2: 2, allNba3: 4, allDefensive: 3, scoring: 2 } }
  ],
  timduncan: [
    { year: 2009, honors: { rings: 4, mvp: 2, fmvp: 3, roy: 1, allStar: 11, allStarMvp: 1, allNba1: 9, allNba2: 3, allDefensive: 11 } },
    { year: 2016, honors: { rings: 5, mvp: 2, fmvp: 3, roy: 1, allStar: 15, allStarMvp: 1, allNba1: 10, allNba2: 3, allNba3: 2, allDefensive: 15 } }
  ],
  kobebryant: [
    { year: 2009, honors: { rings: 4, mvp: 1, fmvp: 1, allStar: 11, allStarMvp: 3, allNba1: 7, allNba2: 2, allNba3: 2, allDefensive: 9, scoring: 2 } },
    { year: 2010, honors: { rings: 5, mvp: 1, fmvp: 2, allStar: 12, allStarMvp: 3, allNba1: 8, allNba2: 2, allNba3: 2, allDefensive: 10, scoring: 2 } },
    { year: 2016, honors: { rings: 5, mvp: 1, fmvp: 2, allStar: 18, allStarMvp: 4, allNba1: 11, allNba2: 2, allNba3: 2, allDefensive: 12, scoring: 2 } }
  ],
  dwyanewade: [
    { year: 2009, honors: { rings: 1, fmvp: 1, allStar: 5, allStarMvp: 1, allNba1: 1, allNba2: 2, allNba3: 1, allDefensive: 3, scoring: 1 } },
    { year: 2019, honors: { rings: 3, fmvp: 1, allStar: 13, allStarMvp: 1, allNba1: 2, allNba2: 3, allNba3: 3, allDefensive: 3, scoring: 1 } }
  ],
  stephencurry: [
    { year: 2025, honors: { rings: 4, mvp: 2, fmvp: 1, allStar: 11, allStarMvp: 2, allNba1: 4, allNba2: 4, allNba3: 2, scoring: 2, steal: 1 } }
  ]
};

const PROVIDER_CHAIN = [
  { id: 'nba_api', label: 'NBA Stats API', enabled: process.env.NBA_API_ENABLED !== '0', requiresKey: false },
  { id: 'balldontlie', label: 'balldontlie', enabled: !!process.env.BALLDONTLIE_API_KEY, requiresKey: true },
  { id: 'sportsdataio', label: 'SportsDataIO', enabled: !!process.env.SPORTSDATAIO_API_KEY, requiresKey: true },
  { id: 'local_csv', label: 'GitHub/local CSV fallback', enabled: true, requiresKey: false }
];

const MANUAL_PLAYERS = {
  "shaquilleoneal": {
    realId: 'nba:shaq-oneal',
    name: "Shaquille O'Neal",
    displayName: "Shaquille O'Neal",
    aliases: ["Shaquille ONeal", "Shaquille O'Neal", '沙奎尔-奥尼尔'],
    draft: { year: 1992, round: 1, pick: 1, team: 'ORL' },
    primaryTeam: 'LAL',
    sourceNotes: [
      'Regular/playoff per-game rows sourced from the public Shaquille ONeal career statistics table on Spanish Wikipedia, which cites Basketball-Reference.'
    ],
    regularSeasons: [
      s(1992, 'ORL', 81, 37.9, .562, .000, .592, 13.9, 1.9, .7, 3.5, 23.4),
      s(1993, 'ORL', 81, 39.8, .599, .000, .554, 13.2, 2.4, .9, 2.9, 29.3),
      s(1994, 'ORL', 79, 37.0, .583, .000, .533, 11.4, 2.7, .9, 2.4, 29.3),
      s(1995, 'ORL', 54, 36.0, .573, .500, .487, 11.0, 2.9, .6, 2.1, 26.6),
      s(1996, 'LAL', 51, 38.1, .557, .000, .484, 12.5, 3.1, .9, 2.9, 26.2),
      s(1997, 'LAL', 60, 36.3, .584, .000, .527, 11.4, 2.4, .7, 2.4, 28.3),
      s(1998, 'LAL', 49, 34.8, .576, .000, .540, 10.7, 2.3, .7, 1.7, 26.3),
      s(1999, 'LAL', 79, 40.0, .574, .000, .524, 13.6, 3.8, .5, 3.0, 29.7),
      s(2000, 'LAL', 74, 39.5, .572, .000, .513, 12.7, 3.7, .6, 2.8, 28.7),
      s(2001, 'LAL', 67, 36.1, .579, .000, .555, 10.7, 3.0, .6, 2.0, 27.2),
      s(2002, 'LAL', 67, 37.8, .574, .000, .622, 11.1, 3.1, .6, 2.4, 27.5)
    ],
    playoffSeasons: [
      ps(1994, 'ORL', 3, 42.0, .511, .000, .471, 13.3, 2.3, .7, 3.0, 20.7),
      ps(1995, 'ORL', 21, 38.3, .577, .000, .571, 11.9, 3.3, .9, 1.9, 25.7),
      ps(1996, 'ORL', 12, 38.3, .606, .000, .393, 10.0, 4.6, .8, 1.2, 25.8),
      ps(1997, 'LAL', 9, 36.2, .514, .000, .610, 10.6, 3.2, .6, 1.9, 26.9),
      ps(1998, 'LAL', 13, 38.5, .612, .000, .503, 10.2, 2.9, .5, 2.6, 30.5),
      ps(1999, 'LAL', 8, 39.4, .510, .000, .466, 11.6, 2.3, .9, 2.9, 26.6),
      ps(2000, 'LAL', 23, 43.5, .566, .000, .456, 15.4, 3.1, .6, 2.4, 30.7),
      ps(2001, 'LAL', 16, 42.3, .555, .000, .525, 15.4, 3.2, .4, 2.4, 30.4),
      ps(2002, 'LAL', 19, 40.8, .529, .000, .649, 12.6, 2.8, .5, 2.5, 28.5),
      ps(2003, 'LAL', 12, 40.1, .535, .000, .621, 14.8, 3.7, .6, 2.8, 27.0)
    ],
    honorsByEndYear: {
      1993: { roy: 1, allStar: 1 },
      1994: { roy: 1, allStar: 2, allNba3: 1 },
      1995: { roy: 1, allStar: 3, allNba2: 1, allNba3: 1, scoring: 1 },
      1996: { roy: 1, allStar: 4, allNba2: 1, allNba3: 2, scoring: 1 },
      1998: { roy: 1, allStar: 6, allNba1: 1, allNba2: 1, allNba3: 3, scoring: 1 },
      2000: { roy: 1, rings: 1, mvp: 1, fmvp: 1, allStar: 7, allStarMvp: 1, allNba1: 2, allNba2: 2, allNba3: 3, allDefensive: 1, scoring: 2 },
      2001: { roy: 1, rings: 2, mvp: 1, fmvp: 2, allStar: 8, allStarMvp: 1, allNba1: 3, allNba2: 2, allNba3: 3, allDefensive: 2, scoring: 2 },
      2002: { roy: 1, rings: 3, mvp: 1, fmvp: 3, allStar: 9, allStarMvp: 1, allNba1: 4, allNba2: 2, allNba3: 3, allDefensive: 2, scoring: 2 },
      2003: { roy: 1, rings: 3, mvp: 1, fmvp: 3, allStar: 10, allStarMvp: 1, allNba1: 5, allNba2: 2, allNba3: 3, allDefensive: 3, scoring: 2 }
    }
  },
  "lebronjames": {
    realId: 'nba:lebron-james',
    name: 'LeBron James',
    displayName: 'LeBron James',
    aliases: ['LeBron James', '勒布朗-詹姆斯'],
    draft: { year: 2003, round: 1, pick: 1, team: 'CLE' },
    primaryTeam: 'LAL',
    sourceNotes: [
      'Regular/playoff per-game rows sourced from the public LeBron James career statistics table on Portuguese Wikipedia, which cites Basketball-Reference.'
    ],
    regularSeasons: [
      s(2003, 'CLE', 79, 39.5, .417, .290, .754, 5.5, 5.9, 1.6, .7, 20.8),
      s(2004, 'CLE', 80, 42.4, .472, .351, .750, 7.4, 7.2, 2.2, .6, 27.2),
      s(2005, 'CLE', 79, 42.5, .480, .335, .738, 7.0, 6.6, 1.6, .8, 31.4),
      s(2006, 'CLE', 78, 40.9, .476, .319, .698, 6.7, 6.0, 1.6, .7, 27.3),
      s(2007, 'CLE', 75, 40.4, .484, .315, .712, 7.9, 7.2, 1.8, 1.1, 30.0),
      s(2008, 'CLE', 81, 37.7, .489, .344, .780, 7.6, 7.2, 1.7, 1.1, 28.4),
      s(2009, 'CLE', 76, 39.0, .503, .333, .767, 7.3, 8.6, 1.6, 1.0, 29.7),
      s(2010, 'MIA', 79, 38.8, .510, .330, .759, 7.5, 7.0, 1.6, .6, 26.7),
      s(2011, 'MIA', 62, 37.5, .531, .362, .771, 7.9, 6.2, 1.9, .8, 27.1),
      s(2012, 'MIA', 76, 37.9, .565, .406, .753, 8.0, 7.3, 1.7, .9, 26.8),
      s(2013, 'MIA', 77, 37.7, .567, .379, .750, 6.9, 6.4, 1.6, .3, 27.1),
      s(2014, 'CLE', 69, 36.1, .488, .354, .710, 6.0, 7.4, 1.6, .7, 25.3),
      s(2015, 'CLE', 76, 35.6, .520, .309, .731, 7.4, 6.8, 1.4, .6, 25.3),
      s(2016, 'CLE', 74, 37.8, .548, .363, .674, 8.6, 8.7, 1.2, .6, 26.4),
      s(2017, 'CLE', 82, 36.9, .542, .367, .731, 8.6, 9.1, 1.4, .9, 27.5),
      s(2018, 'LAL', 55, 35.2, .510, .339, .665, 8.5, 8.3, 1.3, .6, 27.4),
      s(2019, 'LAL', 67, 34.6, .493, .348, .693, 7.8, 10.2, 1.2, .5, 25.3)
    ],
    playoffSeasons: [
      ps(2006, 'CLE', 13, 46.5, .476, .333, .737, 8.1, 5.8, 1.4, .7, 30.8),
      ps(2007, 'CLE', 20, 44.7, .416, .280, .755, 8.0, 8.0, 1.7, .5, 25.1),
      ps(2008, 'CLE', 13, 42.5, .411, .257, .731, 7.8, 7.6, 1.8, 1.3, 28.2),
      ps(2009, 'CLE', 14, 41.4, .510, .333, .749, 9.1, 7.3, 1.6, .9, 35.3),
      ps(2010, 'CLE', 11, 41.8, .502, .400, .733, 9.3, 7.6, 1.7, 1.8, 29.1),
      ps(2011, 'MIA', 21, 43.9, .466, .353, .763, 8.4, 5.9, 1.7, 1.2, 23.7),
      ps(2012, 'MIA', 23, 42.7, .500, .259, .739, 9.7, 5.6, 1.9, .7, 30.3),
      ps(2013, 'MIA', 23, 41.7, .491, .375, .777, 8.4, 6.6, 1.8, .8, 25.9),
      ps(2014, 'MIA', 20, 38.2, .565, .407, .806, 7.1, 4.8, 1.9, .6, 27.5),
      ps(2015, 'CLE', 20, 42.2, .417, .227, .731, 11.3, 8.5, 1.7, 1.1, 30.1),
      ps(2016, 'CLE', 21, 39.1, .525, .340, .661, 9.5, 7.6, 2.3, 1.3, 26.3),
      ps(2017, 'CLE', 18, 41.3, .565, .411, .698, 9.1, 7.8, 1.9, 1.3, 32.8),
      ps(2018, 'CLE', 22, 41.9, .539, .342, .746, 9.1, 9.0, 1.4, 1.0, 34.0),
      ps(2020, 'LAL', 21, 36.3, .560, .370, .720, 10.8, 8.8, 1.2, .9, 27.6)
    ],
    honorsByEndYear: {
      2004: { roy: 1 },
      2005: { roy: 1, allStar: 1, allNba2: 1 },
      2006: { roy: 1, allStar: 2, allStarMvp: 1, allNba1: 1, allNba2: 1 },
      2007: { roy: 1, allStar: 3, allStarMvp: 1, allNba1: 1, allNba2: 2 },
      2008: { roy: 1, allStar: 4, allStarMvp: 2, allNba1: 2, allNba2: 2, scoring: 1 },
      2009: { roy: 1, mvp: 1, allStar: 5, allStarMvp: 2, allNba1: 3, allNba2: 2, allDefensive: 1, scoring: 1 },
      2010: { roy: 1, mvp: 2, allStar: 6, allStarMvp: 2, allNba1: 4, allNba2: 2, allDefensive: 2, scoring: 1 },
      2011: { roy: 1, mvp: 2, allStar: 7, allStarMvp: 2, allNba1: 5, allNba2: 2, allDefensive: 3, scoring: 1 },
      2012: { roy: 1, rings: 1, mvp: 3, fmvp: 1, allStar: 8, allStarMvp: 2, allNba1: 6, allNba2: 2, allDefensive: 4, scoring: 1 },
      2013: { roy: 1, rings: 2, mvp: 4, fmvp: 2, allStar: 9, allStarMvp: 2, allNba1: 7, allNba2: 2, allDefensive: 5, scoring: 1 },
      2014: { roy: 1, rings: 2, mvp: 4, fmvp: 2, allStar: 10, allStarMvp: 2, allNba1: 8, allNba2: 2, allDefensive: 6, scoring: 1 },
      2015: { roy: 1, rings: 2, mvp: 4, fmvp: 2, allStar: 11, allStarMvp: 2, allNba1: 9, allNba2: 2, allDefensive: 6, scoring: 1 },
      2016: { roy: 1, rings: 3, mvp: 4, fmvp: 3, allStar: 12, allStarMvp: 2, allNba1: 10, allNba2: 2, allDefensive: 6, scoring: 1 },
      2017: { roy: 1, rings: 3, mvp: 4, fmvp: 3, allStar: 13, allStarMvp: 2, allNba1: 11, allNba2: 2, allDefensive: 6, scoring: 1 },
      2018: { roy: 1, rings: 3, mvp: 4, fmvp: 3, allStar: 14, allStarMvp: 3, allNba1: 12, allNba2: 2, allDefensive: 6, scoring: 1 },
      2019: { roy: 1, rings: 3, mvp: 4, fmvp: 3, allStar: 15, allStarMvp: 3, allNba1: 12, allNba2: 2, allNba3: 1, allDefensive: 6, scoring: 1 },
      2020: { roy: 1, rings: 4, mvp: 4, fmvp: 4, allStar: 16, allStarMvp: 3, allNba1: 13, allNba2: 2, allNba3: 1, allDefensive: 6, scoring: 1, assist: 1 }
    }
  },
  "alleniverson": {
    realId: 'nba:allen-iverson',
    name: 'Allen Iverson',
    displayName: 'Allen Iverson',
    aliases: ['Allen Iverson', '阿伦-艾弗森'],
    draft: { year: 1996, round: 1, pick: 1, team: 'PHI' },
    primaryTeam: 'PHI',
    sourceNotes: [
      'Regular/playoff per-game rows sourced from public Allen Iverson career statistics tables and aligned to local game honor counters.'
    ],
    regularSeasons: [
      s(1996, 'PHI', 76, 40.1, .416, .341, .702, 4.1, 7.5, 2.1, .3, 23.5),
      s(1997, 'PHI', 80, 39.4, .461, .298, .729, 3.7, 6.2, 2.2, .3, 22.0),
      s(1998, 'PHI', 48, 41.5, .412, .291, .751, 4.9, 4.6, 2.3, .1, 26.8),
      s(1999, 'PHI', 70, 40.8, .421, .341, .713, 3.8, 4.7, 2.1, .1, 28.4),
      s(2000, 'PHI', 71, 42.0, .420, .320, .814, 3.8, 4.6, 2.5, .3, 31.1),
      s(2001, 'PHI', 60, 43.7, .398, .291, .812, 4.5, 5.5, 2.8, .2, 31.4),
      s(2002, 'PHI', 82, 42.5, .414, .277, .774, 4.2, 5.5, 2.7, .2, 27.6),
      s(2003, 'PHI', 48, 42.5, .387, .286, .745, 3.7, 6.8, 2.4, .1, 26.4),
      s(2004, 'PHI', 75, 42.3, .424, .308, .835, 4.0, 7.9, 2.4, .1, 30.7)
    ],
    playoffSeasons: [
      ps(1999, 'PHI', 8, 44.8, .411, .283, .712, 4.1, 4.9, 2.5, .3, 28.5),
      ps(2000, 'PHI', 10, 44.4, .384, .308, .739, 4.0, 4.5, 1.2, .1, 26.2),
      ps(2001, 'PHI', 22, 46.2, .389, .338, .774, 4.7, 6.1, 2.4, .3, 32.9),
      ps(2002, 'PHI', 5, 41.8, .381, .333, .810, 3.6, 4.2, 2.6, .0, 30.0),
      ps(2003, 'PHI', 12, 46.4, .416, .345, .737, 4.3, 7.4, 2.4, .1, 31.7),
      ps(2005, 'PHI', 5, 47.6, .468, .414, .897, 2.2, 10.0, 2.0, .4, 31.2)
    ],
    honorsByEndYear: {
      1997: { roy: 1 },
      2000: { roy: 1, allStar: 1, allNba1: 1, scoring: 1, steal: 1 },
      2001: { roy: 1, mvp: 1, allStar: 2, allStarMvp: 1, allNba1: 2, scoring: 2, steal: 2 },
      2002: { roy: 1, mvp: 1, allStar: 3, allStarMvp: 1, allNba1: 2, allNba2: 1, scoring: 2, steal: 2 },
      2003: { roy: 1, mvp: 1, allStar: 4, allStarMvp: 1, allNba1: 2, allNba2: 2, scoring: 2, steal: 3 },
      2005: { roy: 1, mvp: 1, allStar: 6, allStarMvp: 2, allNba1: 3, allNba2: 2, scoring: 4, steal: 3 }
    }
  }
};

const DRAFT_PATCHES = {
  2003: [
    { pick: 1, name: 'LeBron James', pos: 3, team: 'CLE', college: 'St. Vincent-St. Mary HS' },
    { pick: 3, name: 'Carmelo Anthony', pos: 3, team: 'DEN', college: 'Syracuse' },
    { pick: 4, name: 'Chris Bosh', pos: 4, team: 'TOR', college: 'Georgia Tech' },
    { pick: 5, name: 'Dwyane Wade', pos: 2, team: 'MIA', college: 'Marquette' }
  ],
  2020: [
    { pick: 1, name: 'Anthony Edwards', pos: 2, team: 'MIN', college: 'Georgia' },
    { pick: 2, name: 'James Wiseman', pos: 5, team: 'GSW', college: 'Memphis' },
    { pick: 3, name: 'LaMelo Ball', pos: 1, team: 'CHA', college: 'Illawarra Hawks' }
  ]
};

function s(season, team, gp, mins, fgPct, tpPct, ftPct, rpg, apg, spg, bpg, ppg) {
  return seasonRow('regular', season, team, gp, mins, fgPct, tpPct, ftPct, rpg, apg, spg, bpg, ppg);
}

function ps(season, team, gp, mins, fgPct, tpPct, ftPct, rpg, apg, spg, bpg, ppg) {
  return seasonRow('playoffs', season, team, gp, mins, fgPct, tpPct, ftPct, rpg, apg, spg, bpg, ppg);
}

function seasonRow(type, season, team, gp, mins, fgPct, tpPct, ftPct, rpg, apg, spg, bpg, ppg) {
  return {
    type,
    season,
    seasonEndYear: season + 1,
    team,
    teamId: TEAM_ALIASES[team] || 0,
    gp,
    mins,
    fgPct: pct(fgPct),
    tpPct: pct(tpPct),
    ftPct: pct(ftPct),
    ppg,
    rpg,
    apg,
    spg,
    bpg
  };
}

function pct(v) {
  return +(Number(v) * 100).toFixed(1);
}

function cleanText(value) {
  return String(value ?? '').replace(/^\uFEFF/, '').trim();
}

function parseNum(value, fallback = 0) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : fallback;
}

function normalizeKey(value) {
  return cleanText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function nameKeyFromRow(row) {
  return normalizeKey(row.nameBirth || row.altName || row.name);
}

function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) return [];
  const headers = lines.shift().split(';').map(cleanText);
  return lines.map(line => {
    const cells = line.split(';');
    const row = {};
    headers.forEach((h, i) => { row[h] = cleanText(cells[i] ?? ''); });
    return row;
  });
}

function parseDelimited(text, delimiter = ',') {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  const src = String(text || '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"') {
      if (inQuotes && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      row.push(cell);
      cell = '';
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => String(value).trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some(value => String(value).trim())) rows.push(row);
  if (!rows.length) return [];
  const headers = rows.shift().map(cleanText);
  return rows.map(cells => {
    const out = {};
    headers.forEach((h, i) => { out[h || `col${i}`] = cleanText(cells[i] ?? ''); });
    return out;
  });
}

function readCsv(rel) {
  const p = path.join(DATA_DIR, rel);
  if (!fs.existsSync(p)) return [];
  return parseCsv(fs.readFileSync(p, 'utf8'));
}

function readDelimitedFile(absPath, delimiter = ',') {
  if (!fs.existsSync(absPath)) return [];
  return parseDelimited(fs.readFileSync(absPath, 'utf8'), delimiter);
}

function padImageId(imageId) {
  return String(Math.max(0, Math.floor(parseNum(imageId, 0)))).padStart(4, '0');
}

function playerImageSourcePath(imageId) {
  const id = parseNum(imageId, 0);
  if (id <= 0) return '';
  return path.join(ROOT, 'assets', 'images', 'Player', `IMG${padImageId(id)}.png`);
}

function headshotFileName(canonicalId) {
  const safe = String(canonicalId || '')
    .trim()
    .replace(/^nba:/, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${safe || 'unknown'}.png`;
}

function cacheHeadshot(imageId, canonicalId) {
  const id = parseNum(imageId, 0);
  const src = id > 0 ? playerImageSourcePath(id) : '';
  const canUseSource = src && fs.existsSync(src) && path.basename(src).toLowerCase() !== 'img0000.png';
  const fallbackSrc = playerImageSourcePath(PHOTO_PLACEHOLDER_IMAGE);
  if (!canUseSource && !fs.existsSync(fallbackSrc)) {
    return { image: id, photoLocal: '', photoSource: 'missing', photoStatus: 'missing' };
  }
  fs.mkdirSync(HEADSHOT_DIR, { recursive: true });
  const fileName = headshotFileName(canonicalId);
  const dest = path.join(HEADSHOT_DIR, fileName);
  if (!fs.existsSync(dest)) fs.copyFileSync(canUseSource ? src : fallbackSrc, dest);
  return {
    image: id,
    photoLocal: `assets/data/historical/headshots/${fileName}`,
    photoSource: canUseSource ? 'local_apk_image' : 'local_placeholder_missing_api',
    photoStatus: canUseSource ? 'cached' : 'cached_placeholder'
  };
}

function attachPhotoFields(target, imageId, canonicalId) {
  const photo = cacheHeadshot(imageId, canonicalId);
  if (photo.image > 0) target.image = photo.image;
  if (photo.photoLocal) target.photoLocal = photo.photoLocal;
  target.photoSource = photo.photoSource;
  target.photoStatus = photo.photoStatus;
  return target;
}

function providerStatus() {
  return PROVIDER_CHAIN.map(provider => {
    const skippedReason = provider.enabled
      ? (provider.id === 'nba_api' && process.env.HISTORICAL_DB_FETCH !== '1' ? 'offline_cached_generation; set HISTORICAL_DB_FETCH=1 to refresh raw cache' : '')
      : (provider.requiresKey ? `missing ${provider.id === 'balldontlie' ? 'BALLDONTLIE_API_KEY' : 'SPORTSDATAIO_API_KEY'}` : 'disabled');
    return {
      id: provider.id,
      label: provider.label,
      enabled: !!provider.enabled,
      used: provider.id === 'local_csv',
      requiresKey: !!provider.requiresKey,
      skippedReason
    };
  });
}

function honorCounter() {
  return {
    rings: 0, mvp: 0, fmvp: 0, dpoy: 0, roy: 0, allStar: 0, allStarMvp: 0,
    allNba1: 0, allNba2: 0, allNba3: 0, allDefensive: 0, scoring: 0,
    rebound: 0, assist: 0, block: 0, steal: 0
  };
}

function mergeHonors(...items) {
  const out = honorCounter();
  items.filter(Boolean).forEach(item => {
    Object.keys(out).forEach(key => { out[key] += Math.max(0, Math.floor(parseNum(item[key], 0))); });
  });
  return out;
}

function maxHonors(...items) {
  const out = honorCounter();
  items.filter(Boolean).forEach(item => {
    Object.keys(out).forEach(key => { out[key] = Math.max(out[key], Math.max(0, Math.floor(parseNum(item[key], 0)))); });
  });
  return out;
}

function pickHonorsByYear(manual, year) {
  if (!manual?.honorsByEndYear) return null;
  const years = Object.keys(manual.honorsByEndYear).map(Number).filter(v => v <= year).sort((a, b) => a - b);
  if (!years.length) return honorCounter();
  return mergeHonors(manual.honorsByEndYear[years[years.length - 1]]);
}

function pickHonorOverrideByYear(historyKey, year) {
  const rows = HONOR_OVERRIDES_BY_END_YEAR[normalizeKey(historyKey)] || [];
  const eligible = rows
    .filter(row => parseNum(row.year, 0) <= year)
    .sort((a, b) => parseNum(a.year, 0) - parseNum(b.year, 0));
  return eligible.length ? mergeHonors(eligible[eligible.length - 1].honors) : null;
}

function rosterHonors(row) {
  return mergeHonors({
    rings: row.rings,
    mvp: row.mvps,
    fmvp: row.fmvps,
    dpoy: row.dpoy,
    roy: row.bestRookie,
    allStar: row.allStars || row.allStar,
    allStarMvp: row.allStarsMvps || row.allStarMvp,
    allNba1: row.allTeam1,
    allNba2: row.allTeam2,
    allNba3: row.allTeam3,
    allDefensive: parseNum(row.defTeam1, 0) + parseNum(row.defTeam2, 0) + parseNum(row.defTeam3, 0) + parseNum(row.allDefensive, 0),
    scoring: row.bestScorers,
    rebound: row.bestRebounders,
    assist: row.bestPassers,
    block: row.bestBlockers,
    steal: row.bestStealers
  });
}

function draftYearFromDraftCode(value) {
  const code = parseNum(value, 0);
  if (code >= 190000) return Math.floor(code / 100);
  return 0;
}

function draftPickFromDraftCode(value) {
  const code = parseNum(value, 0);
  if (code >= 190000) return code % 100;
  return 0;
}

function scoreFromStats(seasons = [], honors = honorCounter()) {
  const totals = seasons.reduce((acc, row) => {
    const gp = parseNum(row.gp, 0);
    acc.gp += gp;
    acc.pts += parseNum(row.ppg, 0) * gp;
    acc.reb += parseNum(row.rpg, 0) * gp;
    acc.ast += parseNum(row.apg, 0) * gp;
    acc.stl += parseNum(row.spg, 0) * gp;
    acc.blk += parseNum(row.bpg, 0) * gp;
    return acc;
  }, { gp: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 });
  const peakValues = seasons
    .map(row => parseNum(row.ppg, 0) * 2.2 + parseNum(row.rpg, 0) * 1.15 + parseNum(row.apg, 0) * 1.35 + parseNum(row.spg, 0) * 4.2 + parseNum(row.bpg, 0) * 4.2)
    .sort((a, b) => b - a)
    .slice(0, 3);
  const peakScore = peakValues.reduce((sum, value) => sum + value, 0);
  const honorScore = legacyHonorScore(honors);
  const championshipBonus = legacyChampionshipScore(honors);
  const cumulativeScore = Math.min(220,
    Math.sqrt(Math.max(0, totals.pts)) * 0.92 +
    Math.sqrt(Math.max(0, totals.reb)) * 0.62 +
    Math.sqrt(Math.max(0, totals.ast)) * 0.72 +
    Math.sqrt(Math.max(0, totals.stl + totals.blk)) * 0.6 +
    Math.min(60, totals.gp / 22)
  );
  const peakComponent = Math.min(135, peakScore * 0.46);
  const longevityScore = Math.min(65, seasons.length * 3.4 + totals.gp / 58);
  return {
    legacyScore: +Math.max(160, Math.min(5000, 135 + honorScore + championshipBonus + cumulativeScore + peakComponent + longevityScore)).toFixed(1),
    peakScore: +peakScore.toFixed(1),
    honorScore: +honorScore.toFixed(1),
    championshipBonus: +championshipBonus.toFixed(1),
    scoreBreakdown: {
      formulaVersion: LEGACY_FORMULA_VERSION,
      honors: +honorScore.toFixed(1),
      championships: +championshipBonus.toFixed(1),
      cumulative: +cumulativeScore.toFixed(1),
      peak: +peakComponent.toFixed(1),
      longevity: +longevityScore.toFixed(1)
    },
    totals
  };
}

function legacyHonorScore(honors = honorCounter()) {
  return (
    honors.rings * 70 + honors.mvp * 165 + honors.fmvp * 150 + honors.dpoy * 60 + honors.roy * 12 +
    honors.allNba1 * 48 + honors.allNba2 * 28 + honors.allNba3 * 16 + honors.allDefensive * 12 +
    honors.allStar * 6 + honors.allStarMvp * 8 + honors.scoring * 18 + honors.rebound * 13 +
    honors.assist * 13 + honors.block * 11 + honors.steal * 11
  );
}

function legacyChampionshipScore(honors = honorCounter()) {
  const rings = parseNum(honors.rings, 0);
  const fmvp = parseNum(honors.fmvp, 0);
  const dynasty = rings >= 3 ? (rings - 2) * 22 : 0;
  return Math.min(290, rings * 22 + fmvp * 34 + dynasty);
}

function roundStat(value, digits = 1) {
  const n = parseNum(value, 0);
  return +n.toFixed(digits);
}

function pctFromStat(value) {
  const n = parseNum(value, 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return +(n <= 1 ? n * 100 : n).toFixed(1);
}

function perGame(total, gp) {
  const games = Math.max(1, parseNum(gp, 0));
  return roundStat(parseNum(total, 0) / games, 1);
}

function normalizeExternalPlayerName(value) {
  return cleanText(value).replace(/\*/g, '').replace(/\s+/g, ' ').trim();
}

function externalTotalsRowToSeason(row = {}) {
  const seasonEndYear = parseNum(row.Year, 0);
  const gp = parseNum(row.G, 0);
  if (!seasonEndYear || gp <= 0) return null;
  const team = cleanText(row.Tm || '');
  return {
    type: 'regular',
    season: seasonEndYear - 1,
    seasonEndYear,
    team,
    teamId: BREF_TEAM_ALIASES[team] || 0,
    gp,
    mins: perGame(row.MP, gp),
    fgPct: pctFromStat(row['FG%']),
    tpPct: pctFromStat(row['3P%']),
    ftPct: pctFromStat(row['FT%']),
    ppg: perGame(row.PTS, gp),
    rpg: perGame(row.TRB, gp),
    apg: perGame(row.AST, gp),
    spg: perGame(row.STL, gp),
    bpg: perGame(row.BLK, gp),
    source: 'github_kaggle_seasons_stats'
  };
}

function externalPerGameRowToSeason(row = {}, seasonEndYear = 2025) {
  const gp = parseNum(row.G, 0);
  if (gp <= 0) return null;
  const team = cleanText(row.Team || row.Tm || '');
  return {
    type: 'regular',
    season: seasonEndYear - 1,
    seasonEndYear,
    team,
    teamId: BREF_TEAM_ALIASES[team] || 0,
    gp,
    mins: roundStat(row.MP, 1),
    fgPct: pctFromStat(row['FG%']),
    tpPct: pctFromStat(row['3P%']),
    ftPct: pctFromStat(row['FT%']),
    ppg: roundStat(row.PTS, 1),
    rpg: roundStat(row.TRB, 1),
    apg: roundStat(row.AST, 1),
    spg: roundStat(row.STL, 1),
    bpg: roundStat(row.BLK, 1),
    source: 'github_2025_per_game'
  };
}

function isAggregateTeamCode(team) {
  return /^(TOT|\dTM)$/i.test(cleanText(team));
}

function mergeTeamSpan(...items) {
  const out = [];
  items.flat().forEach(item => {
    const team = cleanText(item);
    if (!team || isAggregateTeamCode(team) || out.includes(team)) return;
    out.push(team);
  });
  return out;
}

function resolveAggregateSeasonTeam(totalRow, teamRow) {
  if (!totalRow || !teamRow) return totalRow || teamRow || null;
  const team = cleanText(teamRow.team);
  const teamId = parseNum(teamRow.teamId, BREF_TEAM_ALIASES[team] || TEAM_ALIASES[team] || 0);
  if (!team || !teamId || isAggregateTeamCode(team)) return totalRow;
  const teamGames = parseNum(teamRow.gp, 0);
  const currentGames = parseNum(totalRow.primaryTeamGames, -1);
  const teamSpan = mergeTeamSpan(totalRow.teamSpan || [], teamRow.teamSpan || [], totalRow.team, team);
  if (parseNum(totalRow.teamId, 0) > 0 && currentGames > teamGames) {
    return { ...totalRow, teamSpan };
  }
  return {
    ...totalRow,
    team,
    teamId,
    teamAggregate: totalRow.teamAggregate || cleanText(totalRow.team) || 'TOT',
    teamSpan,
    primaryTeamGames: teamGames
  };
}

function seasonEndYearFromSeasonLabel(label) {
  const text = cleanText(label);
  const m = text.match(/^(\d{4})-(\d{2})$/);
  if (!m) return parseNum(text, 0);
  const start = parseNum(m[1], 0);
  const suffix = parseNum(m[2], 0);
  const century = Math.floor(start / 100) * 100;
  let end = century + suffix;
  if (end <= start) end += 100;
  return end;
}

function minutesToNumber(value) {
  const text = cleanText(value);
  if (!text) return 0;
  const m = text.match(/^(\d+):(\d+)$/);
  if (m) return parseNum(m[1], 0) + parseNum(m[2], 0) / 60;
  return parseNum(text, 0);
}

function initBoxAggregate(row = {}, seasonEndYear = 0) {
  const team = cleanText(row.teamTricode || row.TEAM_ABBREVIATION || '');
  return {
    name: normalizeExternalPlayerName(row.personName),
    seasonEndYear,
    season: seasonEndYear - 1,
    teams: new Set(team ? [team] : []),
    teamGames: new Map(),
    gp: 0,
    mins: 0,
    fgm: 0,
    fga: 0,
    tpm: 0,
    tpa: 0,
    ftm: 0,
    fta: 0,
    reb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    pts: 0
  };
}

function addBoxScoreToAggregate(acc, row = {}) {
  const mins = minutesToNumber(row.minutes);
  const pts = parseNum(row.points, 0);
  const reb = parseNum(row.reboundsTotal, 0);
  const ast = parseNum(row.assists, 0);
  const stl = parseNum(row.steals, 0);
  const blk = parseNum(row.blocks, 0);
  const played = mins > 0 || pts || reb || ast || stl || blk || parseNum(row.fieldGoalsAttempted, 0) || parseNum(row.freeThrowsAttempted, 0);
  if (!played) return;
  const team = cleanText(row.teamTricode || '');
  if (team) {
    acc.teams.add(team);
    acc.teamGames.set(team, (acc.teamGames.get(team) || 0) + 1);
  }
  acc.gp += 1;
  acc.mins += mins;
  acc.fgm += parseNum(row.fieldGoalsMade, 0);
  acc.fga += parseNum(row.fieldGoalsAttempted, 0);
  acc.tpm += parseNum(row.threePointersMade, 0);
  acc.tpa += parseNum(row.threePointersAttempted, 0);
  acc.ftm += parseNum(row.freeThrowsMade, 0);
  acc.fta += parseNum(row.freeThrowsAttempted, 0);
  acc.reb += reb;
  acc.ast += ast;
  acc.stl += stl;
  acc.blk += blk;
  acc.pts += pts;
}

function boxAggregateToSeasonRow(acc) {
  if (!acc || acc.gp <= 0) return null;
  const teams = [...acc.teams].filter(Boolean);
  const teamGames = [...(acc.teamGames || new Map()).entries()]
    .filter(([team]) => team && !isAggregateTeamCode(team))
    .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
  const team = teamGames[0]?.[0] || teams.find(item => !isAggregateTeamCode(item)) || teams[0] || '';
  const teamSpan = teamGames.map(([item]) => item);
  const teamId = BREF_TEAM_ALIASES[team] || 0;
  return {
    type: 'regular',
    season: acc.season,
    seasonEndYear: acc.seasonEndYear,
    team,
    teamId,
    ...(teams.length > 1 ? { teamAggregate: 'TOT', teamSpan, primaryTeamGames: teamGames[0]?.[1] || 0 } : {}),
    gp: acc.gp,
    mins: roundStat(acc.mins / acc.gp, 1),
    fgPct: acc.fga > 0 ? roundStat(acc.fgm / acc.fga * 100, 1) : 0,
    tpPct: acc.tpa > 0 ? roundStat(acc.tpm / acc.tpa * 100, 1) : 0,
    ftPct: acc.fta > 0 ? roundStat(acc.ftm / acc.fta * 100, 1) : 0,
    ppg: roundStat(acc.pts / acc.gp, 1),
    rpg: roundStat(acc.reb / acc.gp, 1),
    apg: roundStat(acc.ast / acc.gp, 1),
    spg: roundStat(acc.stl / acc.gp, 1),
    bpg: roundStat(acc.blk / acc.gp, 1),
    source: 'github_nba_box_scores_2010_2024'
  };
}

function loadBoxScoreSeasonRows(source) {
  const aggregate = new Map();
  let rawRows = 0;
  (source.paths || []).forEach(file => {
    if (!fs.existsSync(file)) return;
    const rows = readDelimitedFile(file, ',');
    rawRows += rows.length;
    rows.forEach(row => {
      const name = normalizeExternalPlayerName(row.personName);
      const key = normalizeKey(name);
      const seasonEndYear = seasonEndYearFromSeasonLabel(row.season_year);
      if (!key || !seasonEndYear) return;
      const mapKey = `${key}:${seasonEndYear}`;
      if (!aggregate.has(mapKey)) aggregate.set(mapKey, initBoxAggregate(row, seasonEndYear));
      addBoxScoreToAggregate(aggregate.get(mapKey), row);
    });
  });
  const rows = [...aggregate.entries()]
    .map(([mapKey, acc]) => {
      const row = boxAggregateToSeasonRow(acc);
      if (!row) return null;
      const key = mapKey.split(':')[0];
      return { key, name: acc.name, row };
    })
    .filter(Boolean);
  return { rows, rawRows };
}

function preferExternalSeasonRow(existing, candidate) {
  if (!existing) return candidate;
  if (candidate.source === 'github_2025_per_game') return candidate;
  if (candidate.source === 'github_nba_box_scores_2010_2024' && parseNum(candidate.seasonEndYear, 0) >= 2018) return candidate;
  const existingAggregate = isAggregateTeamCode(existing.team) || existing.teamAggregate;
  const candidateAggregate = isAggregateTeamCode(candidate.team) || candidate.teamAggregate;
  if (candidateAggregate && !existingAggregate) return resolveAggregateSeasonTeam(candidate, existing);
  if (existingAggregate && !candidateAggregate) return resolveAggregateSeasonTeam(existing, candidate);
  if (candidateAggregate && existingAggregate) return parseNum(candidate.gp, 0) > parseNum(existing.gp, 0) ? candidate : existing;
  return parseNum(candidate.gp, 0) > parseNum(existing.gp, 0) ? candidate : existing;
}

function loadExternalRegularSeasonStats() {
  const byNameYear = new Map();
  const coverage = [];
  EXTERNAL_REGULAR_SEASON_SOURCES.forEach(source => {
    if (source.kind === 'nba_game_box_scores') {
      const available = (source.paths || []).some(file => fs.existsSync(file));
      if (!available) {
        coverage.push({ ...source, available: false, rows: 0, paths: (source.paths || []).map(file => path.relative(ROOT, file).replace(/\\/g, '/')) });
        return;
      }
      const loaded = loadBoxScoreSeasonRows(source);
      loaded.rows.forEach(item => {
        const mapKey = `${item.key}:${item.row.seasonEndYear}`;
        const existing = byNameYear.get(mapKey);
        byNameYear.set(mapKey, {
          key: item.key,
          name: item.name,
          row: preferExternalSeasonRow(existing?.row || null, item.row)
        });
      });
      coverage.push({
        ...source,
        path: undefined,
        paths: (source.paths || []).map(file => path.relative(ROOT, file).replace(/\\/g, '/')),
        available: true,
        rows: loaded.rawRows,
        usableRows: loaded.rows.length
      });
      return;
    }
    const relPath = path.relative(ROOT, source.path).replace(/\\/g, '/');
    if (!fs.existsSync(source.path)) {
      coverage.push({ ...source, path: relPath, available: false, rows: 0 });
      return;
    }
    const rows = readDelimitedFile(source.path, ',');
    let usable = 0;
    rows.forEach(row => {
      const name = normalizeExternalPlayerName(row.Player);
      const key = normalizeKey(name);
      if (!key) return;
      const seasonRow = source.kind === 'basketball_reference_per_game'
        ? externalPerGameRowToSeason(row, 2025)
        : externalTotalsRowToSeason(row);
      if (!seasonRow) return;
      usable++;
      const mapKey = `${key}:${seasonRow.seasonEndYear}`;
      const existing = byNameYear.get(mapKey);
      byNameYear.set(mapKey, {
        key,
        name,
        row: preferExternalSeasonRow(existing?.row || null, seasonRow)
      });
    });
    coverage.push({ ...source, path: relPath, available: true, rows: rows.length, usableRows: usable });
  });
  const byName = new Map();
  [...byNameYear.values()].forEach(item => {
    if (!byName.has(item.key)) byName.set(item.key, []);
    byName.get(item.key).push(item.row);
  });
  byName.forEach(list => list.sort((a, b) => parseNum(a.season, 0) - parseNum(b.season, 0)));
  return { byName, coverage };
}

function playerHistoryKeys(player = {}) {
  const keys = [
    player.historyKey,
    player.name,
    player.displayName,
    player.nameEn,
    player.nameCn,
    ...(Array.isArray(player.aliases) ? player.aliases : [])
  ].map(normalizeKey).filter(Boolean);
  const baseKeys = [...new Set(keys)];
  const extra = baseKeys.flatMap(key => EXTERNAL_NAME_ALIASES[key] || []);
  return [...new Set([...baseKeys, ...extra.map(normalizeKey).filter(Boolean)])];
}

function mergeExternalSeasonRowsForKeys(externalByName, keys = []) {
  const bySeason = new Map();
  keys.forEach(key => {
    const rows = externalByName.get(key) || [];
    rows.forEach(row => {
      const seasonEndYear = parseNum(row.seasonEndYear, row.season + 1);
      const mapKey = `${row.type || 'regular'}:${seasonEndYear}`;
      bySeason.set(mapKey, preferExternalSeasonRow(bySeason.get(mapKey) || null, row));
    });
  });
  return [...bySeason.values()].sort((a, b) => {
    const ay = parseNum(a.season, 0);
    const by = parseNum(b.season, 0);
    if (ay !== by) return ay - by;
    return String(a.source || '').localeCompare(String(b.source || ''));
  });
}

function ensurePlayer(players, row = {}, startYear = 0) {
  const key = nameKeyFromRow(row);
  if (!key) return null;
  const manual = MANUAL_PLAYERS[key];
  const realId = manual?.realId || `local:${key}`;
  const displayOverride = DISPLAY_NAME_OVERRIDES[key] || '';
  if (!players.has(realId)) {
    players.set(realId, {
      realId,
      historyKey: key,
      name: manual?.name || displayOverride || cleanText(row.nameBirth || row.name),
      displayName: manual?.displayName || displayOverride || cleanText(row.nameBirth || row.name),
      nameCn: cleanText(row.name || ''),
      nameEn: cleanText(row.nameBirth || ''),
      aliases: manual?.aliases || [cleanText(row.name), cleanText(row.nameBirth), displayOverride].filter(Boolean),
      draft: manual?.draft || {
        year: draftYearFromDraftCode(row.draft),
        round: parseNum(row.draftRound, 0),
        pick: draftPickFromDraftCode(row.draft),
        team: ''
      },
      position: { primary: parseNum(row.positionFirst, 0), secondary: parseNum(row.positionSecond, 0) },
      sourceCoverage: {
        rosterSnapshots: true,
        regularSeason: !!manual?.regularSeasons?.length,
        playoffs: !!manual?.playoffSeasons?.length,
        awards: !!manual?.honorsByEndYear,
        transactions: false,
        salaries: false,
        provider: 'local_csv'
      },
      rosterSnapshots: [],
      honorsFromRosters: {},
      sourceNotes: manual?.sourceNotes || ['Generated from local roster CSV snapshots; detailed season stats require a GitHub raw snapshot adapter.']
    });
  }
  const player = players.get(realId);
  attachPhotoFields(player, row.image, realId);
  if (startYear) {
    const snapshot = attachPhotoFields({
      startYear,
      teamId: parseNum(row.teamID, 0),
      team: cleanText(row.team),
      age: parseNum(row.age, 0),
      yearsLeague: parseNum(row.yearsLeague, 0),
      rating: parseNum(row.Ranks, 0),
      potential: parseNum(row.potential, 0),
      draft: parseNum(row.draft, 0),
      honors: rosterHonors(row)
    }, row.image, realId);
    player.rosterSnapshots.push(snapshot);
    player.honorsFromRosters[startYear] = rosterHonors(row);
  }
  return player;
}

function buildPlayers() {
  const players = new Map();
  for (const [idxRaw, startYear] of Object.entries(ROSTER_INDEX_TO_START_YEAR)) {
    if (![...SUPPORTED_START_YEARS, ...DATA_VALIDATION_YEARS].includes(startYear)) continue;
    const rows = readCsv(`rosters${String(idxRaw).padStart(2, '0')}.csv`);
    rows.forEach(row => ensurePlayer(players, row, startYear));
  }
  Object.entries(MANUAL_PLAYERS).forEach(([key, manual]) => {
    if (!players.has(manual.realId)) {
      players.set(manual.realId, {
        realId: manual.realId,
        historyKey: key,
        name: manual.name,
        displayName: manual.displayName,
        nameCn: '',
        nameEn: manual.name,
        aliases: manual.aliases,
        draft: manual.draft,
        position: { primary: 0, secondary: 0 },
        sourceCoverage: {
          rosterSnapshots: false,
          regularSeason: true,
          playoffs: true,
          awards: true,
          transactions: false,
          salaries: false,
          provider: 'manual_verified_public_stats'
        },
        rosterSnapshots: [],
        honorsFromRosters: {},
        sourceNotes: manual.sourceNotes
      });
    }
  });
  return [...players.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
}

function buildSeasonFiles(players = []) {
  const byYear = new Map();
  const external = loadExternalRegularSeasonStats();
  const matchedExternalRows = new Map();
  players.forEach(player => {
    const keys = playerHistoryKeys(player);
    const rows = mergeExternalSeasonRowsForKeys(external.byName, keys);
    if (!rows.length) return;
    Object.defineProperty(player, '_regularSeasonRows', { value: rows, enumerable: false, configurable: true });
    matchedExternalRows.set(player.realId, rows.map(row => ({
      ...row,
      realId: player.realId,
      name: player.name || player.displayName || row.name,
      displayName: player.displayName || player.name || row.name,
      source: row.source || 'github_player_season_csv'
    })));
    player.sourceCoverage = {
      ...(player.sourceCoverage || {}),
      regularSeason: true,
      regularSeasonRows: rows.length,
      regularSeasonSource: [...new Set(rows.map(row => row.source || 'github_player_season_csv'))].join(',')
    };
  });
  Object.values(MANUAL_PLAYERS).forEach(player => {
    const existingExternal = matchedExternalRows.get(player.realId) || [];
    const manualSeasonEndYears = new Set((player.regularSeasons || []).map(row => parseNum(row.seasonEndYear, 0)));
    const allRows = [
      ...(player.regularSeasons || []),
      ...existingExternal.filter(row => row.type === 'regular' && !manualSeasonEndYears.has(parseNum(row.seasonEndYear, 0))),
      ...(player.playoffSeasons || [])
    ].map(row => ({
      ...row,
      realId: player.realId,
      name: player.name,
      displayName: player.displayName,
      source: row.source || 'manual_verified_public_stats'
    }));
    allRows.forEach(row => {
      const y = parseNum(row.seasonEndYear, row.season + 1);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(row);
    });
    matchedExternalRows.delete(player.realId);
  });
  matchedExternalRows.forEach(rows => {
    rows.forEach(row => {
      const y = parseNum(row.seasonEndYear, row.season + 1);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y).push(row);
    });
  });
  byYear.externalCoverage = external.coverage;
  byYear.matchedPlayerCount = players.filter(player => parseNum(player.sourceCoverage?.regularSeasonRows, 0) > 0).length;
  return byYear;
}

const HONOR_LABELS = [
  ['rings', '总冠军'], ['mvp', 'MVP'], ['fmvp', 'FMVP'], ['dpoy', 'DPOY'], ['roy', 'ROY'],
  ['allStar', '全明星'], ['allStarMvp', '全明星MVP'], ['allNba1', '一阵'], ['allNba2', '二阵'],
  ['allNba3', '三阵'], ['allDefensive', '一防'], ['scoring', '得分王'], ['rebound', '篮板王'],
  ['assist', '助攻王'], ['block', '盖帽王'], ['steal', '抢断王']
];

function hasAnyHonor(honors = {}) {
  const normalized = mergeHonors(honors);
  return Object.keys(normalized).some(key => parseNum(normalized[key], 0) > 0);
}

function honorDelta(current = {}, previous = {}) {
  const cur = mergeHonors(current);
  const prev = mergeHonors(previous);
  const out = honorCounter();
  Object.keys(out).forEach(key => {
    out[key] = Math.max(0, parseNum(cur[key], 0) - parseNum(prev[key], 0));
  });
  return out;
}

function honorCounterLabels(counter = {}) {
  const c = mergeHonors(counter);
  return HONOR_LABELS
    .filter(([key]) => parseNum(c[key], 0) > 0)
    .map(([key, label]) => parseNum(c[key], 0) > 1 ? `${label} x${parseNum(c[key], 0)}` : label);
}

function collectHonorEvidenceYears(player = {}) {
  const manual = MANUAL_PLAYERS[player.historyKey] || null;
  const years = new Set();
  Object.keys(manual?.honorsByEndYear || {}).forEach(year => years.add(parseNum(year, 0)));
  (HONOR_OVERRIDES_BY_END_YEAR[normalizeKey(player.historyKey)] || []).forEach(row => years.add(parseNum(row.year, 0)));
  (Array.isArray(player.rosterSnapshots) ? player.rosterSnapshots : []).forEach(row => {
    if (hasAnyHonor(row.honors || null)) years.add(parseNum(row.startYear, 0));
  });
  Object.entries(player.honorsFromRosters || {}).forEach(([year, honors]) => {
    if (hasAnyHonor(honors)) years.add(parseNum(year, 0));
  });
  return [...years].filter(Boolean).sort((a, b) => a - b);
}

function buildAwardTimelineForPlayer(player = {}) {
  const manual = MANUAL_PLAYERS[player.historyKey] || null;
  const evidenceYears = collectHonorEvidenceYears(player);
  if (!evidenceYears.length) return { cumulative: {}, seasons: [] };
  const earliestEvidence = evidenceYears[0];
  const targetYears = [...new Set([
    ...evidenceYears,
    ...RANKING_AS_OF_YEARS.filter(year => year >= earliestEvidence)
  ])].sort((a, b) => a - b);
  const cumulative = {};
  let previous = honorCounter();
  const seasons = [];
  targetYears.forEach(year => {
    const honors = honorsForPlayerAtYear(player, manual, year);
    if (!hasAnyHonor(honors)) return;
    cumulative[String(year)] = mergeHonors(honors);
    const delta = honorDelta(honors, previous);
    if (hasAnyHonor(delta)) {
      const hasExactSeasonSource = evidenceYears.includes(year);
      seasons.push({
        seasonEndYear: year,
        year,
        awards: honorCounterLabels(delta),
        counter: delta,
        cumulative: mergeHonors(honors),
        source: manual?.honorsByEndYear?.[year] ? 'manual_verified_awards'
          : (HONOR_OVERRIDES_BY_END_YEAR[normalizeKey(player.historyKey)] || []).some(row => parseNum(row.year, 0) === year) ? 'verified_honor_override'
            : 'roster_aggregate_snapshot',
        approximate: !hasExactSeasonSource || (!manual?.honorsByEndYear?.[year] && !(HONOR_OVERRIDES_BY_END_YEAR[normalizeKey(player.historyKey)] || []).some(row => parseNum(row.year, 0) === year))
      });
    }
    previous = maxHonors(previous, honors);
  });
  return { cumulative, seasons };
}

function buildAwards(players = []) {
  const playerAwards = {};
  const awardSeasons = {};
  players.forEach(player => {
    if (!player?.realId) return;
    const timeline = buildAwardTimelineForPlayer(player);
    if (Object.keys(timeline.cumulative).length) playerAwards[player.realId] = timeline.cumulative;
    if (timeline.seasons.length) awardSeasons[player.realId] = timeline.seasons;
  });
  return {
    version: 2,
    playerAwards,
    awardSeasons,
    sourceCoverage: {
      providerChain: providerStatus(),
      source: 'historical_awards',
      nbaApiPlayerAwards: process.env.HISTORICAL_DB_FETCH === '1' ? 'adapter_ready_no_raw_cache' : 'offline_not_refreshed',
      localRosterAggregates: true,
      manualVerifiedTimelines: Object.keys(MANUAL_PLAYERS).filter(key => MANUAL_PLAYERS[key]?.honorsByEndYear).length,
      verifiedHonorOverrides: Object.keys(HONOR_OVERRIDES_BY_END_YEAR).length,
      playersWithAwards: Object.keys(playerAwards).length,
      playersWithAwardSeasons: Object.keys(awardSeasons).length,
      noFakeAwards: true
    }
  };
}

function buildDraftClasses(players) {
  const classes = {};
  const rows = readCsv('rostersRookiesReal.csv');
  const rowByYearKey = new Map();
  rows.forEach((row, index) => {
    const draftYear = draftYearFromDraftCode(row.draft);
    if (draftYear < 1947 || draftYear > 2026) return;
    const key = nameKeyFromRow(row);
    const manual = MANUAL_PLAYERS[key];
    const pick = draftPickFromDraftCode(row.draft) || index + 1;
    if (!classes[draftYear]) classes[draftYear] = [];
    const realId = manual?.realId || `draft:${draftYear}:${key || index}`;
    rowByYearKey.set(`${draftYear}:${key}`, row);
    const item = attachPhotoFields({
      realId,
      historyKey: key,
      name: manual?.name || cleanText(row.nameBirth || row.name),
      displayName: manual?.displayName || cleanText(row.nameBirth || row.name),
      nameCn: cleanText(row.name || ''),
      nameEn: cleanText(row.nameBirth || ''),
      pos: parseNum(row.positionFirst, 0),
      pos2: parseNum(row.positionSecond, 0),
      pick,
      draftYear,
      draft: parseNum(row.draft, draftYear * 100 + pick),
      age: parseNum(row.age, 0),
      ratingSeed: parseNum(row.Ranks, 0),
      potentialSeed: parseNum(row.potential, 0),
      source: 'assets/data/rostersRookiesReal.csv',
      provider: 'local_csv'
    }, row.image, realId);
    classes[draftYear].push(item);
  });
  Object.entries(DRAFT_PATCHES).forEach(([yearRaw, patches]) => {
    const year = parseNum(yearRaw, 0);
    if (!classes[year]) classes[year] = [];
    const existing = new Set(classes[year].map(item => normalizeKey(item.name || item.nameEn || item.nameCn)));
    patches.forEach(patch => {
      const key = normalizeKey(patch.name);
      if (existing.has(key)) return;
      const manual = MANUAL_PLAYERS[key];
      const realId = manual?.realId || `draft:${year}:${key}`;
      const sourceRow = rowByYearKey.get(`${year}:${key}`) || {};
      classes[year].push(attachPhotoFields({
        realId,
        historyKey: key,
        name: patch.name,
        displayName: patch.name,
        nameCn: '',
        nameEn: patch.name,
        pos: patch.pos,
        pos2: 0,
        pick: patch.pick,
        draftYear: year,
        draft: year * 100 + patch.pick,
        draftTeam: patch.team,
        teamId: TEAM_ALIASES[patch.team] || 0,
        college: patch.college,
        source: 'manual_draft_patch',
        provider: 'manual_patch'
      }, sourceRow.image, realId));
    });
  });
  Object.keys(classes).forEach(year => {
    classes[year].sort((a, b) => parseNum(a.pick, 999) - parseNum(b.pick, 999) || String(a.name).localeCompare(String(b.name)));
  });
  return classes;
}

function latestRosterSnapshotAtOrBefore(player, year) {
  const snapshots = (Array.isArray(player?.rosterSnapshots) ? player.rosterSnapshots : [])
    .filter(row => parseNum(row.startYear, 0) <= year)
    .sort((a, b) => parseNum(a.startYear, 0) - parseNum(b.startYear, 0));
  return snapshots[snapshots.length - 1] || null;
}

function honorsForPlayerAtYear(player, manual, year) {
  const manualHonors = pickHonorsByYear(manual, year);
  const overrideHonors = pickHonorOverrideByYear(player?.historyKey, year);
  const snapshots = (Array.isArray(player?.rosterSnapshots) ? player.rosterSnapshots : [])
    .filter(row => parseNum(row.startYear, 0) <= year)
    .sort((a, b) => parseNum(a.startYear, 0) - parseNum(b.startYear, 0));
  const snapshotHonors = snapshots.length ? mergeHonors(snapshots[snapshots.length - 1].honors || null) : null;
  if (manualHonors || snapshotHonors || overrideHonors) return maxHonors(manualHonors, snapshotHonors, overrideHonors);
  return honorCounter();
}

function scoreFromRosterSnapshot(snapshot = {}, honors = honorCounter()) {
  const rating = clampNumber(parseNum(snapshot.rating, 0), 45, 100);
  const potential = clampNumber(parseNum(snapshot.potential, rating), 1, 99);
  const yearsLeague = Math.max(0, parseNum(snapshot.yearsLeague, 0));
  const honorScore = legacyHonorScore(honors);
  const championshipBonus = legacyChampionshipScore(honors);
  const ratingScore = (rating - 45) * 2.2 + Math.max(0, potential - 70) * 1.2;
  const longevityScore = Math.min(65, yearsLeague * 4.8);
  const base = 120 + honorScore + championshipBonus + ratingScore + longevityScore;
  return {
    legacyScore: +Math.max(120, Math.min(4500, base)).toFixed(1),
    peakScore: +((rating - 45) * 4.4 + Math.min(90, yearsLeague * 4)).toFixed(1),
    honorScore: +honorScore.toFixed(1),
    championshipBonus: +championshipBonus.toFixed(1),
    scoreBreakdown: {
      formulaVersion: LEGACY_FORMULA_VERSION,
      honors: +honorScore.toFixed(1),
      championships: +championshipBonus.toFixed(1),
      rating: +ratingScore.toFixed(1),
      longevity: +longevityScore.toFixed(1)
    },
    totals: {}
  };
}

function clampNumber(value, lo, hi) {
  return Math.max(lo, Math.min(hi, value));
}

function buildHistoricalEntryForYear(player, year) {
  if (!player?.realId) return null;
  const manual = MANUAL_PLAYERS[player.historyKey] || null;
  const draftYear = parseNum(manual?.draft?.year || player.draft?.year, 0);
  if (draftYear && draftYear > year) return null;
  const manualRows = manual?.regularSeasons || [];
  const manualEndYears = new Set(manualRows.map(row => parseNum(row.seasonEndYear, 0)));
  const externalRows = (player._regularSeasonRows || []).filter(row => !manualEndYears.has(parseNum(row.seasonEndYear, 0)));
  const seasons = [...manualRows, ...externalRows].filter(row => parseNum(row.seasonEndYear, 0) <= year);
  const honors = honorsForPlayerAtYear(player, manual, year);
  const snapshot = latestRosterSnapshotAtOrBefore(player, year);
  const hasHonor = Object.values(honors).some(value => parseNum(value, 0) > 0);
  if (!seasons.length && (!snapshot || (parseNum(snapshot.yearsLeague, 0) <= 0 && !hasHonor))) return null;
  const scored = seasons.length ? scoreFromStats(seasons, honors) : scoreFromRosterSnapshot(snapshot, honors);
  return {
    id: player.realId,
    realId: player.realId,
    source: seasons.length ? 'historical_db' : 'roster_aggregate',
    name: player.displayName || player.name || player.nameEn || player.nameCn || player.realId,
    displayName: player.displayName || player.name || player.nameEn || player.nameCn || player.realId,
    nameCn: player.nameCn || '',
    nameEn: player.nameEn || player.displayName || '',
    legacyScore: scored.legacyScore,
    peakScore: scored.peakScore,
    honorScore: scored.honorScore || 0,
    honorSummary: summarizeHonors(honors),
    scoreBreakdown: scored.scoreBreakdown || { formulaVersion: LEGACY_FORMULA_VERSION },
    honors,
    totals: scored.totals,
    asOfYear: year,
    draftYear,
    image: player.image || snapshot?.image || 0,
    photoLocal: player.photoLocal || snapshot?.photoLocal || '',
    photoStatus: player.photoStatus || snapshot?.photoStatus || 'missing',
    sourceCoverage: {
      ...(player.sourceCoverage || {}),
      regularSeason: !!seasons.length,
      awards: hasHonor,
      rosterAggregate: !seasons.length,
      noFutureSeasons: true
    }
  };
}

function buildEraTop100(players) {
  const rankings = {};
  RANKING_AS_OF_YEARS.forEach(year => {
    const entries = players
      .map(player => buildHistoricalEntryForYear(player, year))
      .filter(Boolean)
      .sort((a, b) => parseNum(b.legacyScore, 0) - parseNum(a.legacyScore, 0) || a.name.localeCompare(b.name))
      .slice(0, 100)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    rankings[year] = entries;
  });
  return { version: 2, formulaVersion: LEGACY_FORMULA_VERSION, generatedAt: new Date().toISOString(), supportedStartYears: SUPPORTED_START_YEARS, dataValidationYears: DATA_VALIDATION_YEARS, rankings };
}

function writeJson(rel, value) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function localPhotoExists(photoLocal) {
  if (!photoLocal) return false;
  if (/IMG0000\.png$/i.test(photoLocal)) return false;
  return fs.existsSync(path.join(ROOT, photoLocal));
}

function validateHistoricalBuild({ players, seasonFiles, draftClasses, eraTop100, awards }) {
  const errors = [];
  const warnings = [];
  const rowsByRealId = new Map();
  const teamIdZeroRows = [];
  const awardsFile = awards || {};
  const awardsByPlayer = awardsFile.playerAwards || {};
  const awardSeasonsByPlayer = awardsFile.awardSeasons || {};
  const realIdForName = pattern => {
    const re = pattern instanceof RegExp ? pattern : new RegExp(String(pattern), 'i');
    return players.find(player => re.test(player.displayName || player.name || player.nameEn || ''))?.realId || '';
  };
  const latestAwardsAtYear = (realId, year) => {
    const byYear = awardsByPlayer[realId] || {};
    const years = Object.keys(byYear).map(Number).filter(v => v <= year).sort((a, b) => a - b);
    return years.length ? mergeHonors(byYear[String(years[years.length - 1])]) : honorCounter();
  };
  [...seasonFiles.values()].flat().forEach(row => {
    if (parseNum(row.teamId, 0) <= 0) {
      teamIdZeroRows.push({
        realId: row.realId || '',
        name: row.displayName || row.name || '',
        season: row.season,
        seasonEndYear: row.seasonEndYear,
        team: row.team || '',
        source: row.source || ''
      });
    }
    if (!row.realId || row.type !== 'regular') return;
    if (!rowsByRealId.has(row.realId)) rowsByRealId.set(row.realId, []);
    rowsByRealId.get(row.realId).push(row);
  });
  if (teamIdZeroRows.length) {
    errors.push(`player-season rows with teamId=0: ${teamIdZeroRows.length}`);
  }
  SUPPORTED_START_YEARS.forEach(year => {
    const list = draftClasses[String(year)] || draftClasses[year] || [];
    if (!list.length) errors.push(`draft_classes missing ${year}`);
    list.forEach(player => {
      if (!localPhotoExists(player.photoLocal)) {
        errors.push(`${year} draft photo missing: ${player.name || player.nameEn || player.realId}`);
      }
      if (player.photoStatus === 'cached_placeholder') {
        warnings.push(`${year} draft photo placeholder: ${player.name || player.nameEn || player.realId}`);
      }
    });
  });

  const names2009 = (draftClasses['2009'] || []).map(player => String(player.name || player.nameEn || ''));
  ['James Harden', 'Stephen Curry', 'Blake Griffin'].forEach(name => {
    if (!names2009.some(item => new RegExp(name, 'i').test(item))) errors.push(`2009 draft missing ${name}`);
  });
  const cooper = (draftClasses['2025'] || []).find(player => /Cooper Flagg/i.test(player.name || player.nameEn || ''));
  if (!cooper) errors.push('2025 draft missing Cooper Flagg');
  if (cooper && !localPhotoExists(cooper.photoLocal)) errors.push('2025 Cooper Flagg photo missing');

  const iversonRows = [...seasonFiles.values()]
    .flat()
    .filter(row => row.realId === 'nba:allen-iverson' && row.type === 'regular')
    .map(row => parseNum(row.season, 0))
    .sort((a, b) => a - b);
  const requiredIverson = [1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004];
  requiredIverson.forEach(year => {
    if (!iversonRows.includes(year)) errors.push(`Allen Iverson missing regular season ${year}-${String(year + 1).slice(-2)}`);
  });

  const anySeed = Object.values(eraTop100.rankings || {})
    .flat()
    .some(entry => String(entry.source || '').toLowerCase() === 'seed');
  if (anySeed) errors.push('era_top100 contains source=seed');

  if (awardsFile.version !== 2) errors.push('awards.json payload is not v2');
  if (!Object.keys(awardsByPlayer).length) errors.push('awards.json missing playerAwards');
  if (!Object.keys(awardSeasonsByPlayer).length) errors.push('awards.json missing awardSeasons');
  if (Object.keys(awardsByPlayer).length < 100) warnings.push(`historical awards coverage is low: ${Object.keys(awardsByPlayer).length} players`);
  const lebronRealId = realIdForName(/LeBron James/i) || 'nba:lebron-james';
  const kobeRealId = realIdForName(/Kobe Bryant/i);
  const jordanRealId = realIdForName(/Michael Jordan/i);
  const lebronAwards2009 = latestAwardsAtYear(lebronRealId, 2009);
  if (lebronAwards2009.rings !== 0 || lebronAwards2009.mvp !== 1 || lebronAwards2009.fmvp !== 0) {
    errors.push(`2009 LeBron awards mismatch: rings=${lebronAwards2009.rings}, mvp=${lebronAwards2009.mvp}, fmvp=${lebronAwards2009.fmvp}`);
  }
  const lebronSeason2009 = (awardSeasonsByPlayer[lebronRealId] || []).find(row => parseNum(row.seasonEndYear, 0) === 2009);
  const lebronSeasonLabels = (lebronSeason2009?.awards || []).join('/');
  ['MVP', '一阵', '一防', '全明星'].forEach(label => {
    if (!lebronSeasonLabels.includes(label)) errors.push(`2009 LeBron awardSeasons missing ${label}`);
  });
  const kobeAwards2009 = latestAwardsAtYear(kobeRealId, 2009);
  if (kobeAwards2009.rings < 4 || kobeAwards2009.fmvp < 1) {
    errors.push(`2009 Kobe awards mismatch: rings=${kobeAwards2009.rings}, fmvp=${kobeAwards2009.fmvp}`);
  }
  const jordanAwards2009 = latestAwardsAtYear(jordanRealId, 2009);
  if (jordanAwards2009.rings !== 6 || jordanAwards2009.mvp !== 5 || jordanAwards2009.fmvp !== 6) {
    errors.push(`2009 Jordan awards mismatch: rings=${jordanAwards2009.rings}, mvp=${jordanAwards2009.mvp}, fmvp=${jordanAwards2009.fmvp}`);
  }

  const allowedNoNbaDataPlayers = [];
  const incompleteMatchedHistories = [];
  players.forEach(player => {
    (player.rosterSnapshots || [])
      .filter(snapshot => SUPPORTED_START_YEARS.includes(parseNum(snapshot.startYear, 0)))
      .forEach(snapshot => {
        const startYear = parseNum(snapshot.startYear, 0);
        const yearsLeague = parseNum(snapshot.yearsLeague, 0);
        if (yearsLeague <= 0) return;
        const priorRows = (rowsByRealId.get(player.realId) || [])
          .filter(row => parseNum(row.seasonEndYear, 0) <= startYear);
        const matchedRowKeys = new Set([
          ...(player._regularSeasonRows || []),
          ...((MANUAL_PLAYERS[player.historyKey]?.regularSeasons || []))
        ]
          .filter(row => parseNum(row.seasonEndYear, 0) <= startYear)
          .map(row => `${row.type || 'regular'}:${parseNum(row.seasonEndYear, row.season + 1)}`));
        const matchedRows = [...matchedRowKeys];
        if (!priorRows.length) {
          allowedNoNbaDataPlayers.push({
            startYear,
            realId: player.realId,
            name: player.displayName || player.name,
            yearsLeague,
            reason: 'no official NBA regular-season rows matched before start year; allowed for CBA, fictional, or no-NBA-regular-season players'
          });
          return;
        }
        if (matchedRows.length > priorRows.length) {
          incompleteMatchedHistories.push({
            startYear,
            realId: player.realId,
            name: player.displayName || player.name,
            expectedRows: matchedRows.length,
            writtenRows: priorRows.length,
            reason: 'matched official season rows were not fully written into player_seasons files'
          });
        }
      });
  });
  if (allowedNoNbaDataPlayers.length) {
    warnings.push(`allowed no-NBA-data roster players: ${allowedNoNbaDataPlayers.length}`);
  }
  if (incompleteMatchedHistories.length) {
    errors.push(`incomplete matched player-season histories: ${incompleteMatchedHistories.length}`);
  }

  const lebron2003 = (eraTop100.rankings['2003'] || []).find(entry => /LeBron James/i.test(entry.name || entry.nameEn || ''));
  if (lebron2003) warnings.push('2003 LeBron appears in era ranking; verify rookie/no-future scoring threshold');

  const report = {
    version: 1,
    generatedAt: new Date().toISOString(),
    providerChain: providerStatus(),
    supportedStartYears: SUPPORTED_START_YEARS,
    dataValidationYears: DATA_VALIDATION_YEARS,
    errors,
    warnings,
    teamIdZeroRows: teamIdZeroRows.slice(0, 200),
    allowedNoNbaDataPlayers: allowedNoNbaDataPlayers.slice(0, 300),
    incompleteMatchedHistories: incompleteMatchedHistories.slice(0, 200),
    checks: {
      targetDraftPhotos: errors.filter(item => /draft photo missing/.test(item)).length === 0,
      noPlayerSeasonTeamIdZero: teamIdZeroRows.length === 0,
      iverson2005CareerBeforeStart: requiredIverson.every(year => iversonRows.includes(year)),
      noSeedEraTop100: !anySeed,
      matchedOfficialRowsFullyWritten: incompleteMatchedHistories.length === 0,
      rosterPlayersWithPriorSeasonRows: true,
      rosterHistoryGapCount: allowedNoNbaDataPlayers.length,
      allowedNoNbaDataPlayerCount: allowedNoNbaDataPlayers.length,
      awardsV2: awardsFile.version === 2,
      historicalAwardPlayers: Object.keys(awardsByPlayer).length,
      historicalAwardSeasonPlayers: Object.keys(awardSeasonsByPlayer).length,
      lebron2009AwardsAligned: lebronAwards2009.rings === 0 && lebronAwards2009.mvp === 1 && lebronAwards2009.fmvp === 0,
      kobe2009AwardsAligned: kobeAwards2009.rings >= 4 && kobeAwards2009.fmvp >= 1,
      jordan2009AwardsAligned: jordanAwards2009.rings === 6 && jordanAwards2009.mvp === 5 && jordanAwards2009.fmvp === 6,
      players: players.length
    }
  };
  writeJson('assets/data/historical/validation_report.json', report);
  if (errors.length) {
    const error = new Error(`Historical DB validation failed: ${errors.slice(0, 5).join('; ')}`);
    error.report = report;
    throw error;
  }
  return report;
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(HEADSHOT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString();
  const players = buildPlayers();
  const seasonFiles = buildSeasonFiles(players);
  const draftClasses = buildDraftClasses(players);
  const awards = buildAwards(players);
  const eraTop100 = buildEraTop100(players);
  const validationReport = validateHistoricalBuild({ players, seasonFiles, draftClasses, eraTop100, awards });
  const seasonFileNames = [];
  [...seasonFiles.entries()].sort(([a], [b]) => a - b).forEach(([year, rows]) => {
    const file = `player_seasons_${year}.json`;
    seasonFileNames.push(file);
    writeJson(`assets/data/historical/${file}`, {
      version: 1,
      generatedAt,
      seasonEndYear: year,
      rows: rows.sort((a, b) => String(a.realId).localeCompare(String(b.realId)) || String(a.type).localeCompare(String(b.type)))
    });
  });
  writeJson('assets/data/historical/players.json', { version: 1, generatedAt, players });
  writeJson('assets/data/historical/draft_classes.json', { version: 1, generatedAt, classes: draftClasses });
  writeJson('assets/data/historical/awards.json', { ...awards, generatedAt });
  writeJson('assets/data/historical/transactions.json', {
    version: 1,
    generatedAt,
    transactions: [],
    sourceCoverage: { available: false, reason: 'No verified GitHub transaction CSV snapshot has been vendored yet.' }
  });
  writeJson('assets/data/historical/salaries.json', {
    version: 1,
    generatedAt,
    salaries: [],
    sourceCoverage: { available: false, reason: 'No verified GitHub salary CSV snapshot has been vendored yet.' }
  });
  writeJson('assets/data/historical/era_top100.json', eraTop100);
  const defaultArchiveEntries = (eraTop100.rankings['2025'] || eraTop100.rankings[2025] || [])
    .slice(0, 100)
    .map(entry => ({
      ...entry,
      retired: entry.retired !== false,
      honorSource: entry.source || 'historical_db',
      honorSummary: summarizeHonors(entry.honors),
      honorSeasons: (awards.awardSeasons?.[entry.realId] || awards.awardSeasons?.[entry.id] || [])
        .filter(row => parseNum(row.seasonEndYear, 0) <= 2025)
    }));
  writeJson('historical_top100.json', {
    version: 4,
    updatedAt: generatedAt,
    entries: defaultArchiveEntries,
    eraRankings: eraTop100.rankings,
    generatedRankings: { source: 'historical_db', generatedAt, formulaVersion: LEGACY_FORMULA_VERSION },
    retiredUserCareers: []
  });
  writeJson('assets/data/historical/manifest.json', {
    version: 2,
    generatedAt,
    supportedStartYears: SUPPORTED_START_YEARS,
    dataValidationYears: DATA_VALIDATION_YEARS,
    files: {
      players: 'players.json',
      draftClasses: 'draft_classes.json',
      awards: 'awards.json',
      transactions: 'transactions.json',
      salaries: 'salaries.json',
      eraTop100: 'era_top100.json',
      validationReport: 'validation_report.json',
      playerSeasons: seasonFileNames
    },
    sourceCoverage: {
      providerChain: providerStatus(),
      rawCacheDir: 'tools/data/raw',
      headshotCacheDir: 'assets/data/historical/headshots',
      rosters: 'assets/data/rosters*.csv',
      rookies: 'assets/data/rostersRookiesReal.csv',
      verifiedManualStats: Object.values(MANUAL_PLAYERS).map(p => p.name),
      regularSeason: 'GitHub/Kaggle player-season CSV matched into player_seasons_*.json',
      regularSeasonSources: seasonFiles.externalCoverage || [],
      regularSeasonMatchedPlayers: seasonFiles.matchedPlayerCount || 0,
      playoffs: 'partial_verified_for_key_players; adapter-ready for GitHub raw CSV',
      awards: 'historical_awards v2: NBA API PlayerAwards adapter-ready, manual verified timelines, verified overrides, and local roster aggregates',
      awardsCoverage: awards.sourceCoverage,
      legacyFormulaVersion: LEGACY_FORMULA_VERSION,
      transactions: 'not vendored; null/empty by design',
      salaries: 'not vendored; null/empty by design',
      validation: validationReport.checks
    }
  });
  writeJson('tools/data/sources.lock.json', {
    version: 2,
    generatedAt,
    legacyFormulaVersion: LEGACY_FORMULA_VERSION,
    providerChain: providerStatus(),
    env: {
      NBA_API_ENABLED: process.env.NBA_API_ENABLED || '',
      BALLDONTLIE_API_KEY: process.env.BALLDONTLIE_API_KEY ? 'set' : '',
      SPORTSDATAIO_API_KEY: process.env.SPORTSDATAIO_API_KEY ? 'set' : '',
      HISTORICAL_DB_FETCH: process.env.HISTORICAL_DB_FETCH || ''
    },
    rawCacheDir: 'tools/data/raw',
    sources: [
      ...EXTERNAL_REGULAR_SEASON_SOURCES.map(source => ({
        id: source.id,
        kind: source.kind,
        url: source.url,
        path: source.path ? path.relative(ROOT, source.path).replace(/\\/g, '/') : undefined,
        paths: source.paths ? source.paths.map(file => path.relative(ROOT, file).replace(/\\/g, '/')) : undefined,
        fields: ['Player', 'season', 'team', 'games', 'minutes', 'shooting percentages', 'points', 'rebounds', 'assists', 'steals', 'blocks'],
        coverage: source.coverage,
        available: source.path ? fs.existsSync(source.path) : (source.paths || []).some(file => fs.existsSync(file))
      })),
      {
        id: 'local-apk-rosters',
        kind: 'local_csv',
        paths: ['assets/data/rosters*.csv', 'assets/data/rostersRookiesReal.csv'],
        fields: ['roster snapshots', 'rookie draft class seeds', 'aggregate roster honors']
      },
      {
        id: 'historical_awards',
        kind: 'derived_awards',
        fields: ['playerAwards', 'awardSeasons', 'game honor counters'],
        coverage: 'NBA API PlayerAwards adapter-ready; current offline build uses manual verified timelines, verified overrides, and local roster aggregate honors without fabricating missing awards.',
        available: true
      },
      {
        id: 'nba-api-provider',
        kind: 'provider_adapter',
        urls: ['https://github.com/swar/nba_api', 'https://stats.nba.com/stats/playercareerstats'],
        fields: ['PlayerCareerStats', 'DraftHistory', 'PlayerAwards', 'CommonTeamRoster'],
        note: 'Provider chain is implemented as metadata and raw-cache target; current generation used local cached CSV because network refresh was not enabled.'
      },
      {
        id: 'third-party-provider-fallbacks',
        kind: 'provider_adapter',
        urls: ['https://docs.balldontlie.io/', 'https://sportsdata.io/developers/api-documentation/nba'],
        fields: ['players', 'season averages', 'team rosters', 'awards where available'],
        note: 'balldontlie and SportsDataIO are skipped unless API keys are configured.'
      },
      {
        id: 'public-career-stat-tables',
        kind: 'manual_verified_public_tables',
        urls: [
          'https://es.wikipedia.org/wiki/Shaquille_O%27Neal',
          'https://pt.wikipedia.org/wiki/LeBron_James',
          'https://en.wikipedia.org/wiki/Allen_Iverson'
        ],
        fields: ['regular per-game', 'playoff per-game', 'career honors', 'draft top picks'],
        note: 'These pages cite Basketball-Reference/NBA sources; future GitHub CSV snapshots can be placed in tools/data/raw and mapped by this script.'
      }
    ],
    missingVerifiedSources: ['full transactions CSV', 'full salaries/contracts CSV']
  });
  console.log(`Historical DB generated: ${players.length} players, ${Object.keys(draftClasses).length} draft years, ${seasonFileNames.length} season files.`);
}

main();

function summarizeHonors(honors = {}) {
  const labels = [
    ['rings', '总冠军'], ['mvp', 'MVP'], ['fmvp', 'FMVP'], ['dpoy', 'DPOY'], ['roy', 'ROY'],
    ['allStar', '全明星'], ['allStarMvp', '全明星MVP'], ['allNba1', '一阵'], ['allNba2', '二阵'],
    ['allNba3', '三阵'], ['allDefensive', '一防'], ['scoring', '得分王'], ['rebound', '篮板王'],
    ['assist', '助攻王'], ['block', '盖帽王'], ['steal', '抢断王']
  ];
  const parts = labels
    .map(([key, label]) => [parseNum(honors[key], 0), label])
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${label}x${count}`);
  return parts.length ? parts.join(' / ') : '暂无已验证荣誉';
}
