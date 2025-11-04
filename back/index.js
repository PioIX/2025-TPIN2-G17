var express = require('express'); //Tipo de servidor: Express
var bodyParser = require('body-parser'); //Convierte los JSON
var cors = require('cors');
const session = require('express-session');             // Para el manejo de las variables de sesión
const path = require('path');
const { realizarQuery } = require('./modulos/mysql');
const { Console } = require('console');

var app = express(); //Inicializo express
const port = process.env.PORT || 4000;                              // Puerto por el que estoy ejecutando la página Web

// Asegurate de exponer la carpeta front para acceder a las imágenes
app.use(express.static(path.join(__dirname, './front'))); // o './front' si estás adentro del mismo nivel

// Convierte una petición recibida (POST-GET...) a objeto JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

//Pongo el servidor a escuchar
const server = app.listen(port, function () {
    console.log(`Server running in http://localhost:${port}
        `);
});

const io = require('socket.io')(server, {
    cors: {
        // IMPORTANTE: REVISAR PUERTO DEL FRONTEND
        origin: ["http://localhost:3000", "http://localhost:3001"], // Permitir el origen localhost:3000
        methods: ["GET", "POST", "PUT", "DELETE"],      // Métodos permitidos
        credentials: true                               // Habilitar el envío de cookies
    }
});



const sessionMiddleware = session({
    //Elegir tu propia key secreta
    secret: "supersarasa",
    resave: false,
    saveUninitialized: false
});

app.use(sessionMiddleware);

io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

/*
    A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
    A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
    A PARTIR DE ACÁ LOS EVENTOS DEL SOCKET
*/

let jugadores = {};

io.on("connection", (socket) => {
    const req = socket.request;

    socket.on('joinRoom', data => {
        console.log("🚀 ~ io.on ~ req.session.room:", data.room)
        if (req.session.room != undefined && req.session.room.length > 0)
            socket.leave(req.session.room);
        req.session.room = data.room;
        socket.join(data.room);

        io.to(req.session.room).emit('chat-messages', { user: req.session.user, room: data.room });

        socket.on("user_navigated_back", async ({ partida_id, jugador_id }) => {
            console.log(`🛑 Jugador ${jugador_id} abandonó la partida ${partida_id}`);

            try {
                // 🔹 Actualizar el estado de la partida en la base de datos
                await realizarQuery(`
            UPDATE Partidas 
            SET estado = 'finalizada' 
            WHERE id = ${partida_id}
        `);

                // 🔹 Avisar al otro jugador de la sala
                const room = req.session?.room;
                if (room) {
                    socket.to(room).emit("partida_finalizada", {
                        mensaje: "El oponente abandonó la partida.",
                    });
                }
            } catch (error) {
                console.error("❌ Error al finalizar la partida:", error);
            }
        });
        /*
        socket.on("user_navigated_back", async ({ partida_id, jugador_id }) => {
            console.log(`🛑 Jugador ${jugador_id} abandonó la partida ${partida_id}`);

            try {
                // Actualizar el estado en la BD
                await realizarQuery(`
                UPDATE Partidas 
                SET estado = 'finalizada' 
                WHERE id = ${partida_id}
            `);

                // Avisar al oponente
                const room = req.session?.room;
                if (room) {
                    socket.to(room).emit("partida_finalizada", {
                        mensaje: "El oponente abandonó la partida.",
                    });
                }
            } catch (error) {
                console.error("❌ Error al finalizar la partida:", error);
            }
        });
        */
    });


    socket.on('pingAll', data => {
        console.log("PING ALL: ", data);
        io.emit('pingAll', { event: "Ping to all", message: data });
    });
    /*
        socket.on('sendMessage', data => {
            io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
        });*/
    socket.on('sendMessage', ({ room, message }) => {
        console.log("📤 Mensaje recibido en back:", { room, message });
        io.to(room).emit('newMessage', { room, message });
    });




    socket.on("colorChange", ({ room, color }) => {
        console.log(`🎨 Cambio de color en ${room}: ${color}`);
        socket.to(room).emit("updateColor", { color });
    });


    socket.on("comenzarRonda", (roomId, personajes) => {
        const jugadoresEnSala = getJugadoresPorSala(roomId);

        if (!Array.isArray(personajes)) {
            console.error("Personajes no es un array:", personajes);
            return;
        }

        let cartasDisponibles = [...personajes];  // Los personajes vienen del frontend
        socket.to(room).emit("cartaAsignada", { color });
        jugadoresEnSala.forEach(jugador => {
            const cartaAleatoria = cartasDisponibles.splice(Math.floor(Math.random() * cartasDisponibles.length), 1)[0];
            io.to(jugador.id).emit("cartaAsignada", cartaAleatoria);  // Emitir la carta al jugador
            console.log("Carta asignada a", jugador.id, cartaAleatoria);
        });
    });

    socket.on("finalizarPartida", data => {
        console.log(data)
    })

    socket.on("disconnect", data => {
        console.log(data)
        io.to(req.session.room).emit("rendirse", { mensaje: "Se desconecto el rival" })
    })

});
//                SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
app.get('/', function (req, res) {
    res.status(200).send({
        message: 'GET Home route working fine!'
    });
});

