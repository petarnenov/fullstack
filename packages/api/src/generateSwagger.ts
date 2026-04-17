import fs from 'fs';
import path from 'path';
import { swaggerDocument } from './swagger';

const swaggerPath = path.join(__dirname, '..', 'swagger.json');

fs.writeFileSync(swaggerPath, JSON.stringify(swaggerDocument, null, 2));

console.log('✅ Swagger document generated at:', swaggerPath);
