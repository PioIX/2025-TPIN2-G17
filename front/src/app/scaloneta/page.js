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
    const {url} = useConnection()
    const router = useRouter()
    const partida = JSON.parse(localStorage.getItem("partidaActual"));
    const jugadorId = parseInt(localStorage.getItem("ID"));

    const [nombreArriesgado, setNombreArriesgado] = useState("");
    const [mensaje, setMensaje] = useState("");
    const { socket, isConnected } = useSocket();
    const [mensajes, setMensajes] = useState([]);
    const [message, setMessage] = useState("");
    const [bool, setBool] = useState("");
    const [color, setcolor] = useState("mensaje");
    const [personajes, setPersonajes] = useState([]);
    
    async function arriesgar() {
        if (!nombreArriesgado.trim()) {
            alert("Ingresá un nombre antes de arriesgar");
            return;
        }

        try {
            const res = await fetch(url + "/arriesgar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id_partida: partida.ID,
                    id_jugador: jugadorId,
                    nombre_arriesgado: nombreArriesgado
                }),
            });

            const result = await res.json();
            setMensaje(result.msg);

            if (result.ok) {
                router.push("/inicio");
            }
        } catch (error) {
            console.error(error);
            alert("Error al conectar con el servidor");
        }
    }
    async function traerPersonajes() {
        try {
            const response = await fetch(url + "/scaloneta", {
                method: "GET",
                headers: { "Content-Type": "application/json" },
            });
            const data = await response.json();
            console.log("Data recibida del backend:", data);


            if (data.ok && data.personajes) {
                setPersonajes(data.personajes); 
            } else {
                setPersonajes([]);  
            }
        } catch (error) {
            console.error("Error al traer personajes:", error);
            setPersonajes([]);  
        }
    }

    useEffect(() => {
        traerPersonajes();
        console.log("LOS PERSONJES SON: ", personajes)
    }, []);

    console.log("LOS PERSONJES 2 SON: ", personajes)
    useEffect(() => {
        if (!socket) return;

        socket.on("newMessage", (data) => {
            console.log("📩 Nuevo mensaje:", data);
            setMensajes((prev) => [...prev, data]);
        });

        return () => {
            socket.off("newMessage");
        };
    }, [socket]);

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
            <Input type="text" placeholder="Arriesgar" id="arriesgar" color="registro"  onChange={(e) => setNombreArriesgado(e.target.value)}></Input>
            <Boton onClick={arriesgar} color="arriesgar">texto={Arriesgar}</Boton>
            <div className={styles.footer}>
                <footer>
                    <h2>Arrufat - Gaetani - Suarez - Zuran</h2>
                </footer>

            </div>
        </>
    )
}
