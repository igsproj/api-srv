/* net createServer

options <Object>

    allowHalfOpen <boolean> If set to false, then the socket will automatically end the writable side when the readable side ends. Default: false.
    highWaterMark <number> Optionally overrides all net.Sockets' readableHighWaterMark and writableHighWaterMark. Default: See stream.getDefaultHighWaterMark().
    pauseOnConnect <boolean> Indicates whether the socket should be paused on incoming connections. Default: false.
    noDelay <boolean> If set to true, it disables the use of Nagle's algorithm immediately after a new incoming connection is received. Default: false.
    keepAlive <boolean> If set to true, it enables keep-alive functionality on the socket immediately after a new incoming connection is received, similarly on what is done in socket.setKeepAlive([enable][, initialDelay]). Default: false.
    keepAliveInitialDelay <number> If set to a positive number, it sets the initial delay before the first keepalive probe is sent on an idle socket.Default: 0.

connectionListener <Function> Automatically set as a listener for the 'connection' event.

*/

/* http createServer
options <Object>
    connectionsCheckingInterval: Sets the interval value in milliseconds to check for request and headers timeout in incomplete requests. Default: 30000.
    headersTimeout: Sets the timeout value in milliseconds for receiving the complete HTTP headers from the client. See server.headersTimeout for more information. Default: 60000.
    highWaterMark <number> Optionally overrides all sockets' readableHighWaterMark and writableHighWaterMark. This affects highWaterMark property of both IncomingMessage and ServerResponse. Default: See stream.getDefaultHighWaterMark().
    insecureHTTPParser <boolean> If set to true, it will use a HTTP parser with leniency flags enabled. Using the insecure parser should be avoided. See --insecure-http-parser for more information. Default: false.
    IncomingMessage <http.IncomingMessage> Specifies the IncomingMessage class to be used. Useful for extending the original IncomingMessage. Default: IncomingMessage.
    joinDuplicateHeaders <boolean> If set to true, this option allows joining the field line values of multiple headers in a request with a comma (, ) instead of discarding the duplicates. For more information, refer to message.headers. Default: false.
    keepAlive <boolean> If set to true, it enables keep-alive functionality on the socket immediately after a new incoming connection is received, similarly on what is done in [socket.setKeepAlive([enable][, initialDelay])][socket.setKeepAlive(enable, initialDelay)]. Default: false.
    keepAliveInitialDelay <number> If set to a positive number, it sets the initial delay before the first keepalive probe is sent on an idle socket. Default: 0.
    keepAliveTimeout: The number of milliseconds of inactivity a server needs to wait for additional incoming data, after it has finished writing the last response, before a socket will be destroyed. See server.keepAliveTimeout for more information. Default: 5000.
    maxHeaderSize <number> Optionally overrides the value of --max-http-header-size for requests received by this server, i.e. the maximum length of request headers in bytes. Default: 16384 (16 KiB).
    noDelay <boolean> If set to true, it disables the use of Nagle's algorithm immediately after a new incoming connection is received. Default: true.
    requestTimeout: Sets the timeout value in milliseconds for receiving the entire request from the client. See server.requestTimeout for more information. Default: 300000.
    requireHostHeader <boolean> If set to true, it forces the server to respond with a 400 (Bad Request) status code to any HTTP/1.1 request message that lacks a Host header (as mandated by the specification). Default: true.
    ServerResponse <http.ServerResponse> Specifies the ServerResponse class to be used. Useful for extending the original ServerResponse. Default: ServerResponse.
    uniqueHeaders <Array> A list of response headers that should be sent only once. If the header's value is an array, the items will be joined using ; .

connectionListener <Function> Automatically set as a listener for the 'connection' event.
*/

/* node-fcgi createServer
responder: callback for FastCGI responder requests (normal HTTP requests, listener for the 'request' event).
authorizer: callback for FastCGI authorizer requests (listener for the 'authorize' event)
filter: callback for FastCGI filter requests (listener for the 'filter' event)
config: server configuration

config is an object with the following defaults:

{
  maxConns: 2000,
  maxReqs: 2000,
  multiplex: true,
  valueMap: {}
}
*/

