const { Server } = require('socket.io');
let ioInstance = null;

const initSocket = (server) => {
    if (ioInstance) {
        console.log('Socket.io already initialized.');
        return;
    }

    const corsOptions = {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
    };

    ioInstance = new Server(server, {
        cors: corsOptions,
    });

    ioInstance.on("connection", (socket) => {
        console.log("A user connected: " + socket.id);
        socket.on('send_notification', (data) => {
            console.log(data, "********");
        });
        socket.on("disconnect", () => {
            console.log("User disconnected: " + socket.id);
        });
    });
    
};
const getIoInstance = () => {
    if (!ioInstance) {
        throw new Error('Socket.io not initialized. Call initSocket first.');
    }
    return ioInstance;
};
module.exports = {
    initSocket,
    getIoInstance
};