function getJugadoresPorSala(roomId) {
    return jugadores[roomId] || [];
}

/**
 * req = request. en este objeto voy a tener todo lo que reciba del cliente
 * res = response. Voy a responderle al cliente
 */


//login

app.post('/login', async function (req, res) {
    console.log(req.body);
    try {
        const resultado = await realizarQuery(`
            SELECT * FROM Usuarios 
            WHERE nombre = '${req.body.nombre}' AND contraseña = '${req.body.contraseña}'
        `);
        if (resultado.length != 0) {
            if (resultado[0].es_admin === 0) {
                res.send({ ok: true, admin: false, id: resultado[0].ID })
            } else {
                res.send({ ok: true, admin: true, id: resultado[0].ID })
            }
        } else {
            res.send({ message: "Error, no se encontró ningun usuario" })
        }

    } catch (error) {
        res.send({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

//registro
app.post('/registro', async function (req, res) {
    try {
        console.log(req.body)
        vector = await realizarQuery(`SELECT * FROM Usuarios WHERE nombre='${req.body.nombre}'`)

        if (vector.length == 0) {
            realizarQuery(`
                INSERT INTO Usuarios (nombre, contraseña, mail, puntaje, es_admin) VALUES
                    ('${req.body.nombre}','${req.body.contraseña}','${req.body.mail}',0, 0);
            `)
            res.send({ res: "ok", agregado: true })
        } else {
            res.send({ res: "Ya existe ese dato", agregado: false })
        }
    } catch (e) {
        res.status(500).send({
            agregado: false,
            mensaje: "Error en el servidor",
            error: e.message
        });
    }
})

app.post("/chats", async function (req, res) {
    try {
        console.log(req.body)
        const resultado = await realizarQuery(`
            SELECT Chats.ID, Chats.nombre, Chats.foto, Chats.es_grupo
            FROM Chats
            INNER JOIN UsuariosPorChat ON UsuariosPorChat.id_chat = Chats.ID
            WHERE UsuariosPorChat.id_usuario = "${req.body.id_usuario}"
            AND Chats.nombre IS NOT NULL
            AND Chats.nombre != ""
            AND (Chats.es_grupo = 1 OR Chats.es_grupo = 0)

        `);
        res.send(resultado);
    } catch (error) {
        res.send({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

app.post("/traerUsuarios", async function (req, res) {
    try {
        console.log("BODY:", req.body);

        const resultado = await realizarQuery(`
            SELECT u.ID, u.nombre, upc.id_chat, u.foto_perfil
            FROM Usuarios u
            INNER JOIN UsuariosPorChat upc ON upc.id_usuario = u.ID
            WHERE upc.id_chat IN (
            SELECT id_chat
            FROM UsuariosPorChat
            WHERE id_usuario = ${req.body.id_usuario}
            )
            AND u.ID != ${req.body.id_usuario}
            AND (u.nombre != "" AND u.nombre IS NOT NULL)
        `);

        console.log("RESULTADO:", resultado);
        res.send(resultado);
    } catch (error) {
        console.error("ERROR traerUsuarios:", error.message);
        res.send({ ok: false, mensaje: "Error en el servidor", error: error.message });
    }
});

//JUEGO
app.get('/farandula', async (req, res) => {
    try {
        const personajes = await realizarQuery("SELECT * FROM Personajes WHERE categoria_id = 1");
        console.log("personajes:", personajes);
        if (!personajes || personajes.length === 0) {
            return res.json({ ok: false, mensaje: "No hay personajes" });
        }
        res.json({
            ok: true,
            personajes: personajes.map(personaje => ({
                id: personaje.ID,
                nombre: personaje.nombre,
                foto: personaje.foto,
                categoria_id: personaje.categoria_id
            }))
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

app.get('/famosos', async (req, res) => {
    try {
        const personajes = await realizarQuery("SELECT * FROM Personajes WHERE categoria_id = 2");
        console.log("personajes:", personajes);
        if (!personajes || personajes.length === 0) {
            return res.json({ ok: false, mensaje: "No hay personajes" });
        }
        res.json({
            ok: true,
            personajes: personajes.map(personaje => ({
                id: personaje.ID,
                nombre: personaje.nombre,
                foto: personaje.foto,
                categoria_id: personaje.categoria_id
            }))
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

app.get('/cantantes', async (req, res) => {
    try {
        const personajes = await realizarQuery("SELECT * FROM Personajes WHERE categoria_id = 3");
        console.log("personajes:", personajes);
        if (!personajes || personajes.length === 0) {
            return res.json({ ok: false, mensaje: "No hay personajes" });
        }
        res.json({
            ok: true,
            personajes: personajes.map(personaje => ({
                id: personaje.ID,
                nombre: personaje.nombre,
                foto: personaje.foto,
                categoria_id: personaje.categoria_id
            }))
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

app.get('/scaloneta', async (req, res) => {
    try {
        const personajes = await realizarQuery("SELECT * FROM Personajes WHERE categoria_id = 4");
        console.log("personajes:", personajes);
        if (!personajes || personajes.length === 0) {
            return res.json({ ok: false, mensaje: "No hay personajes" });
        }
        res.json({
            ok: true,
            personajes: personajes.map(personaje => ({
                id: personaje.ID,
                nombre: personaje.nombre,
                foto: personaje.foto,
                categoria_id: personaje.categoria_id
            }))
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});



app.get('/random', async (req, res) => {
    const { partida_id, jugador_id } = req.query;

    try {
        if (!partida_id || !jugador_id) {
            return res.json({ ok: false, mensaje: "Faltan parámetros" });
        }

        const [partida] = await realizarQuery(`
            SELECT * FROM Partidas WHERE ID = ${partida_id}
        `);

        if (!partida) {
            return res.json({ ok: false, mensaje: "Partida no encontrada" });
        }

        const esJugador1 = parseInt(jugador_id) === partida.jugador1_id;

        const miPersonajeId = esJugador1
            ? partida.personaje_jugador1_id
            : partida.personaje_jugador2_id;

        const [miPersonaje] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${miPersonajeId}
        `);

        if (!miPersonaje) {
            return res.json({ ok: false, mensaje: "No se encontró el personaje" });
        }

        res.json({
            ok: true,
            carta: [{
                id: miPersonaje.ID,
                nombre: miPersonaje.nombre,
                foto: miPersonaje.foto,
            }]
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

//agregar chats
app.post("/agregarChat", async function (req, res) {
    try {
        let chatId;

        if (req.body.es_grupo == 1) {
            const nombre = req.body.nombre ?? "Grupo sin nombre";
            // Insertar el grupo
            const resultado = await realizarQuery(`
        
                INSERT INTO Chats (es_grupo, foto, nombre, descripcion_grupo)
                VALUES (1, '${req.body.foto}', '${req.body.nombre}', '${req.body.descripcion_grupo}')
            `);

            chatId = resultado.insertId;

            // Insertar al creador del grupo
            await realizarQuery(`
        
            INSERT INTO UsuariosPorChat (id_chat, id_usuario)
            VALUES (${chatId}, ${req.body.id_usuario})
            `);

            // Insertar a los demás usuarios por mail
            for (const mail of req.body.mails) {
                const usuarios = await realizarQuery(`
          SELECT ID FROM Usuarios WHERE usuario_mail = '${mail}'
        `);
                if (usuarios.length > 0 && usuarios[0].ID != req.body.id_usuario) {
                    const userId = usuarios[0].ID;
                    await realizarQuery(`
            INSERT INTO UsuariosPorChat (id_chat, id_usuario)
            VALUES (${chatId}, ${userId})
          `);
                }
            }

            console.log(chatId)

        } else {
            // Insertar chat individual (campos vacíos salvo es_grupo = 0)
            const resultado = await realizarQuery(`
        INSERT INTO Chats (es_grupo, foto, nombre, descripcion_grupo)
        VALUES (0, NULL, NULL, NULL)
      `);
            chatId = resultado.insertId;

            // obtener id del otro usuario por mail
            const usuarios = await realizarQuery(`
        SELECT ID FROM Usuarios WHERE usuario_mail = '${req.body.mail}'
      `);
            const otroUsuarioId = usuarios[0].ID;

            // vincular usuarios al chat
            await realizarQuery(`
        INSERT INTO UsuariosPorChat (id_chat, id_usuario)
        VALUES (${chatId}, ${req.body.id_usuario}), (${chatId}, ${otroUsuarioId})
      `);
        }

        res.send({ ok: true, id_chat: chatId });
    } catch (error) {
        res.status(500).send({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message,
        });
    }
});

//traer contactos
app.post('/contacto', async (req, res) => {
    try {
        const contactos = await realizarQuery(`
            SELECT Chats.ID , Chats.nombre
            FROM Chats
            INNER JOIN UsuariosPorChat ON UsuariosPorChat.id_chat = Chats.ID
            WHERE UsuariosPorChat.id_usuario = "${req.body.id_usuario}"

        `);

        if (contactos.length === 0) {
            return res.send({ ok: false, mensaje: "No se encontró el contacto" });
        }
        const contacto = contactos[0];

        res.send({
            ok: true,
            contacto: {
                ID: contacto.ID,
                nombre: contacto.nombre,
            }
        });

    } catch (error) {
        res.status(500).send({
            ok: false,
            mensaje: "Error en el servido ASDRAAAAAAA",
            error: error.message,
        });
    }
});

//eliminar contactos
app.post('/eliminarContacto', async function (req, res) {
    try {
        const { id_chat, id_usuario } = req.body;

        await realizarQuery(
            `DELETE FROM UsuariosPorChat WHERE id_chat=${id_chat} AND id_usuario=${id_usuario}`
        );

        res.send({ ok: true, mensaje: "Contacto eliminado del chat" });
    } catch (error) {
        res.status(500).send({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

//subir mensajes a bbdd
app.post('/mensajes', async (req, res) => {
    try {
        console.log("Datos recibidos:", req.body);
        await realizarQuery(`
                INSERT INTO Mensajes (contenido, fecha_hora, id_usuario, id_chat) VALUES
            ("${req.body.contenido}","${req.body.fecha_hora}",${req.body.id_usuario},${req.body.id_chat});`
        );

        res.send({ res: "ok", agregado: true });
    } catch (e) {
        res.status(500).send({
            agregado: false,
            mensaje: "Error en el servidor",
            error: e.message
        });
    }
});


app.get('/infoUsuario', async (req, res) => {
    try {
        const userId = req.session.userId; // segun chat gpt esto toma el id del usuario q inicio sesion
        if (!userId) {
            return res.status(401).send({ ok: false, mensaje: "Usuario no logueado" });
        }

        const usuario = await realizarQuery(
            "SELECT ID, nombre FROM Usuarios WHERE ID = ? LIMIT 1",
            [userId]
        );

        if (usuario.length === 0) {
            return res.send({ ok: false, mensaje: "Usuario no encontrado" });
        }

        res.send({
            ok: true,
            usuario: usuario[0],
        });
    } catch (error) {
        res.status(500).send({ ok: false, mensaje: "Error en el servidor", error: error.message });
    }
});

app.post('/encontrarMensajesChat', async (req, res) => {
    const { chatSeleccionadoId } = req.body;
    console.log("Body recibido:", req.body);

    try {
        const respuesta = await realizarQuery(`
            SELECT Mensajes.id_chat, Mensajes.id_usuario, Mensajes.contenido, Mensajes.fecha_hora, Usuarios.nombre
            FROM Mensajes
            INNER JOIN Usuarios ON Usuarios.ID = Mensajes.id_usuario
            WHERE Mensajes.id_chat = "${chatSeleccionadoId}"
            ORDER BY Mensajes.fecha_hora ASC
        `);

        res.json({ ok: true, mensajes: respuesta });
    } catch (error) {
        console.error("Error al traer mensajes:", error);
        res.status(500).send({ ok: false, mensaje: "Error en el servidor", error: error.message });
    }
});


//PEDIDOS ADMIN

app.post('/agregarUsuario', async function (req, res) {
    console.log(req.body);

    try {
        const { nombre, contraseña, mail, es_admin } = req.body;

        // Verificar si ya existe el usuario
        const vector = await realizarQuery(`SELECT * FROM Usuarios WHERE nombre = "${nombre}"`);

        if (vector.length === 0) {
            await realizarQuery(`
                INSERT INTO Usuarios (nombre, contraseña, mail, puntaje, es_admin)
                VALUES ("${nombre}", "${contraseña}", "${mail}", 0, ${es_admin});
            `);
            res.send({ agregado: true });
        } else {
            res.send({ agregado: false, mensaje: "Ya existe ese usuario" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ agregado: false, error: "Error en el servidor" });
    }
});

/*
app.post('/cartarandom', async function (req, res) {
    console.log(req.body);

    try {
        const { nombre, contraseña, mail, es_admin } = req.body;

        // Verificar si ya existe el usuario
        const personajesJugador1 = await realizarQuery(`
                SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
            `);
        const personajesJugador2 = await realizarQuery(`
                SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
            `);

        if (vector.length === 0) {
            await realizarQuery(`
                INSERT INTO Usuarios (nombre, contraseña, mail, puntaje, es_admin)
                VALUES ("${nombre}", "${contraseña}", "${mail}", 0, ${es_admin});
            `);
            res.send({ agregado: true });

            io.to(jugador1_id.toString()).emit("mostrarCarta", { carta: personajesJugador1[0] });
            io.to(jugador2_id.toString()).emit("mostrarCarta", { carta: personajesJugador2[0] });

        } else {
            res.send({ agregado: false, mensaje: "Ya existe ese usuario" });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ agregado: false, error: "Error en el servidor" });
    }
});
*/

//BORRAR USUARIO
app.delete('/borrarUsuario', async function (req, res) {
    try {
        const ID = req.body.ID;

        const vector = await realizarQuery(`SELECT * FROM Usuarios WHERE ID='${ID}'`);

        if (vector.length > 0) {
            await realizarQuery(`DELETE FROM Usuarios WHERE ID='${ID}'`);
            res.send({ borrado: true, mensaje: "Usuario eliminado correctamente" });
        } else {
            res.send({ borrado: false, mensaje: "Usuario no encontrado" });
        }

    } catch (error) {
        res.status(500).send({
            borrado: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});

//Crear partida

app.post('/crearPartida', async (req, res) => {
    const { categoria_id, jugador1_id } = req.body;

    // Verifica si el cuerpo de la solicitud contiene datos
    console.log('Cuerpo de la solicitud:', req.body); // Verifica que el cuerpo esté llegando correctamente

    try {
        // Verifica si los datos necesarios están presentes
        if (!categoria_id || !jugador1_id) {
            console.error('Faltan datos necesarios en la solicitud');
            return res.status(400).send({ ok: false, mensaje: 'Faltan datos en la solicitud' });
        }

        const oponente = await realizarQuery(`
            SELECT * FROM Usuarios WHERE esperando_categoria = ${categoria_id} AND ID != ${jugador1_id} LIMIT 1
        `);

        const categoria = await realizarQuery(`
            SELECT nombre FROM Categorias WHERE ID = ${categoria_id}
        `);

        if (categoria.length === 0) {
            return res.status(404).send({ ok: false, mensaje: "Categoría no encontrada" });
        }

        const nombreCategoria = categoria[0].nombre;

        if (oponente.length > 0) {
            const jugador2_id = oponente[0].ID;

            const personajesJugador1 = await realizarQuery(`
        SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
    `);
            const personajesJugador2 = await realizarQuery(`
        SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
    `);

            const personajeJugador1_id = personajesJugador1[0].ID;
            const personajeJugador2_id = personajesJugador2[0].ID;

            // 👇 CAPTURAR EL RESULTADO DEL INSERT
            const resultadoInsert = await realizarQuery(`
        INSERT INTO Partidas (jugador1_id, jugador2_id, personaje_jugador1_id, personaje_jugador2_id, estado)
        VALUES (${jugador1_id}, ${jugador2_id}, ${personajeJugador1_id}, ${personajeJugador2_id}, 'en curso')
    `);

            // 👇 EXTRAER EL ID DEL INSERT
            const partida_id = resultadoInsert.insertId;

            console.log("✅ Partida creada con ID:", partida_id);

            await realizarQuery(`
        UPDATE Usuarios SET esperando_categoria = NULL WHERE ID IN (${jugador1_id}, ${jugador2_id})
    `);

            io.emit("partidaCreada", {
                ok: true,
                mensaje: "Partida creada con éxito",
                nombreCategoria,
                userHost: jugador1_id,
                partida_id: partida_id, // 👈 Ahora es un número
            });

            return res.send({
                ok: true,
                mensaje: "Partida creada con éxito",
                nombreCategoria,
                partida_id: partida_id // 👈 También en la respuesta HTTP
            });

        } else {
            await realizarQuery(`
                UPDATE Usuarios SET esperando_categoria = ${categoria_id} WHERE ID = ${jugador1_id}
            `);

            io.emit("partidaCreada", {
                ok: true,
                mensaje: "Esperando oponente...",
                esperando: true,
                userHost: jugador1_id,
                nombreCategoria,
                partida_id,
            });

            return res.send({ ok: true, mensaje: "Esperando oponente...", esperando: true, nombreCategoria });
        }

    } catch (err) {
        console.error('Error en backend:', err);  // Asegúrate de capturar el error completo
        return res.status(500).send({ ok: false, mensaje: "Error al crear partida", error: err.message });
    }
});


//arriesgar personaje

app.post("/arriesgar", async (req, res) => {
    const { id_partida, id_jugador, nombre_arriesgado } = req.body;

    try {
        const [partida] = await realizarQuery(`SELECT * FROM Partidas WHERE ID = ${id_partida}`);
        if (!partida) return res.send({ ok: false, mensaje: "Partida no encontrada" });

        const esJugador1 = id_jugador === partida.jugador1_id;
        const personajeOponenteId = esJugador1
            ? partida.personaje_jugador2_id
            : partida.personaje_jugador1_id;


        const id_oponente = esJugador1 ? partida.jugador2_id : partida.jugador1_id;

        const [personajeOponente] = await realizarQuery(`SELECT * FROM Personajes WHERE ID = ${personajeOponenteId}`);
        if (!personajeOponente) return res.send({ ok: false, mensaje: "No se encontró el personaje del oponente" });

        if (nombre_arriesgado.trim().toLowerCase() === personajeOponente.nombre.trim().toLowerCase()) {

            await realizarQuery(`
                UPDATE Partidas
                SET ganador_id = ${id_jugador}, estado = 'finalizada'
                WHERE ID = ${id_partida};
            `);

            io.emit("partidaFinalizada", {
                id_partida,
                ganador_id: id_jugador,
                perdedor_id: id_oponente,
                personajeCorrecto: personajeOponente.nombre,
                mensaje: "¡La partida ha finalizado!"
            });

            return res.send({
                ok: true,
                gano: true,
                personajeCorrecto: personajeOponente.nombre,
                id_partida,
                id_jugador
            });
        } else {
            const ganador = esJugador1 ? partida.jugador2_id : partida.jugador1_id;
            await realizarQuery(`
                UPDATE Partidas
                SET ganador_id = ${ganador}, estado = 'finalizada'
                WHERE ID = ${id_partida};
            `);

            io.emit("partidaFinalizada", {
                id_partida,
                ganador_id: ganador,
                perdedor_id: id_jugador,
                personajeCorrecto: personajeOponente.nombre,
                mensaje: "¡La partida ha finalizado!"
            });

            return res.send({
                ok: true,
                gano: false,
                personajeCorrecto: personajeOponente.nombre,
                id_partida,
                id_jugador
            });
        }

    } catch (err) {
        console.error(err);
        res.status(500).send({ ok: false, mensaje: "Error en el servidor" });
    }
});
