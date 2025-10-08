const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const admin = require('firebase-admin');
const cors = require('cors');
const path = require('path');

// Inicialización Firebase
const serviceAccount = require('./firebase-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// Express + Socket.io
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../cliente')));

// ------------ RUTAS BÁSICAS -------------- //

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../cliente/index.html'));
});

app.post('/establecer-usuario', (req, res) => {
  const { usuario } = req.body;
  if (!usuario || usuario.trim() === '') {
    return res.redirect('/?error=Por favor ingresa un nombre de usuario');
  }
  res.redirect(`/chat.html?usuario=${encodeURIComponent(usuario.trim())}`);
});

// ------------ SOCKET.IO LÓGICA ----------------- //
io.on('connection', async (socket) => {
  console.log('🔵 Nuevo cliente conectado:', socket.id);

  // Enviar los últimos mensajes al conectarse
  const snapshot = await db.collection('mensajes')
    .orderBy('historia', 'desc')
    .limit(50)
    .get();

  const mensajes = snapshot.docs.map(doc => ({
    usuario: doc.data().nombre,
    mensaje: doc.data().texto,
    timestamp: doc.data().historia ? doc.data().historia.toDate() : new Date()
  })).reverse();

  socket.emit('historial', mensajes);

  // Escuchar mensajes nuevos
  socket.on('enviarMensaje', async (data) => {
    const { usuario, mensaje } = data;    //prepara el mensaje
    if (!usuario || !mensaje) return;  //valida

    // Guardar en Firebase
    const msgData = {
      nombre: usuario,
      texto: mensaje,
      historia: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('mensajes').add(msgData);

    // Reenviar el mensaje a todos los clientes conectados
    io.emit('nuevoMensaje', {
      usuario,
      mensaje,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('🔴 Cliente desconectado:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
