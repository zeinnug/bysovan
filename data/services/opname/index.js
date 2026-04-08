// data/services/opname/index.js
// Re-export semua symbol dari modul stockOpnameService
export * from './stockOpnameService';

// Juga sediakan default export (opsional) jika ada import default di tempat lain
import * as svc from './stockOpnameService';
export default svc;
