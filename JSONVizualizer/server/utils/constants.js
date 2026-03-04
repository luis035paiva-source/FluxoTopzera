const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const PROCESSED_IMAGES_DIR = path.join(DATA_DIR, 'images_processed');
const OPENAI_LOGS_DIR = path.join(DATA_DIR, 'logs', 'openai');
const PICWISH_LOGS_DIR = path.join(DATA_DIR, 'logs', 'picwish');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const TEMPLATE_CATALOG_FILE = path.join(DATA_DIR, 'templates.json');
const PHOTOSHOP_OUTPUT_DIR = 'C:/PythonPhotoshop/output';
const DOWNLOADS_DIR = 'C:/PythonPhotoshop/downloads';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const CATEGORIES = [
  'Bovinos',
  'Suínos',
  'Aves',
  'Miúdos & vísceras',
  'Embutidos frescos & preparados',
  'Frios & defumados',
  'Complementos',
  'Peixes',
];

const TEMPLATE_CATEGORIES = [
  'Ano Novo (Réveillon)',
  'Férias',
  'Carnaval',
  'Quaresma',
  'Semana Santa',
  'Páscoa',
  'Dia das Mães',
  'Dia dos Namorados',
  'Festas Juninas (São João / São Pedro)',
  'Inverno',
  'Dia dos Pais',
  'Independência do Brasil',
  'Primavera',
  'Dia das Crianças',
  'Outubro Rosa',
  'Novembro Azul',
  'Black Friday',
  'Verão',
  'Natal',
  'Jogos da Seleção Brasileira',
  'Copa do Mundo',
  'Copa América',
  'Final de Campeonato Brasileiro',
  'Libertadores',
];

module.exports = {
  ROOT_DIR,
  DATA_DIR,
  IMAGES_DIR,
  PROCESSED_IMAGES_DIR,
  OPENAI_LOGS_DIR,
  PICWISH_LOGS_DIR,
  CATALOG_FILE,
  TEMPLATE_CATALOG_FILE,
  PHOTOSHOP_OUTPUT_DIR,
  DOWNLOADS_DIR,
  MAX_FILE_SIZE,
  CATEGORIES,
  TEMPLATE_CATEGORIES,
};
