"use client"

import Boton1 from "@/componentes/Boton"
import Input from "@/componentes/Input"
import Title from "@/componentes/Title"
import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./page.module.css"
import { useConnection } from "@/hooks/useConnection"

export default function LoginPage() {
  const {url} = useConnection()

  const [nombre, setNombre] = useState("")
  const [contraseña, setContraseña] = useState("")
  const [mail, setMail] = useState("")
  const router = useRouter()

  async function agregarUsuarioRegistro(datos) {
    try {
      const response = await fetch(url + "/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      })
      const result = await response.json()
      console.log(result)

      if (result.res === "ok") {
        router.push("/inicio")
      }
    } catch (error) {
      console.log("Error", error)
    }
  }

  function obtenerDatosRegistro() {
    let datos = { nombre, contraseña, mail }
    agregarUsuarioRegistro(datos)
  }

  /*Login*/
  function obtenerDatos() {
    let datos = { contraseña, nombre }
    login(datos)
  }

  async function login(datos) {
    try {
      const response = await fetch(url + "/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(datos),
      });

      console.log(response);
      const result = await response.json();
      if (result.ok) {
        localStorage.setItem('ID', result.id);
        console.log(result.id);
        if (result.admin === true) {
          router.replace('/administrador')
        } else {
          router.replace('/inicio')
        }

      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error("Error", error);
    }
  }

  function handleEnter(event) {
    if (event.key === "Enter") {
      obtenerDatos()
    }
  }
  
  function handleEnterRegister(event) {
    if (event.key === "Enter") {
      obtenerDatosRegistro()
    }
  }

  return (
    <>
      <div className={styles.section}>
        <div className={styles.container}>
          <Title texto="Inicia Sesión" color={"registro"} /><h3></h3><br />
          <Input color={"registro"} type={"text"} placeholder={"Ingrese su nombre"} id={"nombre"} onChange={(event) => setNombre(event.target.value)} ></Input>
          <br /><br />
          <Input color={"registro"} type={"password"} placeholder={"Ingrese su contraseña"} id={"contraseña"} onChange={(event) => setContraseña(event.target.value)} onKeyDown={handleEnter}></Input>
          <br /><br />
          <Boton1 type={"text"} texto={"Enviar"} color={"wpp"} onClick={obtenerDatos}>Enviar</Boton1>
        </div>
        <br></br>
        <br></br>
        <div className={styles.container}>
          <Title texto="Registro" color={"registro"} /><h3></h3><br />
          <Input color={"registro"} type={"text"} placeholder={"Ingrese su mail"} id={"mail"} onChange={(event) => setMail(event.target.value)}></Input>
          <br /><br />
          <Input color={"registro"} type={"password"} placeholder={"Ingrese su contraseña"} id={"contraseña"} onChange={(event) => setContraseña(event.target.value)}></Input>
          <br /><br />
          <Input color={"registro"} type={"text"} placeholder={"Ingrese su nombre"} id={"nombre"} onChange={(event) => setNombre(event.target.value)} onKeyDown={handleEnterRegister}></Input>
          <br /><br />
          <Boton1 type={"text"} texto={"Enviar"} color={"wpp"} onClick={obtenerDatosRegistro}>Enviar</Boton1>
        </div>
      </div>
    </>
  )
}

