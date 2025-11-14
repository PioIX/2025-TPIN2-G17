var express = require("express"); //Tipo de servidor: Express
var bodyParser = require("body-parser"); //Convierte los JSON
var cors = require("cors");
const session = require("express-session"); // Para el manejo de las variables de sesión
const path = require("path");
const { realizarQuery } = require("./modulos/mysql");
const { Console } = require("console");

var app = express(); //Inicializo express
const port = process.env.PORT || 4000; // Puerto por el que estoy ejecutando la página Web

// Asegurate de exponer la carpeta front para acceder a las imágenes
app.use(express.static(path.join(__dirname, "./front"))); // o './front' si estás adentro del mismo nivel

// Convierte una petición recibida (POST-GET...) a objeto JSON
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cors());

//Pongo el servidor a escuchar
const server = app.listen(port, function () {
  console.log(`Server running in http://10.1.5.103:${port}
        `);
});

const io = require("socket.io")(server, {
  cors: {
    // IMPORTANTE: REVISAR PUERTO DEL FRONTEND
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://10.1.4.162:3000",
      "http://10.1.5.162:3000",
      "http://10.1.5.91:3000",
      "http://10.1.5.140:3000",
      "http://10.1.5.93:3000",
      "http://192.168.56.1:3000",
      "http://10.1.4.88:3000",
      "http://10.1.4.147:3000",
      "http://192.168.0.82:3000",
      "http://10.1.5.103:3000",
    ],

    methods: ["GET", "POST", "PUT", "DELETE"], // Métodos permitidos
    credentials: true, // Habilitar el envío de cookies
  },
});

