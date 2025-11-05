"use client";
import clsx from "clsx";
import styles from "@/componentes/Boton1.module.css"
export default function Boton(props) {
    return (
        <button onClick={props.onClick} type={props.type} value={props.value} className={
            clsx(
                {
                    [styles.wpp]: props.color == "wpp", 
                    [styles.eliminar]: props.color == "eliminar", 
                    [styles.famosos]: props.color == "famosos", 
                    [styles.scaloneta]: props.color == "scaloneta", 
                    [styles.profesores]: props.color == "profesores", 
                    [styles.farandula]: props.color == "farandula", 
                    [styles.cantantes]: props.color == "cantantes", 
                    [styles.si]: props.color == "si",
                    [styles.no]: props.color == "no",
                    [styles.arriesgar]: props.color == "arriesgar", 
                }
            )
        }>{props.texto}</button>
    );
}