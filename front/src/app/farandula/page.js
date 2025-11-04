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

export default function Tablero() {
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

    async function traerPersonajes() {
        try {
            const response = await fetch("http://localhost:4000/farandula", {
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
            console.error("Error al traer personajes:", error);
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

    useEffect(() => {
        if (!socket) return;

        socket.on("newMessage", (data) => {
            console.log("📩 Nuevo mensaje:", data);
            setMensajes((prev) => [...prev, data]);
        });

        /*
        socket.on("rendirse", data => {
            let contadorTemp = contador+1
            setContador(contadorTemp)
        })
            */
    }, [socket]);


    /*  useEffect(() => {
          const unloadCallback = (event) => {
              console.log("Unload Event")
              event.preventDefault();
              event.returnValue = "";
              return "";
          };
          
          window.addEventListener("beforeunload", unloadCallback);
          return () => {
              window.addEventListener("popstate", confirm("Seguro"));
              window.removeEventListener("beforeunload", unloadCallback);
          }
      }, []);*/

    useEffect(() => {
        if (!socket) return

        if (contador == 2) {
            alert("Se rindioooo" + data.mensaje)
            socket.emit("finalizarPartida", {
                id_partida: localStorage.getItem("partida_id"),
                id_jugador: localStorage.getItem("ID")
            })
            setContador(0)
        }
    }, [contador])

    function sendMessage() {
        const room = localStorage.getItem("room");
        const nuevo = { message, color: "mensaje" };
        // const data = { message, color}
        socket.emit("sendMessage", { room, message });
        console.log("Mensaje enviado:", nuevo);
    }

    useEffect(() => {
        if (!socket) return;
        let room = localStorage.getItem("room")
        if (room) {
            socket.emit("joinRoom", { room: room });
        }
    }, [socket])

    /*
    useEffect(() => {
        if (!socket) {
            console.log("El socket no está inicializado todavía");
            return;
        }

        const handleRouteChange = () => {
            socket.emit("user_navigated_back", {
                partida_id: localStorage.getItem("partida_id"),
                jugador_id: localStorage.getItem("ID")
            });
        };

        window.addEventListener("popstate", handleRouteChange);

        return () => {
            window.removeEventListener("popstate", handleRouteChange);
            socket.off("partida_finalizada");
        };
    }, []);

    useEffect(() => {
        if (!socket) return; // 🛑 No hacer nada si el socket aún no existe

        // 🧠 Escucha si el oponente abandonó la partida
        socket.on("partida_finalizada", (data) => {
            alert(data.mensaje);
            localStorage.removeItem("partida_id");
            localStorage.removeItem("room");
            router.push("/inicio");
        });

        // 🧹 Limpiar el listener cuando el componente se desmonte
        return () => {
            socket.off("partida_finalizada");
        };
    }, [socket, router]); // <- importante incluir dependencias
    */

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
            const res = await fetch("http://localhost:4000/arriesgar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_partida: partida_id,
                    id_jugador: jugadorId,
                    nombre_arriesgado: nombreArriesgado
                }),
            });

            const result = await res.json();
            setMensaje(result.mensaje);

            if (result.ok) {
                if (result.gano) {
                    alert(`¡Ganaste! El personaje correcto era ${result.personajeCorrecto}.`);
                } else {
                    alert(`Perdiste. El personaje correcto era ${result.personajeCorrecto}.`);
                }
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

            const miId = Number(localStorage.getItem("ID"));

            if (data.ganador_id === miId) {
                alert(`¡Ganaste! El personaje correcto era ${data.personajeCorrecto}.`);
            } else if (data.perdedor_id === miId) {
                alert(`Perdiste. El personaje correcto era ${data.personajeCorrecto}.`);
            }

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
    /*

    useEffect(() => {
        // Asegúrate de que socket esté disponible y la sala exista
        const room = localStorage.getItem("room");
        const personajes = JSON.parse(localStorage.getItem("personajesFarandula"));
        if (room && socket) {
            console.log("Personajes:", personajes);  // Verifica que sea un array
            socket.emit("comenzarRonda", room, personajes);  // Emitir el evento al backend
        }
    }, [socket]);  // Solo se ejecuta cuando el socket está disponible


    useEffect(() => {
        if (!socket) return;

        socket.on("cartaAsignada", (carta) => {
            console.log("Tu carta asignada es:", carta);  // Verifica que la carta se reciba correctamente
            setCartaAsignada(carta);  // Asigna la carta al jugador
        });

        return () => {
            socket.off("cartaAsignada");  // Limpiar el evento cuando el componente se desmonte
        };
    }, [socket]);
    */


    async function traerCarta() {
        try {
            const partida_id = localStorage.getItem("partida_id");
            const jugador_id = localStorage.getItem("ID");

            if (!partida_id || !jugador_id) {
                console.error("Faltan partida_id o jugador_id");
                return;
            }

            const response = await fetch(`http://localhost:4000/random?partida_id=${partida_id}&jugador_id=${jugador_id}`, {
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


    return (
        <>
            <div className={styles.header}>
                <header>
                    <Title texto={"¿Quién es quién?"} />
                </header>

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
                <Input placeholder={"Hace una pregunta"} color={"registro"} onChange={(e) => setMessage(e.target.value)}></Input>
                <Boton color={"wpp"} texto={"Preguntar"} onClick={sendMessage}></Boton>
            </div>
            <div className={styles.botonesRespuestas}>
                <Boton color={"si"} value={"si"} texto={"Sí"} onClick={checkeado} />
                <Boton color={"no"} value={"no"} texto={"No"} onClick={checkeado} />
            </div>

            <Input type="text" placeholder="Nombre del personaje" id="arriesgar" color="registro" onChange={(e) => setNombreArriesgado(e.target.value)}></Input>
            <Boton color={"wpp"} texto={"Arriesgar"} onClick={arriesgar}></Boton>

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
    )
}