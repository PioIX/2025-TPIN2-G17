const useConnection = () => {
    const ip = "http://10.1.5.162"
    const port = 4000
    const url = ip + ":" + port
    return { url }
}

export {useConnection}