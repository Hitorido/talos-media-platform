import { sourceText } from '../shared/sourceHttp.js';
import { createValirScansAdapter } from './core.js';
export const valirScansAdapter = createValirScansAdapter(sourceText);
