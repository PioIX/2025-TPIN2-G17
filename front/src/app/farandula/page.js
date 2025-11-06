"use client"


import Boton from "@/componentes/Boton"
import Input from "@/componentes/Input"
import Title from "@/componentes/Title"
import BotonImagen from "@/componentes/BotonImagen";
import { useSocket } from "@/hooks/useSocket";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation"
import styles from "./page.module.css"
import Mensajes from "@/componentes/Mensajes";
import { useConnection } from "@/hooks/useConnection";

export default function Tablero() {
    const { url } = useConnection()
    const router = useRouter()
    const { socket, isConnected } = useSocket();
    const [mensajes, setMensajes] = useState([]);
    const [message, setMessage] = useState("");
    const [bool, setBool] = useState("");
    const [color, setcolor] = useState("mensaje");
    const [nombreArriesgado, setNombreArriesgado] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [loading, setLoading] = useState(false);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null);
    const [carta, setCarta] = useState(null);
    const [personajes, setPersonajes] = useState([]);
    const [descartadas, setDescartadas] = useState([]);
    const [cartaAsignada, setCartaAsignada] = useState([]);
    const [cartaAsignada2, setCartaAsignada2] = useState([]);
    const [contador, setContador] = useState(0)
    const [turno, setTurno] = useState("jugador1");  // Define cuál jugador tiene el turno
    const [idPropio, setIdPropio] = useState();
    const [idRival, setIdRival] = useState();
    const [flagYaEnvie, setFlagYaEnvie] = useState(0);
    const [jugador, setJugador] = useState(""); //Esto es para saber que jugador soy, asi cuando es mi turno juego yo

    const [segundos, setSegundos] = useState(60);

    //timer
    useEffect(() => {
        if (!socket) return;

        // Escuchar evento para actualizar el temporizador
        socket.on('actualizarTemporizador', (data) => {
            setSegundos(data.timer);  // Actualiza el temporizador en pantalla
        });

        // Limpiar el evento cuando el componente se desmonte
        return () => socket.off('actualizarTemporizador');
    }, [socket]);

    // Función que se llama cuando el jugador presiona el botón para reiniciar el temporizador
    const reiniciarTemporizador = () => {
        const room = localStorage.getItem("room");  // Asumiendo que usas rooms
        socket.emit('reiniciarTemporizador', { room });  // Enviar evento al backend
    };

    async function traerPersonajes() {
        try {
            const response = await fetch(url + "/farandula", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            console.log("Data recibida del backend:", data);
            if (data.ok && data.personajes) {
                localStorage.setItem("personajesFarandula", JSON.stringify(data.personajes));
                setPersonajes(data.personajes);
            } else {
                setPersonajes([]);
            }
        } catch (error) {
            console.log("Error al traer personajes:", error);
            setPersonajes([]);
        }
    }

    function handleClick(id) {
        setDescartadas((prev) => {
            const updated = prev.includes(id) ? prev : [...prev, id];
            console.log("IDs descartados:", updated);
            return updated;
        });
    }

    useEffect(() => {
        traerPersonajes();
        traerCarta();
    }, []);

/*
    useEffect(() => {
        let id = localStorage.getItem('ID');
        setIdPropio(id)
        console.log("Soy: ", id)
        if (!socket) return;
        const room = localStorage.getItem("room");
        socket.emit("idJugadores", { room, id, idRival });
    }, [socket, isConnected])*/


    useEffect(() => {
        if (!socket) return;


        socket.on("newMessage", (data) => {
            console.log("📩 Nuevo mensaje:", data);
            setMensajes((prev) => [...prev, data]);
        });
        /*
        socket.on("pedirId", (data) => {
            socket.emit("idJugadores", { room, idPropio, idRival });
        })

        
                socket.on("idRival", (data) => {
                    console.log("Data: ", data, " IdPropio: ", idPropio)
                    if (data.id != idPropio) {
                        console.log("📩 Id rival:", data);
                        setIdRival(data.id)
                    }
                });*/
    }, [socket]);


    useEffect(() => {
        setIdPropio(localStorage.getItem('ID'));
        setIdRival(localStorage.getItem('oponente_id'));
        console.log("Rival: ", idRival, " Propio: ", idPropio)

        if (idPropio && idRival) {
            console.log("Los ids existen: ", idPropio, " y ", idRival)
            if (idPropio > idRival) {
                setJugador("jugador2")
            }
            else {
                setJugador("jugador1")
            }
            /*
            if (flagYaEnvie == 0) {
                setFlagYaEnvie(1)
                const room = localStorage.getItem("room");
                let id = localStorage.getItem('ID');
                console.log("Enviando id del primero q entro")
                socket.emit("idJugadores", { room, id, idRival });
            }*/
        }
    }, [idPropio, idRival])



    useEffect(() => {
        const pedirId = () => {
            if (jugador == "") {
                if (!socket) return
                console.log("necesito ID")
                socket.emit("necesitoId", { room })
            }
            else {
                clearTimeout(myTimeout);
            }
        }
        const myTimeout = setTimeout(pedirId, 5000);

    }, [])


    useEffect(() => {
        if (!socket) return;

        socket.on("cambiarTurno", ({ room, nuevoTurno }) => {
            console.log("🔄 El turno ha cambiado:", nuevoTurno);
            setTurno(nuevoTurno); // Cambia el turno del jugador local
        });

        return () => socket.off("cambiarTurno"); // Limpia el mismo evento
    }, [socket]);


    const cambiarTurno = () => {
        const room = localStorage.getItem("room");
        const nuevoTurno = turno === "jugador1" ? "jugador2" : "jugador1";
        socket.emit("turnoCambio", { room, nuevoTurno });  // Emite el cambio de turno al servidor
        setTurno(nuevoTurno); // Actualiza el estado local
    };

    function sendMessage() {
        const room = localStorage.getItem("room");
        const nuevo = { message, color: "mensaje" };
        // const data = { message, color}
        socket.emit("sendMessage", { room, message });
        console.log("Mensaje enviado:", nuevo);
    }

    function responder() { //hay un problema
        return (
            <>
                <Boton
                    color={"si"}
                    value={"si"}
                    texto={"Sí"}
                    onClick={(e) => {
                        checkeado(e);
                        cambiarTurno(); // Cambiar el turno a jugador1 después de responder
                    }}
                />
                <Boton
                    color={"no"}
                    value={"no"}
                    texto={"No"}
                    onClick={(e) => {
                        checkeado(e);
                        cambiarTurno(); // Cambiar el turno a jugador1 después de responder
                    }}
                />
            </>
        );
    }

    useEffect(() => {
        if (!socket) return;
        let room = localStorage.getItem("room")
        if (room) {
            socket.emit("joinRoom", { room: room });
        }
    }, [socket])

    async function arriesgar() {
        if (nombreArriesgado.trim() === "") {
            alert("Ingresá un nombre antes de arriesgar");
            return;
        }

        const jugadorId = localStorage.getItem("ID");

        setLoading(true);

        const partida_id = localStorage.getItem("partida_id");
        console.log("esta es la partida en curso: ", partida_id)

        console.log("🔍 partida_id desde localStorage:", partida_id);
        console.log("🔍 miJugadorId:", jugadorId);
        console.log("🔍 nombreArriesgado:", nombreArriesgado);
        console.log("🔍 Todo el localStorage:", localStorage);


        try {
            const res = await fetch(url + "/arriesgar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_partida: partida_id,
                    id_jugador: jugadorId,
                    nombre_arriesgado: nombreArriesgado
                }),
            });

            result = await res.json();
            //aca
            /*
            localStorage.setItem("partida_id", JSON.stringify(result.id_partida))
            //const partidaa = JSON.parse(localStorage.getItem("partida"));
            console.log("Partida almacenada en localStorage:", localStorage.getItem("partida_id"));
            */
            const result = await res.json();

            // Actualizar el mensaje en el estado
            setMensaje(result.mensaje);

            if (result.ok) {
                if (result.gano) {
                    alert(`¡Ganaste! El personaje correcto era ${result.personajeCorrecto}.`);
                } else {
                    alert(`Perdiste. El personaje correcto era ${result.personajeCorrecto}.`);
                }


                // Si el jugador ganó o perdió, redirigir a la página de inicio
                router.push("/inicio");
            } else {
                alert("Hubo un problema al realizar el arriesgue.");
            }

        } catch (error) {
            console.error(error);
            alert("Error al conectar con el servidor");
        }


        setLoading(false);
    }

    useEffect(() => {
        console.log("🔍 Verificando localStorage al cargar página:");
        console.log("partida_id:", localStorage.getItem("partida_id"));
        console.log("ID:", localStorage.getItem("ID"));
        console.log("room:", localStorage.getItem("room"));

        const partidaId = localStorage.getItem("partida_id");
        if (!partidaId) {
            console.error("No hay partida_id en localStorage!");
        }
    }, []);

    useEffect(() => {
        if (!socket) return;
        socket.on("partidaFinalizada", (data) => {
            console.log("📥 Partida finalizada:", data);

            /*
            const miId = Number(localStorage.getItem("ID"));
 
            if (data.ganador_id === miId) {
                alert(`¡Ganaste! El personaje correcto era ${data.personajeCorrecto}.`);
            } else if (data.perdedor_id === miId) {
                alert(`Perdiste. El personaje correcto era ${data.personajeCorrecto}.`);
            }
            */

            localStorage.removeItem("partida_id");
            localStorage.removeItem("room");
            router.push("/inicio");
        });

        return () => {
            socket.off("partidaFinalizada");
        };
    }, [socket, router]);

    function checkeado(event) {
        const value = event.target.value;
        setBool(value);
        const nuevoColor = value == "si" ? "si" : "no";
        setcolor(nuevoColor);
        setMensajes((prevMensajes) => {
            if (prevMensajes.length == 0) return prevMensajes;
            const nuevos = [...prevMensajes];
            const ultimo = { ...nuevos[nuevos.length - 1] };
            ultimo.color = nuevoColor;
            nuevos[nuevos.length - 1] = ultimo;
            return nuevos;
        });
        const room = localStorage.getItem("room");
        socket.emit("colorChange", { room, color: nuevoColor });

        reiniciarTemporizador();

    }

    useEffect(() => {
        if (!socket) return;
        socket.on("updateColor", ({ color }) => {
            console.log("Nuevo color recibido del otro jugador:", color);
            setMensajes((prevMensajes) => {
                if (prevMensajes.length === 0) return prevMensajes;
                const nuevos = [...prevMensajes];
                const ultimo = { ...nuevos[nuevos.length - 1] };
                ultimo.color = color;
                nuevos[nuevos.length - 1] = ultimo;
                return nuevos;
            });
        });
        return () => socket.off("updateColor");
    }, [socket]);

    // carta random
    async function traerCarta() {
        try {
            const partida_id = localStorage.getItem("partida_id");
            const jugador_id = localStorage.getItem("ID");

            if (!partida_id || !jugador_id) {
                console.error("Faltan partida_id o jugador_id");
                return;
            }

            const response = await fetch(url + `/random?partida_id=${partida_id}&jugador_id=${jugador_id}`, {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });

            const data = await response.json();
            console.log("Data recibida del backend:", data);


            if (data.ok) {
                const carta = Array.isArray(data.carta) ? data.carta[0] : data.carta;

                setCartaAsignada(carta);
                localStorage.setItem("carta", JSON.stringify(carta));

                console.log("Mi carta asignada:", carta);
            } else {
                setCartaAsignada(null);
                console.error("Error:", data.mensaje);
            }
        } catch (error) {
            console.error("Error al traer cartas:", error);
            setCartaAsignada(null);
        }
    }

    //salir
    /*
    async function salida() {
        const partida_id = localStorage.getItem("partida_id");
        try {
            let response = await fetch(url + "/salir", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id_partida: partida_id,
                }),
            });
 
            let result = await response.json();
            if (result.ok) {
                alert("saliste de la partida");
                router.push("/inicio");
            } else {
                alert("Error: " + result.mensaje);
            }
        } catch (error) {
            console.error("No salió de la partida", error);
        }
    }*/

    async function salida() {
        const partida_id = localStorage.getItem("partida_id");
        const room = localStorage.getItem("room");

        try {
            let response = await fetch(url + "/salir", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id_partida: partida_id,
                }),
            });

            let result = await response.json();
            if (result.ok) {
                socket.emit('salirDePartida', room);
                alert("Saliste de la partida");
                router.push("/inicio");
            } else {
                alert("Error: " + result.mensaje);
            }
        } catch (error) {
            console.error("No salió de la partida", error);
        }
    }

    useEffect(() => {
        if (!socket) return;
        socket.on("jugadorSalio", (data) => {
            alert(data.mensaje);
            router.push("/inicio");
        });

        // Limpiar el evento cuando el componente se desmonte
        return () => socket.off("jugadorSalio");
    }, [socket]);

    return (
        <>
            <div className={styles.header}>
                <header>
                    <Title texto={"¿Quién es quién?"} />
                </header>
            </div>

            <div className={styles.tcontainer}>
                <div className={styles.temporizador}>{segundos}</div>
                <button onClick={reiniciarTemporizador}>Reiniciar Temporizador</button>
            </div>

            <div className={styles.salir}>
                <Boton onClick={salida} texto={"Salir"} color={"eliminar"}></Boton>
            </div>

            <div className={styles.chatBox}>
                {mensajes.map((m, i) => (
                    <Mensajes
                        key={i}
                        texto={m.message?.message || m.message}
                        color={m.color || "mensaje"}
                    />
                ))}
            </div>

            <div className={styles.juego}>
                {personajes.map((p) => (
                    <BotonImagen
                        key={p.id}
                        imagen={`/${p.foto}`}
                        texto={p.nombre}
                        onClick={() => handleClick(p.id)}
                        className={descartadas.includes(p.id) ? styles.descartada : ""}
                    />
                ))}
            </div>

            <div className={styles.botonesRespuestas}>
                {(turno === "jugador1" && jugador === "jugador1") || (turno === "jugador2" && jugador === "jugador2") ? (
                    <>
                        {/* Si es el turno del jugador, mostrar el input para hacer una pregunta */}
                        <Input
                            placeholder={"Hace una pregunta"}
                            color={"registro"}
                            onChange={(e) => setMessage(e.target.value)}
                        />
                        <Boton
                            color={"wpp"}
                            texto={"Preguntar"}
                            onClick={() => {
                                sendMessage(); // Enviar el mensaje
                                // No cambiar el turno aún, esperar la respuesta del oponente
                            }}
                        />
                    </>
                ) : (turno === "jugador2" && jugador === "jugador1") || (turno === "jugador1" && jugador === "jugador2") ? (
                    <>
                        {/* Si es el turno del oponente, mostrar los botones de respuesta */}
                        {responder()}
                    </>
                ) : null}
            </div>

            <Input type="text" placeholder="Nombre del personaje" id="arriesgar" color="registro" onChange={(e) => setNombreArriesgado(e.target.value)}></Input>
            <Boton color={"wpp"} texto={"Arriesgar"} onKeyDown={arriesgar}></Boton>

            <div className={styles.carta}>
                {cartaAsignada && (
                    <BotonImagen
                        key={cartaAsignada.id}
                        imagen={`/${cartaAsignada.foto}`}
                        texto={cartaAsignada.nombre}
                        onClick={() => handleClick(cartaAsignada.id)}
                        className={descartadas.includes(cartaAsignada.id) ? styles.descartada : ""}
                    />
                )}
            </div>


            <div className={styles.footer}>
                <footer>
                    <h2>Arrufat - Gaetani - Suarez - Zuran</h2>
                </footer>
            </div>
        </>
    );


}

