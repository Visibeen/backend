const { Server } = require('socket.io');
let ioInstance = null;

const initSocket = (server) => {
    if (ioInstance) {
        console.log('Socket.io already initialized.');
        return;
    }

    // SECURITY: Restrict WebSocket connections to allowed origins only
    const allowedOrigins = [
        'https://visibeen.com',
        'https://www.visibeen.com',
        'https://api.visibeen.com',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:8089'
    ];

    const corsOptions = {
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);
            
            if (allowedOrigins.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                console.warn('⚠️ WebSocket connection rejected from origin:', origin);
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type"],
        credentials: true
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
