const DockerService = require('./code-execution-backend/src/services/dockerService');
const { getLanguageConfig } = require('./code-execution-backend/src/config/languages');

(async () => {
  const dockerService = new DockerService();
  const languageConfig = getLanguageConfig('c');
  const { sessionId, stream } = await dockerService.createInteractiveContainer(languageConfig);
  console.log('session', sessionId);

  stream.setEncoding('utf-8');
  stream.on('data', chunk => process.stdout.write(`[RAW] ${JSON.stringify(chunk)}\n`));

  dockerService.waitForContainer(sessionId).then(status => {
    console.log('[WAIT STATUS]', status);
    process.exit(0);
  }).catch(err => {
    console.error('[WAIT ERROR]', err);
    process.exit(1);
  });
})();
