"use client"

import Boton1 from "@/componentes/Boton"
import Input from "@/componentes/Input"
import Title from "@/componentes/Title"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"
import { useConnection } from "@/hooks/useConnection"

export default function Administrador() {
    const {url} = useConnection()
    const [nombre, setNombre] = useState("")
    const [contraseña, setContraseña] = useState("")
    const [mail, setMail] = useState("")
    const [esAdmin, setEsAdmin] = useState(false)
    const [id, setId] = useState("")

    function subirUsuario() {
        let datos = { nombre, contraseña, mail, es_admin: esAdmin }
        agregarUsuario(datos)

    }

    async function agregarUsuario(datos) {
        try {
            const response = await fetch(url + "/agregarUsuario", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(datos),
            });

            const result = await response.json();
            console.log(result);

            if (result.agregado) {
                alert("Usuario agregado correctamente");
            } else {
                alert((result.mensaje || "No se pudo agregar el usuario"));
            }

        } catch (error) {
            console.log("Error:", error);
            alert("Error al conectar con el servidor");
        }
    }

    function eliminarUsuariosAdmin() {
        let datos = { ID: id };
        borrarUsuario(datos);
    }

    async function borrarUsuario(datos) {
        try {
            let response = await fetch(url + "/borrarUsuario", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(datos),
            });

            let result = await response.json();
            console.log(result);
            alert("Usuario borrado correctamente");

        } catch (error) {
            console.log("Error", error);
            alert("Ocurrió un error al intentar borrar el usuario");
        }
    }

    return (
        <>
            <Title>Pagina del Administrador</Title>

            <div className={styles.section}>
                <div className={styles.container}>
                    <Title texto="Agregar usuario" color={"registro"} /><h3></h3><br />
                    <Input color={"registro"} type={"text"} placeholder={"Ingrese el nombre del nuevo usuario"} id={"nombre"} onChange={(event) => setNombre(event.target.value)}></Input>
                    <br /><br />
                    <Input color={"registro"} type={"password"} placeholder={"Ingrese la contraseña"} id={"contraseña"} onChange={(event) => setContraseña(event.target.value)}></Input>
                    <br /><br />
                    <Input color={"registro"} type={"text"} placeholder={"Ingrese el mail"} id={"mail"} onChange={(event) => setMail(event.target.value)}></Input>
                    <br /><br />
                    <Input color={"registro"} type={"text"} placeholder={"Ingrese 1 para admin y 0 para usuario jugador"} id={"esAdmin"} onChange={(event) => setEsAdmin(event.target.value)}></Input>
                    <br /><br />
                    <Boton1 type={"text"} texto={"Agregar Usuario"} color={"wpp"} onClick={subirUsuario}>Agregar Usuario</Boton1>
                </div>
                <br></br>
                <br></br>
                <div className={styles.container}>
                    <Title texto="Eliminar usuario" color={"registro"} /><h3></h3><br />
                    <Input color={"registro"} type={"text"} placeholder={"Ingrese el ID del usuario que desea eliminar"} id={"ID"} onChange={(event) => setId(event.target.value)}></Input>
                    <br /><br />
                    <Boton1 type={"text"} texto={"Eliminar Usuario"} color={"wpp"} onClick={eliminarUsuariosAdmin}>Eliminar Usuario</Boton1>
                </div>
            </div>
        </>
    )
}