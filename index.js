const express = require('express');

const app = express();
const PORT = process.env.PORT || 5555;

// Ruta para Server-Sent Events
app.post('/posts/:id/ask', (req, res) => {
    // Configurar las cabeceras para Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let count = 0;

    // Función para enviar eventos
    const sendEvent = (data) => {
        const message = `data: ${JSON.stringify(data)}\n\n`;
        res.write(message);
    };

    // Enviar eventos cada segundo
    const intervalId = setInterval(() => {
        count++;
        sendEvent({ message: `Evento número ${count}` });

        // Después de enviar 5 eventos, cierra la conexión
        if (count >= 5) {
            clearInterval(intervalId);
            sendEvent({ message: 'Fin de la transmisión' });
            res.end(); // Cierra la respuesta
        }
    }, 1000);

    // Manejo del cierre de la conexión
    req.on('close', () => {
        clearInterval(intervalId); // Detiene el intervalo si la conexión se cierra
        res.end(); // Asegúrate de cerrar la respuesta
    });
});

// Ruta adicional para otras respuestas
app.get('/another-route', (req, res) => {
    res.send('Esta es otra ruta');
});

// Manejo de rutas no encontradas
app.use((req, res) => {
    res.status(404).send('Ruta no encontrada');
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor SSE escuchando en http://localhost:${PORT}`);
});