// Compatibilidad con el comando anterior: inicia la aplicación completa.
const {createApplication}=require('./server.cjs');
const app=createApplication();
const port=Number(process.env.PORT||4178);
app.server.listen(port,'127.0.0.1',()=>console.log(`Áurea · http://127.0.0.1:${port}`));
process.on('SIGINT',()=>app.server.close(()=>{app.store.close();process.exit(0);}));
