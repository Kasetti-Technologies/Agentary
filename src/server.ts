   // src/server.ts
   import 'dotenv/config';
   import app from './app';

   const port = process.env.PORT || 4000;

   app.listen(port, () => {
     console.log(`[Agentary] API listening on port ${port}`);
   });