const sessionMiddleware = session({
  //Elegir tu propia key secreta
  secret: "supersarasa",
  resave: false,
  saveUninitialized: false,
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
let timers = {};
let turnos = {};

io.on("connection", (socket) => {
  const req = socket.request;
  socket.on("joinRoom", (data) => {
    console.log("🚀 ~ io.on ~ req.session.room:", data.room);
    if (req.session.room != undefined && req.session.room.length > 0)
      socket.leave(req.session.room);
    req.session.room = data.room;
    socket.join(data.room);
    io.to(req.session.room).emit("chat-messages", {
      user: req.session.user,
      room: data.room,
    });

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
  });

  socket.on("pingAll", (data) => {
    console.log("PING ALL: ", data);
    io.emit("pingAll", { event: "Ping to all", message: data });
  });
  /*
        socket.on('sendMessage', data => {
            io.to(req.session.room).emit('newMessage', { room: req.session.room, message: data });
        });*/
  socket.on("sendMessage", ({ room, message }) => {
    console.log("📤 Mensaje recibido en back:", { room, message });
    io.to(room).emit("newMessage", { room, message });
  });

  socket.on("disconnect", () => {
    console.log("Disconnect");
  });

  socket.on("colorChange", ({ room, color }) => {
    console.log(`🎨 Cambio de color en ${room}: ${color}`);
    socket.to(room).emit("updateColor", { color });
  });

  socket.on("reiniciarTemporizador", (data) => {
    const { room } = data; // Recibe la sala
    reiniciarTemporizador(room); // Llama a la función de reiniciar temporizador
  });

  socket.on("iniciarTurno", ({ room, turnoInicial }) => {
    turnos[room] = turnoInicial;
    reiniciarTemporizador(room);
  });

  socket.on("finalizarPartida", (data) => {
    console.log(data);
  });

  socket.on("disconnect", (data) => {
    console.log(data);
    io.to(req.session.room).emit("rendirse", {
      mensaje: "Se desconecto el rival",
    });
  });

  socket.on("turnoCambio", ({ room, nuevoTurno }) => {
    turnos[room] = nuevoTurno;
    io.to(room).emit("cambiarTurno", { room, nuevoTurno });
    console.log(`🔄 Cambio de turno en ${room}: ${nuevoTurno}`);
    reiniciarTemporizador(room);
    const colorFondo =
      nuevoTurno === "jugador1" ? "turno-jugador1" : "turno-jugador2";
    io.to(room).emit("cambiarFondo", { colorFondo });
  });

  socket.on("idJugadores", ({ room, id, idRival }) => {
    console.log({ room, id, idRival });
    io.to(room).emit("idRival", { id: id, idRival: idRival });
  });

  socket.on("salirDePartida", (room) => {
    socket.to(room).emit("jugadorSalio", {
      mensaje: "El otro jugador ha salido de la partida.",
    });
  });

  socket.on("necesitoId", (room) => {
    socket
      .to(room)
      .emit("pedirId", { mensaje: "El otro jugador necesita el id." });
  });
});
//                SELECT * FROM Personajes WHERE categoria_id = ${categoria_id} ORDER BY RAND() LIMIT 1
app.get("/", function (req, res) {
  res.status(200).send({
    message: "GET Home route working fine!",
  });
});

function getJugadoresPorSala(roomId) {
  return jugadores[roomId] || [];
}

/**
 * req = request. en este objeto voy a tener todo lo que reciba del cliente
 * res = response. Voy a responderle al cliente
 */

//timer
function reiniciarTemporizador(room) {
  timers[room] = 60; // Reinicia el temporizador a 60 segundos
  console.log("Reiniciar");
  io.to(room).emit("actualizarTemporizador", { timer: timers[room] }); // Emitir el temporizador actualizado
}

setInterval(() => {
  for (let room in timers) {
    if (timers[room] > 0) {
      timers[room]--;
      io.to(room).emit("actualizarTemporizador", { timer: timers[room] });
    } else {
      // Calcular nuevo turno automáticamente
      const turnoActual = turnos[room];
      const nuevoTurno = turnoActual === "jugador1" ? "jugador2" : "jugador1";

      // Emitir el evento que ya existe
      io.to(room).emit("cambiarTurno", { room, nuevoTurno });

      // Reiniciar timer y guardar el nuevo turno
      turnos[room] = nuevoTurno;
      reiniciarTemporizador(room);
    }
  }
}, 1000);

//login
app.post("/login", async function (req, res) {
  console.log(req.body);
  try {
    const resultado = await realizarQuery(`
            SELECT * FROM Usuarios
            WHERE nombre = '${req.body.nombre}' AND contraseña = '${req.body.contraseña}'
        `);
    if (resultado.length != 0) {
      if (resultado[0].es_admin === 0) {
        res.send({ ok: true, admin: false, id: resultado[0].ID });
      } else {
        res.send({ ok: true, admin: true, id: resultado[0].ID });
      }
    } else {
      res.send({ message: "Error, Usuario o contraseña incorrectos" });
    }
  } catch (error) {
    res.send({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

//registro
app.post("/registro", async function (req, res) {
  try {
    console.log(req.body);
    vector = await realizarQuery(
      `SELECT * FROM Usuarios WHERE nombre='${req.body.nombre}'`
    );

    if (vector.length == 0) {
      realizarQuery(`
                INSERT INTO Usuarios (nombre, contraseña, mail, puntaje, es_admin) VALUES
                    ('${req.body.nombre}','${req.body.contraseña}','${req.body.mail}',0, 0);
            `);
      res.send({ res: "ok", agregado: true });
    } else {
      res.send({ res: "Ya existe ese dato", agregado: false });
    }
  } catch (e) {
    res.status(500).send({
      agregado: false,
      mensaje: "Error en el servidor",
      error: e.message,
    });
  }
});

//JUEGO
app.get("/farandula", async (req, res) => {
  try {
    const personajes = await realizarQuery(
      "SELECT * FROM Personajes WHERE categoria_id = 1"
    );
    //console.log("personajes:", personajes);
    if (!personajes || personajes.length === 0) {
      return res.json({ ok: false, mensaje: "No hay personajes" });
    }
    res.json({
      ok: true,
      personajes: personajes.map((personaje) => ({
        id: personaje.ID,
        nombre: personaje.nombre,
        foto: personaje.foto,
        categoria_id: personaje.categoria_id,
      })),
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

app.get("/famosos", async (req, res) => {
  try {
    const personajes = await realizarQuery(
      "SELECT * FROM Personajes WHERE categoria_id = 2"
    );
    console.log("personajes:", personajes);
    if (!personajes || personajes.length === 0) {
      return res.json({ ok: false, mensaje: "No hay personajes" });
    }
    res.json({
      ok: true,
      personajes: personajes.map((personaje) => ({
        id: personaje.ID,
        nombre: personaje.nombre,
        foto: personaje.foto,
        categoria_id: personaje.categoria_id,
      })),
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

app.get("/cantantes", async (req, res) => {
  try {
    const personajes = await realizarQuery(
      "SELECT * FROM Personajes WHERE categoria_id = 3"
    );
    console.log("personajes:", personajes);
    if (!personajes || personajes.length === 0) {
      return res.json({ ok: false, mensaje: "No hay personajes" });
    }
    res.json({
      ok: true,
      personajes: personajes.map((personaje) => ({
        id: personaje.ID,
        nombre: personaje.nombre,
        foto: personaje.foto,
        categoria_id: personaje.categoria_id,
      })),
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

app.get("/scaloneta", async (req, res) => {
  try {
    const personajes = await realizarQuery(
      "SELECT * FROM Personajes WHERE categoria_id = 4"
    );
    console.log("personajes:", personajes);
    if (!personajes || personajes.length === 0) {
      return res.json({ ok: false, mensaje: "No hay personajes" });
    }
    res.json({
      ok: true,
      personajes: personajes.map((personaje) => ({
        id: personaje.ID,
        nombre: personaje.nombre,
        foto: personaje.foto,
        categoria_id: personaje.categoria_id,
      })),
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

app.get("/profesores", async (req, res) => {
  try {
    const personajes = await realizarQuery(
      "SELECT * FROM Personajes WHERE categoria_id = 5"
    );
    console.log("personajes:", personajes);
    if (!personajes || personajes.length === 0) {
      return res.json({ ok: false, mensaje: "No hay personajes" });
    }
    res.json({
      ok: true,
      personajes: personajes.map((personaje) => ({
        id: personaje.ID,
        nombre: personaje.nombre,
        foto: personaje.foto,
        categoria_id: personaje.categoria_id,
      })),
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

/*
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

        // Determina si el jugador es el jugador1 o el jugador2
        const esJugador1 = parseInt(jugador_id) === partida.jugador1_id;

        // Obtener la carta del jugador
        const miPersonajeId = esJugador1
            ? partida.personaje_jugador1_id
            : partida.personaje_jugador2_id;

        const [miPersonaje] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${miPersonajeId}
        `);

        if (!miPersonaje) {
            return res.json({ ok: false, mensaje: "No se encontró el personaje" });
        }

        // Obtener la carta del oponente
        const oponentePersonajeId = esJugador1
            ? partida.personaje_jugador2_id
            : partida.personaje_jugador1_id;

        const [oponentePersonaje] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${oponentePersonajeId}
        `);

        res.json({
            ok: true,
            carta: [{
                id: miPersonaje.ID,
                nombre: miPersonaje.nombre,
                foto: miPersonaje.foto,
            }],
            carta2: [{
                id: oponentePersonaje.ID,
                nombre: oponentePersonaje.nombre,
                foto: oponentePersonaje.foto,
            }],
        });

    } catch (error) {
        console.error("Error en la consulta:", error);
        res.status(500).json({
            ok: false,
            mensaje: "Error en el servidor",
            error: error.message
        });
    }
});*/

app.get("/random", async (req, res) => {
  const { partida_id, jugador_id } = req.query;

  try {
    if (!partida_id || !jugador_id) {
      return res.json({ ok: false, mensaje: "Faltan parámetros" });
    }
    const query = `
            SELECT * FROM Partidas WHERE ID = ${partida_id}
        `
    console.log("Query de random: ", query, " valor de id_partida ", partida_id)
    const [partida] = await realizarQuery(query);

    if (!partida) {
      return res.json({ ok: false, mensaje: "Partida no encontrada" });
    }

    // Determina si el jugador es 1 o 2 por la base
    const esJugador1 = Number(jugador_id) === partida.jugador1_id;

    const miIdPersonaje = esJugador1
      ? partida.personaje_jugador1_id
      : partida.personaje_jugador2_id;

    const oponenteIdPersonaje = esJugador1
      ? partida.personaje_jugador2_id
      : partida.personaje_jugador1_id;

    const [miCarta] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${miIdPersonaje}
        `);

    const [cartaOponente] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${oponenteIdPersonaje}
        `);

    return res.json({
      ok: true,
      carta: [
        {
          id: miCarta.ID,
          nombre: miCarta.nombre,
          foto: miCarta.foto,
        },
      ],
      carta2: [
        {
          id: cartaOponente.ID,
          nombre: cartaOponente.nombre,
          foto: cartaOponente.foto,
        },
      ],
    });
  } catch (error) {
    console.error("Error en la consulta:", error);
    return res.status(500).json({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

app.get("/infoUsuario", async (req, res) => {
  try {
    const userId = req.session.userId; // segun chat gpt esto toma el id del usuario q inicio sesion
    if (!userId) {
      return res
        .status(401)
        .send({ ok: false, mensaje: "Usuario no logueado" });
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
    res.status(500).send({
      ok: false,
      mensaje: "Error en el servidor",
      error: error.message,
    });
  }
});

//PEDIDOS ADMIN

app.post("/agregarUsuario", async function (req, res) {
  console.log(req.body);

  try {
    const { nombre, contraseña, mail, es_admin } = req.body;

    // Verificar si ya existe el usuario
    const vector = await realizarQuery(
      `SELECT * FROM Usuarios WHERE nombre = "${nombre}"`
    );

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
app.delete("/borrarUsuario", async function (req, res) {
  try {
    const ID = req.body.ID;

    const vector = await realizarQuery(
      `SELECT * FROM Usuarios WHERE ID='${ID}'`
    );

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
      error: error.message,
    });
  }
});

//Crear partida

app.post("/crearPartida", async (req, res) => {
  const { categoria_id, jugador1_id } = req.body;

  // Verifica si el cuerpo de la solicitud contiene datos
  console.log("Cuerpo de la solicitud:", req.body); // Verifica que el cuerpo esté llegando correctamente

  try {
    // Verifica si los datos necesarios están presentes
    if (!categoria_id || !jugador1_id) {
      console.error("Faltan datos necesarios en la solicitud");
      return res
        .status(400)
        .send({ ok: false, mensaje: "Faltan datos en la solicitud" });
    }

    const oponente = await realizarQuery(`
            SELECT * FROM Usuarios WHERE esperando_categoria = ${categoria_id} AND ID != ${jugador1_id} LIMIT 1
        `);

    const categoria = await realizarQuery(`
            SELECT nombre FROM Categorias WHERE ID = ${categoria_id}
        `);

    if (categoria.length === 0) {
      return res
        .status(404)
        .send({ ok: false, mensaje: "Categoría no encontrada" });
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

      console.log("emit partidaCreada");

      io.emit("partidaCreada", {
        ok: true,
        esperando: false,
        mensaje: "Partida creada con éxito",
        userHost: Number(jugador1_id),
        jugadores: [Number(jugador1_id), Number(jugador2_id)],
        partida_id,
        nombreCategoria,
      });

      return res.send({
        ok: true,
        msg: "Partida creada con éxito",
        nombreCategoria,
        id_partida: partida_id,
        userHost: jugador1_id,
      });
    } else {
      await realizarQuery(`
                UPDATE Usuarios SET esperando_categoria = ${categoria_id} WHERE ID = ${jugador1_id}
            `);

      io.emit("partidaCreada", {
        ok: true,
        esperando: true,
        userHost: Number(jugador1_id),
        jugadores: [Number(jugador1_id)], // 👈 ACÁ AGREGAMOS ESTO!
        partida_id: null,
        nombreCategoria,
      });

      return res.send({
        ok: true,
        msg: "Esperando oponente...",
        esperando: true,
        nombreCategoria /*partida_id*/,
      });
    }
  } catch (err) {
    console.error("Error en backend:", err); // Asegúrate de capturar el error completo
    return res.status(500).send({
      ok: false,
      mensaje: "Error al crear partida",
      error: err.message,
    });
  }
});

//arriesgar personaje
app.post("/arriesgar", async (req, res) => {
  let { id_partida, id_jugador, nombre_arriesgado } = req.body;

  try {
    id_partida = Number(id_partida);
    id_jugador = Number(id_jugador);

    if (!id_partida || !id_jugador) {
      return res.send({ ok: false, mensaje: "Datos inválidos" });
    }

    // Traer la partida
    const [partida] = await realizarQuery(`
            SELECT * FROM Partidas WHERE ID = ${id_partida}
        `);

    if (!partida) {
      return res.send({ ok: false, mensaje: "Partida no encontrada" });
    }

    const jugador1 = Number(partida.jugador1_id);
    const jugador2 = Number(partida.jugador2_id);

    const esJugador1 = id_jugador === jugador1;

    // 🔥 Oponente SIEMPRE ES EL OTRO
    const id_oponente = esJugador1 ? jugador2 : jugador1;

    // 🔥 Ahora sí, personaje del oponente (NO EL TUYO)
    const personajeOponenteId = esJugador1
      ? Number(partida.personaje_jugador2_id)
      : Number(partida.personaje_jugador1_id);

    const [personajeOponente] = await realizarQuery(`
            SELECT * FROM Personajes WHERE ID = ${personajeOponenteId}
        `);

    if (!personajeOponente) {
      return res.send({
        ok: false,
        mensaje: "No se encontró el personaje del oponente",
      });
    }

    // Normalizamos para comparar
    const guess = nombre_arriesgado.trim().toLowerCase();
    const correcto = personajeOponente.nombre.trim().toLowerCase();

    const acierto = guess === correcto;

    // 🔥 SI ACERTÓ, GANA EL JUGADOR QUE ARRIESGÓ
    if (acierto) {
      await realizarQuery(`
                UPDATE Partidas
                SET ganador_id = ${id_jugador}, estado = 'finalizada'
                WHERE ID = ${id_partida}
            `);

      io.emit("partidaFinalizada", {
        id_partida,
        ganador_id: id_jugador,
        perdedor_id: id_oponente,
        personajeCorrecto: personajeOponente.nombre,
        mensaje: "¡La partida ha finalizado!",
      });

      return res.send({
        ok: true,
        gano: true,
        personajeCorrecto: personajeOponente.nombre,
        id_partida,
        id_jugador,
      });
    }

    // ❌ SI FALLÓ, GANA EL OPONENTE
    await realizarQuery(`
            UPDATE Partidas
            SET ganador_id = ${id_oponente}, estado = 'finalizada'
            WHERE ID = ${id_partida}
        `);

    io.emit("partidaFinalizada", {
      id_partida,
      ganador_id: id_oponente,
      perdedor_id: id_jugador,
      personajeCorrecto: personajeOponente.nombre,
      mensaje: "¡La partida ha finalizado!",
    });

    return res.send({
      ok: true,
      gano: false,
      personajeCorrecto: personajeOponente.nombre,
      id_partida,
      id_jugador,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send({
      ok: false,
      mensaje: "Error del servidor",
      error: err.message,
    });
  }
});

//salir de partida
app.put("/salir", async function (req, res) {
  const { id_partida } = req.body;
  try {
    const query = `UPDATE Partidas SET estado = 'finalizada' WHERE ID = ${id_partida};`;
    await realizarQuery(query);

    res.send({ ok: true, mensaje: "Partida finalizada correctamente" });
  } catch (e) {
    console.log("ERROR:", e.message);
    res.send({
      ok: false,
      mensaje: "Error al finalizar la partida",
      error: e.message,
    });
  }
});
