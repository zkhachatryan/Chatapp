const express = require("express");
const bodyParser = require("body-parser");
const http = require("http");
const path = require("path");
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);
const Filter = require("bad-words");
const {
  generateMessage,
  generateLocationMessage
} = require("./utils/messages");
const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom
} = require("./utils/users");
app.use(express.static(path.join(__dirname, "public")));

io.on("connection", socket => {
  console.log("New WebSocket connection");
  socket.on("join", ({ username, room }, cb) => {
    let { error, user } = addUser({ id: socket.id, username, room });

    if (error) {
      return cb(error);
    }

    socket.join(user.room);

    socket.emit("message", generateMessage("Admin", "Welcome!"));
    socket.broadcast
      .to(user.room)
      .emit(
        "message",
        generateMessage("Admin", `${user.username} has joined!`)
      );
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room)
    });

    cb();
  });

  socket.on("sendMessage", (data, cb) => {
    const filter = new Filter();
    let user = getUser(socket.id);
    if (filter.isProfane(data)) {
      return cb("Profanity is not allowed!");
    }
    io.to(user.room).emit("message", generateMessage(user.username, data));
    cb();
  });
  socket.on("sendLocation", ({ latitude, longitude }, cb) => {
    let user = getUser(socket.id);

    io.to(user.room).emit(
      "locationMessage",
      generateLocationMessage(
        user.username,
        `https://google.com/maps?q=${latitude},${longitude}`
      )
    );
    cb();
  });
  socket.on("disconnect", () => {
    let user = removeUser(socket.id);
    if (user) {
      io.to(user.room).emit(
        "message",
        generateMessage("Admin", `${user.username} has left!`)
      );
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room)
      });
    }
  });
});

server.listen(3000, () => {
  console.log(`Server running on port 3000.`);
});
