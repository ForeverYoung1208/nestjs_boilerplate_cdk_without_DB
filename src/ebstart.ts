const isWorkerMode = process.env.MODE === 'WORKER';

if (isWorkerMode) {
  import('./worker').then(({ bootstrapWorker }) => {
    console.log(
      'Worker module loaded and started (see self-invoking function at worker.ts',
    );
  });
} else {
  import('./main').then(({ bootstrap }) => {
    console.log(
      'main (api) module loaded and started (see self-invoking function at main.ts',
    );
  });
}
