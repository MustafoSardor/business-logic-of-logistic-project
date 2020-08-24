const mongoose = require('mongoose');
const dotenv = require('dotenv');
const requestController = require('./controllers/requestController');

process.on('uncaughtException', (err) => {
  console.log('UNGAUGHT EXCEPTION! SHUTTING DOWN!...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');
const { request } = require('express');

const http = require('http').Server(app);
const io = require('socket.io')(http);

const emitRequests = async () => {
  io.emit('requests', await requestController.getRequestsIO(io));
};

io.on('connection', (socket) => {
  console.log('Connected to Socket ' + socket.id);

  socket.on('addRequest', (Request) => {
    console.log('socketData: ' + JSON.stringify(Request));
    requestController.create(io, Request);
    emitRequests();
  });

  socket.on('updateRequest', (Request) => {
    console.log('Connected to Update Socket ' + socket.id);
    requestController.update(io, Request);
    emitRequests();
  });

  socket.on('deleteRequest', (Request) => {
    console.log('Connected to Delete Socket ' + socket.id);
    requestController.delete(io, Request);
    emitRequests();
  });
});

const DB = process.env.DATABASE.replace(
  '<password>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB connection successfull'));

const port = process.env.PORT || 3000;

const server = http.listen(port, () => {
  console.log(`App is running  on ${port}...`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! SHUTTING DOWN');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
