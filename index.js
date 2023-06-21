console.log("carga");
const http = require('http');
const WebSocketServer = require('websocket').server;
const mongoose = require('mongoose');
// Configurar la conexión a MongoDB Atlas
mongoose.connect('mongodb+srv://root:admin@cluster0.q50lynh.mongodb.net/SistemasDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
// Definir el esquema de la colección
const datosSchema = new mongoose.Schema({
    "Relative Humidity": mongoose.Schema.Types.Mixed,
    "Temperature - SHT (C°)": mongoose.Schema.Types.Mixed
}, { collection: 'sistemas' });
// Crear el modelo de la colección
const Dato = mongoose.model('Dato', datosSchema);

// Crea un servidor HTTP básico
const server = http.createServer((req, res) => {
  // Aquí puedes manejar las solicitudes HTTP si es necesario
});

// Asocia el servidor WebSocket al servidor HTTP
const wsServer = new WebSocketServer({
  httpServer: server,
});

// Función para enviar un mensaje a todos los clientes conectados
function sendUpdateToClients(message) {
  wsServer.connections.forEach(connection => {
    connection.sendUTF(message);
  });
}




// Función para leer un valor aleatorio de la colección
function leerValorAleatorio(Dato){
    return new Promise((resolve, reject) => {
        respuesta = {}
        const fechaActual = new Date();
        const dia = fechaActual.getDate();
        const mes = fechaActual.getMonth() + 1; // Los meses comienzan en 0, por lo que se suma 1
        const anio = fechaActual.getFullYear();
        const hora = fechaActual.getHours();
        const minutos = fechaActual.getMinutes();
        const segundos = fechaActual.getSeconds();
        respuesta.tiempo = `${dia}/${mes}/${anio} ${hora}:${minutos}:${segundos}`;
        respuesta.temperatura = 10;
        respuesta.humedad = 10;
    
        Dato.countDocuments()
          .then(count => {
            const randomIndex = Math.floor(Math.random() * count);
            return Dato.findOne().skip(randomIndex).exec();
          })
          .then(resultado => {
            respuesta.temperatura = resultado["Temperature - SHT (C°)"] ?? 0;
            respuesta.humedad = resultado["Relative Humidity"] ?? 0;
            resolve(respuesta);
          })
          .catch(error => {
            console.error('Error al obtener el registro aleatorio:', error);
            reject(new Error("ocurrió un error"));
          })
    });
}





// Establece un intervalo para enviar un mensaje cada 2 minutos
setInterval(async () => {
    try{
        const message = await leerValorAleatorio(Dato);
        sendUpdateToClients(JSON.stringify(message));
    }catch(error){
        console.error("error await" + error);
    }
}, 2 * 60 * 1000); // 2 minutos en milisegundos

// Maneja las solicitudes de conexión al servidor WebSocket
wsServer.on('request', async request => {
  const connection = request.accept(null, request.origin);
  // Maneja los mensajes entrantes del cliente
  connection.on('message', message => {
    console.log(`Mensaje recibido del cliente: ${message.utf8Data}`);
  });

  // Envia un mensaje inicial cuando un cliente se conecta
  try{
    const message = await leerValorAleatorio(Dato);
    sendUpdateToClients(JSON.stringify(message));
    connection.sendUTF('¡Conexión establecida!');
  }catch(e){

  }

  // Maneja el cierre de conexión del cliente
  connection.on('close', () => {
    console.log('Conexión cerrada');
  });
});

// Inicia el servidor HTTP en el puerto 3000
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`Servidor WebSocket escuchando en el puerto ${PORT}`);
});