module.exports = class apiServer {

  constructor(srvType, modPathName, listenOptions, routesConfig, serverConfig, headersConfig) {
    this.srvType = srvType;
    this.modPathName = modPathName;
    this.listenOptions = listenOptions;
    this.routesConfig = routesConfig;
    this.serverConfig = serverConfig;
    this.headersConfig = headersConfig;
    this.createServer();
  }

  createServer() {
    if (this.srvType === "node-fcgi")
      this.server = require(this.modPathName).createServer(this.responder.bind(this), this.authorizer.bind(this), this.filter.bind(this), this.serverConfig);
    else  // "net" "http"
      this.server = require(this.modPathName).createServer(this.serverConfig, this.responder.bind(this));
  }

  set serverConfig(newConfig) {
    this._serverConfig = {...newConfig};
  }

  get serverConfig() {
    return this._serverConfig;
  }

  set routesConfig(newConfig) {
    this._routesConfig = {...newConfig};
  }

  get routesConfig() {
    return this._routesConfig;
  }

  set headersConfig(newConfig) {
    this._headersArr = newConfig.splice(0);
  }

  get headersConfig() {
    return this._headersArr;
  }

  findBestMatchRoute(userQuery, routes) {
    if (!userQuery.length)
      return {"path": ""};

    const slash = "/";
    let i = 0;
    let bestMatch = "";
    let endIndex = 0;

    while(i <  userQuery.length) { // проверка строки запроса по буквам
      let match = 0;
      let routesCnt = 0;

      for (let route in routes) { // проверяем за один проход сразу все routes !
        ++routesCnt;

        if (userQuery[i] === route[i]) {
          endIndex = i; // индекс конца совпадения запроса с route
          ++match;
          continue;
        }

        --match;
      }

      if ((routesCnt + match) === 0) // нет совпадений между текущей буквой userQuery[i] и текущей буквой из всех routes[i], дальше искать нет смысла
        break;

      ++i;
    }

    // bestMatch - cтрока с максимальным совпадением с routes. Она может оканчиваться на "/".
    // Пути в конфигурации задаются без "/" на конце !! Приводим bestMatch к нужному виду без "/" на конце
    let end = 1;
    if (bestMatch.length > 1)
      end = userQuery[endIndex] === slash ? 0 : 1;
    bestMatch = userQuery.substr(0, endIndex + end); // получаем путь без "/" на конце

    if (bestMatch[endIndex + 1] !== slash)  // параметр должен начинаться с "/" - если нет, значит это часть строки, тогда сбрасываем до родительского пути
      bestMatch = userQuery;

    // bestMatch похож на какой то из путей - но не факт, что такой путь есть. Подставляем в routes
    // Начинаем рекурсивный поиск от текущего bestMatch до "/", пробуем найти точное совпадение с routes
    while (bestMatch.length > 1 && !routes[bestMatch]) {
      let slashPos = bestMatch.lastIndexOf(slash);
      slashPos = slashPos === 0 ? 1 : slashPos;
      bestMatch = this.findBestMatchRoute(bestMatch.substr(0, slashPos), routes).path;
    }

    return {"path": bestMatch};
  }

  processRoute(req, res, method) {
    let sendBack = "";
    let param = "";

    if (this.routesConfig[method]) {
      const routes = this.routesConfig[method].routes;

      if (routes) {
        console.log(method+" : ", req.url);
        try {
          const route = this.findBestMatchRoute(req.url, routes);

          console.log("found route : ", route);

          if (route.path && typeof(routes[route.path]) === "function") {

            if (route.path.length < req.url.length) { // получаем параметр
              let end = route.path === "/" ? 1 : 0;
              param = req.url.substr(route.path.length - end);
            }

            console.log(`>>> processing route '${route.path}' with param '${param}'`); //TODO write to access log

            sendBack = routes[route.path](req, res, route.path, param);
            if (Array.isArray(sendBack)) {
              res.writeHead(this.changeUndefined(sendBack[0], 200), this.changeUndefined(sendBack[1], ""));
              res.end(this.changeUndefined(sendBack[2], ""));
            }

            return;
          }
          else
            console.log(`! no active rule to serve route '${route.path}`);
        }
        catch(err) {
          console.log(err); //TODO write to server error log
        }
      }
    }

    const defaultRespCode = method === "OPTIONS" ? 200 : 501;

    res.writeHead(defaultRespCode);
    res.end();
  }

  changeUndefined(val, newVal) {
    return val === undefined ? newVal : val;
  }

  setHeaders(res) {
    this.headersConfig.forEach(elem => res.setHeader(elem[0], elem[1]));
  }

  responder(req, res) {
    this.setHeaders(res);
    const method = req.method.trim().toUpperCase();
    this.processRoute(req, res, method);
  }

  authorizer() { // stub for node-fastcgi

  }

  filter() { // stub for node-fastcgi

  }

  close() {
    this.server.close();
  }

  onServerClose(signal) {
    console.log(`Received ${signal}`);
    this.close();
  }

  run() {
    const process = require('node:process');

    if (!this.server) {
      console.log(`server ${this.srvType} is not ready`);
      process.exit(1);
    }

    this.server.listen(this.listenOptions);
    console.log(this.srvType);
    console.log(this.server.address());

    process.on('SIGINT', (signal) => {this.onServerClose(signal)});
    process.on('SIGTERM', (signal) => {this.onServerClose(signal)});
  }
}
