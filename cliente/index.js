const params = new URLSearchParams(window.location.search);
const usuario = params.get('usuario') || 'Anónimo';

// Conectar al servidor de sockets
const socket = io();

// Elementos del DOM
const mensajesDiv = document.getElementById('mensajes');
const form = document.getElementById('formEnviar');
const input = document.getElementById('inputMensaje');

// Mostrar mensaje en la pantalla
function mostrarMensaje({ usuario, mensaje, timestamp }) {
  const div = document.createElement('div');
  div.classList.add('mensaje');
  div.innerHTML = `
    <span class="usuario">${usuario}:</span>
    <span class="texto">${mensaje}</span><br>
    <small>${new Date(timestamp).toLocaleString()}</small>
  `;
  mensajesDiv.appendChild(div);
  mensajesDiv.scrollTop = mensajesDiv.scrollHeight;
}

// Recibir historial al conectarse
socket.on('historial', (mensajes) => {
  mensajesDiv.innerHTML = '';
  mensajes.forEach(mostrarMensaje);
});

// Recibir nuevos mensajes
socket.on('nuevoMensaje', (msg) => {
  mostrarMensaje(msg);
});

// Enviar mensaje al servidor
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const mensaje = input.value.trim();
  if (!mensaje) return;
  socket.emit('enviarMensaje', { usuario, mensaje });
  input.value = '';
});
