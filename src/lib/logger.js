// Logger minimal horodaté (aligné sur le style digitalarc-prospection)
const ts = () => new Date().toISOString().replace("T", " ").slice(0, 19);
export const log = {
  step: (m) => console.log(`\n[${ts()}] === ${m} ===`),
  info: (m) => console.log(`[${ts()}] [INFO] ${m}`),
  ok: (m) => console.log(`[${ts()}] [OK] ${m}`),
  warn: (m) => console.log(`[${ts()}] [WARN] ${m}`),
  error: (m) => console.error(`[${ts()}] [ERREUR] ${m}`),
};
