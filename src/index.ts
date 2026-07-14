import { createApp } from './app';

const PORT = process.env.PORT ?? 3000;

createApp().then((app) => {
  app.listen(PORT, () => {
    console.log(`checkout-service listening on http://localhost:${PORT}`);
  });
});
